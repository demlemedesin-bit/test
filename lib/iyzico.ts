import crypto from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import { notifyOrder, serviceClient } from './notify';
import { siteUrl } from './siteUrl';

/** iyzico Ödeme Formu (Checkout Form) istemcisi — paketsiz. Anahtarlar yalnızca sunucu ortam değişkenlerinden gelir. */

export type IyzicoCfg = { apiKey: string; secret: string; base: string };

export function iyzicoCfg(): IyzicoCfg | null {
  const apiKey = process.env.IYZICO_API_KEY;
  const secret = process.env.IYZICO_SECRET_KEY;
  if (!apiKey || !secret) return null;
  return { apiKey, secret, base: (process.env.IYZICO_BASE_URL || 'https://sandbox-api.iyzipay.com').replace(/\/+$/, '') };
}

export const isSandbox = (c: IyzicoCfg) => c.base.includes('sandbox');

/** IYZWSv2 imzalı istek. */
export async function iyzicoCall(cfg: IyzicoCfg, uriPath: string, body: object): Promise<Record<string, unknown>> {
  const raw = JSON.stringify(body);
  const rnd = String(Date.now()) + crypto.randomBytes(6).toString('hex');
  const signature = crypto.createHmac('sha256', cfg.secret).update(rnd + uriPath + raw).digest('hex');
  const auth = Buffer.from(`apiKey:${cfg.apiKey}&randomKey:${rnd}&signature:${signature}`).toString('base64');
  const res = await fetch(cfg.base + uriPath, {
    method: 'POST',
    headers: { Authorization: `IYZWSv2 ${auth}`, 'x-iyzi-rnd': rnd, 'Content-Type': 'application/json', Accept: 'application/json' },
    body: raw,
    cache: 'no-store',
    signal: AbortSignal.timeout(20000),
  });
  try {
    return (await res.json()) as Record<string, unknown>;
  } catch {
    return { status: 'failure', errorMessage: 'Geçersiz yanıt (' + res.status + ')' };
  }
}

const cents = (n: number) => Math.round(n * 100);
const money = (c: number) => (c / 100).toFixed(2);

type OrderRow = {
  order_no: string;
  user_id: string | null;
  email: string;
  full_name: string;
  phone: string;
  address: { city?: string; district?: string; address?: string; zip?: string };
  items: { slug: string; name: string; qty: number; line_total: number }[];
  subtotal: number;
  shipping: number;
  discount: number;
  total: number;
  payment_method: string;
  status: string;
};

/** iyzico sepet kalemleri: indirim kalemlere orantılı dağıtılır, kargo ayrı kalem olur; toplam = sipariş toplamı. */
export function basketFor(o: OrderRow) {
  const sub = cents(Number(o.subtotal));
  const disc = Math.min(cents(Number(o.discount || 0)), sub);
  const lines = o.items.map((i) => ({ i, c: cents(Number(i.line_total)) }));
  let left = disc;
  const out = lines.map(({ i, c }, k) => {
    const share = k === lines.length - 1 ? left : Math.min(left, Math.round((disc * c) / (sub || 1)));
    left -= share;
    return { id: i.slug, name: `${i.name} × ${i.qty}`.slice(0, 120), category1: 'Demleme', itemType: 'PHYSICAL', price: money(Math.max(c - share, 0)), c: Math.max(c - share, 0) };
  });
  const ship = cents(Number(o.shipping));
  if (ship > 0) out.push({ id: 'kargo', name: 'Kargo', category1: 'Kargo', itemType: 'PHYSICAL', price: money(ship), c: ship });
  return { items: out.filter((x) => x.c > 0).map(({ c: _c, ...rest }) => { void _c; return rest; }), total: out.reduce((n, x) => n + x.c, 0) };
}

