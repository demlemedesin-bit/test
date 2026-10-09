import crypto from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import { notifyOrder, serviceClient } from './notify';
import { siteUrl } from './siteUrl';

/**
 * Paynkolay (Nkolay) Ortak Ödeme Sayfası istemcisi — paketsiz.
 * Kart bilgisi hiçbir zaman bu sunucuya gelmez; müşteri Paynkolay'ın barındırdığı sayfada öder.
 * Anahtarlar yalnızca sunucu ortam değişkenlerinden okunur.
 */

const TEST_BASE = 'https://paynkolaytest.nkolayislem.com.tr/Vpos';
export const PROVIDER = 'paynkolay';

export type PaynCfg = {
  sx: string; // satış
  sxList: string; // listeleme / sorgulama (boşsa mutabakat ve iade çalışmaz)
  sxCancel: string; // iptal-iade (boşsa iade çalışmaz)
  secret: string;
  base: string;
};

export function paynCfg(): PaynCfg | null {
  const sx = (process.env.PAYNKOLAY_SX || '').trim();
  const secret = (process.env.PAYNKOLAY_SECRET || '').trim();
  if (!sx || !secret) return null;
  return {
    sx,
    sxList: (process.env.PAYNKOLAY_SX_LIST || '').trim(),
    sxCancel: (process.env.PAYNKOLAY_SX_IPTAL || '').trim(),
    secret,
    base: (process.env.PAYNKOLAY_BASE_URL || TEST_BASE).trim().replace(/\/+$/, ''),
  };
}

export const isTestEnv = (c: PaynCfg) => c.base.includes('paynkolaytest');

/** SHA-512 → Base64 (tüm Paynkolay istek/yanıt imzaları bu biçimdedir). */
export const sha512b64 = (s: string) => crypto.createHash('sha512').update(s, 'utf8').digest('base64');

const money = (n: number) => (Math.round(n * 100) / 100).toFixed(2);

export function requestHash(c: PaynCfg, p: { clientRefCode: string; amount: string; successUrl: string; failUrl: string; rnd: string; customerKey?: string }): string {
  return sha512b64([c.sx, p.clientRefCode, p.amount, p.successUrl, p.failUrl, p.rnd, p.customerKey ?? '', c.secret].join('|'));
}

export function responseHash(c: PaynCfg, f: Record<string, string>): string {
  const g = (k: string) => f[k] ?? '';
  return sha512b64(
    [g('MERCHANT_NO'), g('REFERENCE_CODE'), g('AUTH_CODE'), g('RESPONSE_CODE'), g('USE_3D'), g('RND'), g('INSTALLMENT'), g('AUTHORIZATION_AMOUNT'), g('CURRENCY_CODE'), c.secret].join('|'),
  );
}

export function cancelRefundHash(c: PaynCfg, p: { referenceCode: string; type: string; amount: string; trxDate: string }): string {
  return sha512b64([c.sxCancel, p.referenceCode, p.type, p.amount, p.trxDate, c.secret].join('|'));
}

export function listHash(c: PaynCfg, p: { startDate: string; endDate: string; clientRefCode: string }): string {
  return sha512b64([c.sxList, p.startDate, p.endDate, p.clientRefCode, c.secret].join('|'));
}

function safeEq(a: string, b: string) {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}

/** Paynkolay'ın bize post ettiği sonuç geçerli (imzalı) ve başarılı mı? */
export function resultVerdict(c: PaynCfg, f: Record<string, string>): { signed: boolean; success: boolean } {
  const given = f.hashDataV2 || f.hashDatav2 || '';
  const signed = !!given && safeEq(responseHash(c, f), given);
  const auth = (f.AUTH_CODE ?? '').trim();
  const success = signed && f.RESPONSE_CODE === '2' && !['', '0', '00'].includes(auth);
  return { signed, success };
}

type OrderRow = { order_no: string; total: number; status: string; payment_method: string };

const istanbul = (d: Date) => {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Istanbul', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).formatToParts(d).map((x) => [x.type, x.value]));
  return { y: p.year, m: p.month, d: p.day, h: p.hour === '24' ? '00' : p.hour, i: p.minute, s: p.second };
};