export async function startCheckout(cfg: IyzicoCfg, o: OrderRow, ip: string): Promise<{ ok: true; token: string; url: string } | { ok: false; error: string }> {
  const { items, total } = basketFor(o);
  if (!items.length || total <= 0 || total !== cents(Number(o.total))) return { ok: false, error: 'Sipariş tutarı doğrulanamadı.' };
  const parts = o.full_name.trim().split(/\s+/);
  const surname = parts.length > 1 ? parts.pop()! : '-';
  const name = parts.join(' ') || o.full_name;
  const addr = `${o.address.address ?? ''} ${o.address.district ?? ''}`.trim() || '-';
  const city = o.address.city || '-';
  const phone = o.phone.replace(/\D/g, '');
  const gsm = '+90' + phone.replace(/^(0090|90|0)/, '').slice(-10);
  const body = {
    locale: 'tr',
    conversationId: o.order_no,
    price: money(total),
    paidPrice: money(total),
    currency: 'TRY',
    basketId: o.order_no,
    paymentGroup: 'PRODUCT',
    callbackUrl: `${siteUrl()}/api/odeme/iyzico/sonuc`,
    enabledInstallments: [1],
    buyer: { id: o.user_id || 'misafir', name, surname, gsmNumber: gsm, email: o.email, identityNumber: '11111111111', registrationAddress: addr, ip, city, country: 'Turkey', zipCode: o.address.zip || '00000' },
    shippingAddress: { contactName: o.full_name, city, country: 'Turkey', address: addr, zipCode: o.address.zip || '00000' },
    billingAddress: { contactName: o.full_name, city, country: 'Turkey', address: addr, zipCode: o.address.zip || '00000' },
    basketItems: items,
  };
  const r = await iyzicoCall(cfg, '/payment/iyzipos/checkoutform/initialize/auth/ecom', body);
  if (r.status !== 'success' || typeof r.token !== 'string' || typeof r.paymentPageUrl !== 'string') {
    console.error('[iyzico] başlatma hatası', o.order_no, r.errorCode, r.errorMessage);
    return { ok: false, error: 'Ödeme sayfası açılamadı. Biraz sonra tekrar dene.' };
  }
  return { ok: true, token: r.token, url: r.paymentPageUrl };
}

export type Settle = { state: 'ok' | 'bekliyor' | 'hata' | 'tutar' | 'bilinmiyor'; orderNo?: string };

/** Token'ı iyzico'dan teyit eder, siparişi ödendi yapar. Birden fazla çağrılabilir (idempotent). */
export async function settleToken(cfg: IyzicoCfg, token: string, sb: SupabaseClient | null = serviceClient()): Promise<Settle> {
  if (!sb || !token) return { state: 'bilinmiyor' };
  const { data: pay } = await sb.from('payments').select('*').eq('token', token).maybeSingle();
  if (!pay) return { state: 'bilinmiyor' };
  const orderNo = pay.order_no as string;
  if (pay.status === 'paid') return { state: 'ok', orderNo };

  const r = await iyzicoCall(cfg, '/payment/iyzipos/checkoutform/auth/ecom/detail', { locale: 'tr', conversationId: orderNo, token });
  const paymentId = r.paymentId != null ? String(r.paymentId) : null;
  const paid = Number(r.paidPrice);
  const fraud = r.fraudStatus != null ? Number(r.fraudStatus) : null;
  const now = new Date().toISOString();

  if (r.status === 'success' && r.paymentStatus === 'SUCCESS' && fraud === 1) {
    const { data: ok, error } = await sb.rpc('mark_order_paid', { p_order_no: orderNo, p_payment_id: paymentId ?? '', p_paid: paid });
    if (error) {
      await sb.from('payments').update({ status: 'review', payment_id: paymentId, fraud_status: fraud, paid_price: paid, updated_at: now }).eq('id', pay.id);
      console.error('[iyzico] tutar/sipariş uyuşmazlığı', orderNo, error.message);
      return { state: 'tutar', orderNo };
    }
    await sb.from('payments').update({ status: ok ? 'paid' : 'review', payment_id: paymentId, fraud_status: fraud, paid_price: paid, updated_at: now }).eq('id', pay.id);
    if (!ok) return { state: 'tutar', orderNo }; // sipariş iptal edilmişti: manuel iade gerekir
    await notifyOrder('order_paid', orderNo).catch(() => {});
    return { state: 'ok', orderNo };
  }
  if (r.status === 'success' && fraud === 0) {
    await sb.from('payments').update({ status: 'review', payment_id: paymentId, fraud_status: 0, updated_at: now }).eq('id', pay.id);
    return { state: 'bekliyor', orderNo };
  }
  await sb.from('payments').update({ status: 'failed', payment_id: paymentId, fraud_status: fraud, updated_at: now }).eq('id', pay.id);
  return { state: 'hata', orderNo };
}