/** Müşteriyi Paynkolay ortak ödeme sayfasına götürecek form alanları. Tutar yalnızca sipariş satırından gelir. */
export function checkoutForm(c: PaynCfg, o: OrderRow, ip: string): { url: string; fields: Record<string, string>; clientRefCode: string } {
  const amount = money(Number(o.total));
  const clientRefCode = `${o.order_no}-${crypto.randomBytes(4).toString('hex')}`.replace(/[^A-Za-z0-9-]/g, '');
  const t = istanbul(new Date());
  const rnd = `${t.d}-${t.m}-${t.y} ${t.h}:${t.i}:${t.s}`;
  const successUrl = `${siteUrl()}/api/odeme/paynkolay/sonuc`;
  const failUrl = successUrl;
  const hashDataV2 = requestHash(c, { clientRefCode, amount, successUrl, failUrl, rnd });
  return {
    url: c.base,
    clientRefCode,
    fields: {
      sx: c.sx,
      clientRefCode,
      amount,
      successUrl,
      failUrl,
      rnd,
      use3D: 'true',
      transactionType: 'SALES',
      instalments: '1',
      currencyCode: '949',
      cardHolderIP: ip,
      hashDataV2,
    },
  };
}

export type Settle = { state: 'ok' | 'bekliyor' | 'hata' | 'tutar' | 'bilinmiyor'; orderNo?: string };

type PayRow = { id: string; order_no: string; status: string; token: string | null; payment_id: string | null; created_at: string };

/** Ödeme alındı: siparişi 'hazirlaniyor' yapar (tutar uyuşmazsa 'review'). Birden fazla çağrılabilir. */
async function applyPaid(sb: SupabaseClient, pay: PayRow, reference: string, paid: number): Promise<Settle> {
  if (pay.status === 'paid') return { state: 'ok', orderNo: pay.order_no };
  const now = new Date().toISOString();
  const { data: ok, error } = await sb.rpc('mark_order_paid', { p_order_no: pay.order_no, p_payment_id: reference, p_paid: paid });
  if (error) {
    await sb.from('payments').update({ status: 'review', payment_id: reference, paid_price: paid, updated_at: now }).eq('id', pay.id);
    console.error('[paynkolay] tutar/sipariş uyuşmazlığı', pay.order_no, error.message);
    return { state: 'tutar', orderNo: pay.order_no };
  }
  await sb.from('payments').update({ status: ok ? 'paid' : 'review', payment_id: reference, paid_price: paid, updated_at: now }).eq('id', pay.id);
  if (!ok) return { state: 'tutar', orderNo: pay.order_no }; // sipariş iptal edilmişti: manuel iade gerekir
  await notifyOrder('order_paid', pay.order_no).catch(() => {});
  return { state: 'ok', orderNo: pay.order_no };
}

async function applyFailed(sb: SupabaseClient, pay: PayRow) {
  if (pay.status !== 'init') return;
  await sb.from('payments').update({ status: 'failed', updated_at: new Date().toISOString() }).eq('id', pay.id);
}

const refOf = (v: string) => v.split('|')[0].trim();

/** Başarı/başarısızlık sayfasına post edilen sonucu işler. */
export async function settleResult(c: PaynCfg, f: Record<string, string>, sb: SupabaseClient | null = serviceClient()): Promise<Settle> {
  if (!sb) return { state: 'bilinmiyor' };
  const token = refOf(f.CLIENT_REFERENCE_CODE || f.clientRefCode || '');
  if (!token) return { state: 'bilinmiyor' };
  const { data: pay } = await sb.from('payments').select('id,order_no,status,token,payment_id,created_at').eq('token', token).eq('provider', PROVIDER).maybeSingle();
  if (!pay) return { state: 'bilinmiyor' };
  if (pay.status === 'paid') return { state: 'ok', orderNo: pay.order_no };

  const v = resultVerdict(c, f);
  if (v.success) {
    const paid = Number(f.AUTHORIZATION_AMOUNT);
    if (Number.isFinite(paid) && paid > 0) return applyPaid(sb, pay as PayRow, f.REFERENCE_CODE, paid);
  }
  // İmza yok / başarısız görünüyor: tarayıcıya güvenme, Paynkolay'a sor.
  const r = await reconcilePayment(c, pay as PayRow, sb);
  if (r.state === 'ok' || r.state === 'tutar') return r;
  if (v.signed && f.RESPONSE_CODE !== '2') {
    await applyFailed(sb, pay as PayRow);
    return { state: 'hata', orderNo: pay.order_no };
  }
  return { state: r.state === 'hata' ? 'hata' : 'bekliyor', orderNo: pay.order_no };
}

/* ---------- Sunucudan Paynkolay'a çağrılar (sorgu, iptal, iade) ---------- */

async function call(url: string, fields: Record<string, string>): Promise<unknown> {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.append(k, v);
  try {
    const res = await fetch(url, { method: 'POST', body: fd, cache: 'no-store', signal: AbortSignal.timeout(15000) });
    const text = await res.text();
    try {
      return JSON.parse(text);
    } catch {
      console.error('[paynkolay] JSON olmayan yanıt', res.status, text.slice(0, 120));
      return null;
    }
  } catch (e) {
    console.error('[paynkolay] istek hatası', e instanceof Error ? e.message : e);
    return null;
  }
}

type Rec = Record<string, unknown>;
const isRec = (x: unknown): x is Rec => !!x && typeof x === 'object' && !Array.isArray(x);
/** Anahtar adlarının büyük/küçük harfine bakmadan değer okur. */
function pick(o: Rec, ...names: string[]): string {
  const lower = new Map(Object.keys(o).map((k) => [k.toLowerCase(), k]));
  for (const n of names) {
    const k = lower.get(n.toLowerCase());
    if (k !== undefined && o[k] != null && o[k] !== '') return String(o[k]);
  }
  return '';
}
/** Yanıtın içindeki işlem kayıtlarını (dizi ya da tek kayıt) bulur. */
function records(x: unknown, depth = 0): Rec[] {
  if (depth > 3) return [];
  if (Array.isArray(x)) return x.filter(isRec);
  if (!isRec(x)) return [];
  if (pick(x, 'REFERENCE_CODE', 'STATUS')) return [x];
  for (const v of Object.values(x)) {
    const r = records(v, depth + 1);
    if (r.length) return r;
  }
  return [];
}

export type Txn = { status: string; type: string; reference: string; amount: number; date: string };

/** 'yyyy-MM-dd…' ya da 'dd.MM.yyyy…' → 'yyyy.MM.dd' */
function dotDate(s: string): string {
  let m = s.match(/(\d{4})[-./](\d{2})[-./](\d{2})/);
  if (m) return `${m[1]}.${m[2]}.${m[3]}`;
  m = s.match(/(\d{2})[-./](\d{2})[-./](\d{4})/);
  return m ? `${m[3]}.${m[2]}.${m[1]}` : '';
}

/** Bir clientRefCode için Paynkolay'daki işlemleri getirir. Ulaşılamazsa null. */
export async function lookup(c: PaynCfg, clientRefCode: string, from: Date): Promise<Txn[] | null> {
  if (!c.sxList) return null;
  const a = istanbul(new Date(from.getTime() - 24 * 3600 * 1000));
  const b = istanbul(new Date(Date.now() + 24 * 3600 * 1000));
  const startDate = `${a.d}.${a.m}.${a.y}`;
  const endDate = `${b.d}.${b.m}.${b.y}`;
  const raw = await call(`${c.base}/Payment/PaymentList`, { sx: c.sxList, startDate, endDate, clientRefCode, hashDatav2: listHash(c, { startDate, endDate, clientRefCode }) });
  if (raw == null) return null;
  return records(raw)
    .filter((r) => refOf(pick(r, 'CLIENT_REFERENCE_CODE', 'CLIENT_REF_CODE', 'clientRefCode')) === clientRefCode)
    .map((r) => ({
      status: pick(r, 'STATUS').toUpperCase(),
      type: pick(r, 'TRANSACTION_TYPE').toLowerCase(),
      reference: pick(r, 'REFERENCE_CODE'),
      amount: Number(pick(r, 'AUTHORIZATION_AMOUNT', 'TRANSACTION_AMOUNT', 'AMOUNT').replace(',', '.')),
      date: dotDate(pick(r, 'TIMESTAMP', 'TRANSACTION_DATE', 'TRX_DATE', 'DATE')),
    }));
}

/** Tek ödeme kaydını Paynkolay'daki gerçek durumla eşitler (webhook olmadığı için tek güvenilir yol). */
export async function reconcilePayment(c: PaynCfg, pay: PayRow, sb: SupabaseClient): Promise<Settle> {
  if (pay.status === 'paid') return { state: 'ok', orderNo: pay.order_no };
  if (!pay.token) return { state: 'bilinmiyor', orderNo: pay.order_no };
  const txns = await lookup(c, pay.token, new Date(pay.created_at));
  if (!txns) return { state: 'bekliyor', orderNo: pay.order_no };
  const sale = txns.find((t) => t.status === 'SUCCESS' && (t.type === 'sales' || t.type === '') && t.reference && t.amount > 0);
  if (sale) return applyPaid(sb, pay, sale.reference, sale.amount);
  if (txns.some((t) => t.status === 'NEW')) return { state: 'bekliyor', orderNo: pay.order_no };
  if (txns.length && txns.every((t) => t.status === 'ERROR')) {
    await applyFailed(sb, pay);
    return { state: 'hata', orderNo: pay.order_no };
  }
  return { state: 'bekliyor', orderNo: pay.order_no };
}