/** X-IYZ-SIGNATURE-V3 doğrulaması (sabit zamanlı). */
export function webhookSignatureOk(cfg: IyzicoCfg, header: string | null, p: { iyziEventType?: string; iyziPaymentId?: string | number; token?: string; paymentConversationId?: string; status?: string }): boolean {
  if (!header) return false;
  const base = cfg.secret + (p.iyziEventType ?? '') + (p.iyziPaymentId ?? '') + (p.token ?? '') + (p.paymentConversationId ?? '') + (p.status ?? '');
  const mine = crypto.createHmac('sha256', cfg.secret).update(base).digest('hex');
  const a = Buffer.from(mine);
  const b = Buffer.from(header.trim().toLowerCase());
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

/** Aynı gün iptal, sonrası iade. Başarılıysa ödeme 'refunded', sipariş 'iptal' (stok iade tetikleyicisi çalışır). */
export async function refundOrder(cfg: IyzicoCfg, orderNo: string, ip: string, sb: SupabaseClient | null = serviceClient()): Promise<{ ok: boolean; error?: string }> {
  if (!sb) return { ok: false, error: 'Sunucu yapılandırması eksik (SUPABASE_SERVICE_ROLE_KEY).' };
  const { data: pay } = await sb.from('payments').select('*').eq('order_no', orderNo).in('status', ['paid', 'review']).order('created_at', { ascending: false }).limit(1).maybeSingle();
  if (!pay || !pay.payment_id) return { ok: false, error: 'Bu sipariş için iade edilebilir kart ödemesi bulunamadı.' };
  const { data: ord } = await sb.from('orders').select('paid_at, created_at').eq('order_no', orderNo).maybeSingle();
  const day = (d?: string | null) => (d ? new Date(d).toLocaleDateString('en-CA', { timeZone: 'Europe/Istanbul' }) : '');
  const sameDay = day(ord?.paid_at ?? ord?.created_at) === day(new Date().toISOString());
  const base = { locale: 'tr', conversationId: orderNo, paymentId: pay.payment_id, ip };
  let r: Record<string, unknown> = {};
  if (sameDay) r = await iyzicoCall(cfg, '/payment/cancel', base);
  if (!sameDay || r.status !== 'success') r = await iyzicoCall(cfg, '/v2/payment/refund', { ...base, price: Number(pay.paid_price).toFixed(2) });
  if (r.status !== 'success') {
    console.error('[iyzico] iade hatası', orderNo, r.errorCode, r.errorMessage);
    return { ok: false, error: 'iyzico iadeyi kabul etmedi: ' + String(r.errorMessage ?? 'bilinmeyen hata') };
  }
  await sb.from('payments').update({ status: 'refunded', updated_at: new Date().toISOString() }).eq('id', pay.id);
  await sb.from('orders').update({ status: 'iptal' }).eq('order_no', orderNo);
  await notifyOrder('order_cancelled', orderNo).catch(() => {});
  return { ok: true };
}

export const clientIp = (req: Request) => (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() || '127.0.0.1';