/** Bekleyen (init) kart ödemelerini toplu eşitler. Cron'dan çağrılır. */
export async function reconcilePending(c: PaynCfg, sb: SupabaseClient | null = serviceClient(), limit = 60): Promise<{ checked: number; paid: number }> {
  if (!sb || !c.sxList) return { checked: 0, paid: 0 };
  const since = new Date(Date.now() - 20 * 24 * 3600 * 1000).toISOString();
  const { data } = await sb.from('payments').select('id,order_no,status,token,payment_id,created_at').eq('provider', PROVIDER).eq('status', 'init').gt('created_at', since).order('created_at', { ascending: false }).limit(limit);
  let paid = 0;
  for (const p of (data ?? []) as PayRow[]) {
    const r = await reconcilePayment(c, p, sb);
    if (r.state === 'ok') paid += 1;
  }
  return { checked: (data ?? []).length, paid };
}

/** Aynı gün iptal, sonrası iade. Başarılıysa ödeme 'refunded', sipariş 'iptal' (stok iade tetikleyicisi çalışır). */
export async function refundOrder(c: PaynCfg, orderNo: string, sb: SupabaseClient | null = serviceClient()): Promise<{ ok: boolean; error?: string }> {
  if (!sb) return { ok: false, error: 'Sunucu yapılandırması eksik (SUPABASE_SERVICE_ROLE_KEY).' };
  if (!c.sxCancel) return { ok: false, error: 'İptal/iade anahtarı (PAYNKOLAY_SX_IPTAL) tanımlı değil.' };
  const { data: pay } = await sb.from('payments').select('id,order_no,status,token,payment_id,paid_price,created_at,updated_at').eq('order_no', orderNo).eq('provider', PROVIDER).in('status', ['paid', 'review']).order('created_at', { ascending: false }).limit(1).maybeSingle();
  if (!pay || !pay.payment_id) return { ok: false, error: 'Bu sipariş için iade edilebilir kart ödemesi bulunamadı.' };

  // İşlem tarihini Paynkolay'dan al; ulaşılamazsa ödeme kaydının güncellenme gününe düş.
  const txns = pay.token ? await lookup(c, pay.token as string, new Date(pay.created_at as string)) : null;
  const sale = txns?.find((t) => t.reference === pay.payment_id);
  const t = istanbul(new Date(pay.updated_at as string));
  const trxDate = sale?.date || `${t.y}.${t.m}.${t.d}`;
  const amount = money(Number(pay.paid_price));
  const n = istanbul(new Date());
  const type = trxDate === `${n.y}.${n.m}.${n.d}` ? 'cancel' : 'refund';

  const send = (ty: string) =>
    call(`${c.base}/v1/CancelRefundPayment`, {
      sx: c.sxCancel,
      referenceCode: String(pay.payment_id),
      type: ty,
      amount,
      trxDate,
      hashDatav2: cancelRefundHash(c, { referenceCode: String(pay.payment_id), type: ty, amount, trxDate }),
    });
  let r = await send(type);
  const okOf = (x: unknown) => isRec(x) && pick(x, 'responseCode', 'RESPONSE_CODE') === '2';
  if (!okOf(r) && type === 'cancel') r = await send('refund');
  if (!okOf(r)) {
    const why = isRec(r) ? pick(r, 'responseData', 'RESPONSE_DATA', 'message') : 'Paynkolay\'a ulaşılamadı';
    console.error('[paynkolay] iade hatası', orderNo, why);
    return { ok: false, error: 'Paynkolay iadeyi kabul etmedi: ' + (why || 'bilinmeyen hata') };
  }
  await sb.from('payments').update({ status: 'refunded', updated_at: new Date().toISOString() }).eq('id', pay.id);
  await sb.from('orders').update({ status: 'iptal' }).eq('order_no', orderNo);
  await notifyOrder('order_cancelled', orderNo).catch(() => {});
  return { ok: true };
}

export const clientIp = (req: Request) => (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() || '127.0.0.1';
