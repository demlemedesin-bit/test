import { createHmac } from 'node:crypto';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { carrierUrl } from './carriers';
import { configFromMap } from './catalog';
import { siteUrl } from './siteUrl';

/**
 * Bildirimler: e-posta (Resend), SMS (NetGSM), giden webhook (n8n). Yalnızca sunucu rotalarından çağrılır.
 * Anahtarlar Vercel ortam değişkenidir; tanımsızsa ilgili kanal "skipped" döner. Hiçbir fonksiyon hata fırlatmaz.
 */

export type OrderEvent = 'order_created' | 'order_paid' | 'order_shipped' | 'order_delivered' | 'order_cancelled';
export const ORDER_EVENTS: OrderEvent[] = ['order_created', 'order_paid', 'order_shipped', 'order_delivered', 'order_cancelled'];
export type Channel = 'email' | 'sms' | 'webhook';
export type SendStatus = 'sent' | 'failed' | 'skipped';
export type SendResult = { status: SendStatus; error?: string };
export type NotifyResult = { channel: Channel; to?: string; status: SendStatus; error?: string };
export type NotifyOut = { ok: boolean; results: NotifyResult[] };

/** Servis anahtarıyla Supabase istemcisi; anahtar yoksa null. İstemci koduna asla girmemeli. */
export function serviceClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

/** {{anahtar}} → değer. Düz metin içindir, HTML kaçışı yapılmaz. Bilinmeyen anahtar boş olur. */
export function renderTemplate(str: string, vars: Record<string, string>): string {
  return str
    .replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, k: string) => vars[k] ?? '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

const msg = (e: unknown) => (e instanceof Error ? e.message : String(e)).slice(0, 300);

export async function sendEmail(p: { to: string; subject: string; text: string }): Promise<SendResult> {
  const key = process.env.RESEND_API_KEY;
  const from = process.env.MAIL_FROM;
  if (!key || !from) return { status: 'skipped', error: !key ? 'RESEND_API_KEY tanımsız' : 'MAIL_FROM tanımsız' };
  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from, to: [p.to], subject: p.subject, text: p.text }),
      signal: AbortSignal.timeout(10000),
    });
    if (!r.ok) {
      const t = await r.text().catch(() => '');
      return { status: 'failed', error: `Resend ${r.status} ${t}`.slice(0, 300) };
    }
    return { status: 'sent' };
  } catch (e) {
    return { status: 'failed', error: msg(e) };
  }
}

/** Telefonu NetGSM biçimine (905xxxxxxxxx) çevirir; geçersizse null. */
export function normalizePhone(raw: string): string | null {
  let d = (raw || '').replace(/\D/g, '');
  if (d.startsWith('00')) d = d.slice(2);
  if (d.length === 10 && d.startsWith('5')) d = '90' + d;
  else if (d.length === 11 && d.startsWith('05')) d = '9' + d;
  return /^905\d{9}$/.test(d) ? d : null;
}

export async function sendSms(p: { to: string; text: string }): Promise<SendResult> {
  const user = process.env.NETGSM_USERCODE;
  const pass = process.env.NETGSM_PASSWORD;
  const header = process.env.NETGSM_HEADER;
  if (!user || !pass || !header) return { status: 'skipped', error: 'NETGSM_USERCODE / NETGSM_PASSWORD / NETGSM_HEADER tanımsız' };
  const no = normalizePhone(p.to);
  if (!no) return { status: 'failed', error: 'Geçersiz telefon numarası' };
  const x = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const xml =
    `<?xml version="1.0" encoding="UTF-8"?><mainbody><header><company dil="TR">Netgsm</company><usercode>${x(user)}</usercode><password>${x(pass)}</password>` +
    `<type>1:n</type><msgheader>${x(header)}</msgheader></header><body><msg><![CDATA[${p.text.replace(/\]\]>/g, ']] >')}]]></msg><no>${no}</no></body></mainbody>`;
  try {
    const r = await fetch('https://api.netgsm.com.tr/sms/send/xml', {
      method: 'POST',
      headers: { 'Content-Type': 'text/xml; charset=UTF-8' },
      body: xml,
      signal: AbortSignal.timeout(10000),
    });
    const t = (await r.text()).trim();
    // Başarı: "00 <gönderi numarası>" (bazı hesaplarda "01"/"02" de kabul edildi anlamındadır)
    if (r.ok && /^0[012]\b/.test(t)) return { status: 'sent' };
    return { status: 'failed', error: `NetGSM yanıtı: ${t}`.slice(0, 200) };
  } catch (e) {
    return { status: 'failed', error: msg(e) };
  }
}

async function webhookUrl(sb: SupabaseClient | null): Promise<string> {
  const env = (process.env.N8N_WEBHOOK_URL || '').trim();
  if (env) return env;
  if (!sb) return '';
  try {
    const { data } = await sb.from('shop_settings').select('value').eq('key', 'webhook_url').maybeSingle();
    return String(data?.value ?? '').trim();
  } catch {
    return '';
  }
}

/** Giden webhook: JSON POST, 5 sn zaman aşımı; WEBHOOK_SECRET varsa gövdenin HMAC-SHA256 (hex) imzası X-Demleme-Signature'dadır. */
export async function postWebhook(event: string, payload: unknown, sb: SupabaseClient | null = serviceClient()): Promise<SendResult> {
  const url = await webhookUrl(sb);
  if (!url) return { status: 'skipped', error: 'Webhook adresi tanımsız' };
  if (!/^https?:\/\//i.test(url)) return { status: 'failed', error: 'Webhook adresi geçersiz' };
  const body = JSON.stringify({ event, at: new Date().toISOString(), data: payload });
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const secret = process.env.WEBHOOK_SECRET;
  if (secret) headers['X-Demleme-Signature'] = createHmac('sha256', secret).update(body).digest('hex');
  try {
    const r = await fetch(url, { method: 'POST', headers, body, signal: AbortSignal.timeout(5000) });
    return r.ok ? { status: 'sent' } : { status: 'failed', error: `Webhook yanıtı ${r.status}` };
  } catch (e) {
    return { status: 'failed', error: msg(e) };
  }
}

async function logMsg(sb: SupabaseClient | null, row: { channel: string; to_addr?: string | null; template?: string | null; subject?: string | null; status: SendStatus; error?: string | null; order_no?: string | null }) {
  if (!sb) return;
  try {
    await sb.from('message_log').insert({ to_addr: null, template: null, subject: null, error: null, order_no: null, ...row });
  } catch {
    /* günlük yazılamasa da akış sürer */
  }
}

type Tpl = { key: string; subject: string; body: string; email_on: boolean; sms_on: boolean };
type OrderLine = { name?: string; qty?: number; color_name?: string | null; size?: string | null; line_total?: number };
type OrderRec = {
  order_no: string; email: string; full_name: string; phone: string; status: string; items: OrderLine[];
  subtotal: number; shipping: number; discount: number | null; coupon_code: string | null; total: number; payment_method: string;
  tracking_carrier: string | null; tracking_no: string | null; created_at: string;
};

const money = (n: number) => '₺' + Number(n).toLocaleString('tr-TR', { minimumFractionDigits: Number.isInteger(Number(n)) ? 0 : 2, maximumFractionDigits: 2 });

async function settingsMap(sb: SupabaseClient): Promise<Record<string, string>> {
  const { data } = await sb.from('shop_settings').select('key,value');
  return Object.fromEntries((data ?? []).map((r) => [r.key as string, String(r.value ?? '')]));
}

function paymentInfo(o: OrderRec, m: Record<string, string>): string {
  if (o.payment_method === 'havale') {
    const b = configFromMap(m).bank;
    const lines = [
      `Ödemeyi havale / EFT ile yapabilirsin. Açıklama kısmına sipariş numaranı (${o.order_no}) yaz.`,
      b.holder && `Hesap sahibi: ${b.holder}`,
      b.bankName && `Banka: ${b.bankName}`,
      b.iban && `IBAN: ${b.iban}`,
    ].filter(Boolean);
    return lines.join('\n');
  }
  if (o.payment_method === 'kapida') return 'Ödemeyi teslimat sırasında kapıda yapacaksın.';
  return 'Ödemen kredi / banka kartıyla alınır.';
}

function orderVars(o: OrderRec, m: Record<string, string>): Record<string, string> {
  const base = siteUrl();
  return {
    name: (o.full_name || '').trim().split(/\s+/)[0] || 'merhaba',
    order_no: o.order_no,
    total: money(o.total),
    track_url: `${base}/siparis-takip?no=${encodeURIComponent(o.order_no)}&email=${encodeURIComponent(o.email)}`,
    carrier: o.tracking_carrier ?? '',
    tracking_no: o.tracking_no ?? '',
    carrier_url: carrierUrl(o.tracking_carrier, o.tracking_no),
    payment_info: paymentInfo(o, m),
  };
}

/** Sipariş olayı için e-posta / SMS / webhook gönderir ve her denemeyi message_log'a yazar. Asla fırlatmaz. */
export async function notifyOrder(event: OrderEvent, orderNo: string): Promise<NotifyOut> {
  const results: NotifyResult[] = [];
  const done = (): NotifyOut => ({ ok: !results.some((r) => r.status === 'failed'), results });
  try {
    const sb = serviceClient();
    if (!sb) return { ok: true, results: [{ channel: 'email', status: 'skipped', error: 'SUPABASE_SERVICE_ROLE_KEY tanımsız' }] };
    const { data: o } = await sb.from('orders').select('*').eq('order_no', orderNo).maybeSingle();
    if (!o) return { ok: false, results: [{ channel: 'email', status: 'failed', error: 'Sipariş bulunamadı' }] };
    const order = o as OrderRec;
    const [{ data: t }, m] = await Promise.all([sb.from('message_templates').select('*').eq('key', event).maybeSingle(), settingsMap(sb)]);
    const tpl = t as Tpl | null;
    const vars = orderVars(order, m);

    if (tpl) {
      const subject = renderTemplate(tpl.subject, vars);
      const text = renderTemplate(tpl.body, vars);
      if (tpl.email_on && order.email) {
        const r = await sendEmail({ to: order.email, subject, text });
        results.push({ channel: 'email', to: order.email, ...r });
        await logMsg(sb, { channel: 'email', to_addr: order.email, template: event, subject, status: r.status, error: r.error, order_no: orderNo });
      }
      if (tpl.sms_on && order.phone) {
        const r = await sendSms({ to: order.phone, text });
        results.push({ channel: 'sms', to: order.phone, ...r });
        await logMsg(sb, { channel: 'sms', to_addr: order.phone, template: event, subject: null, status: r.status, error: r.error, order_no: orderNo });
      }
    }

    // Yönetici bildirimi: yeni siparişte shop_settings.admin_emails adreslerine özet gider
    if (event === 'order_created') {
      const admins = String(m.admin_emails ?? '').split(/[,;\s]+/).map((x) => x.trim()).filter((x) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(x)).slice(0, 5);
      if (admins.length) {
        const lines = ((order.items as { name?: string; qty?: number }[] | null) ?? []).map((i) => `- ${i.qty ?? 1} x ${i.name ?? 'Ürün'}`).join('\n');
        const subject = `Yeni sipariş ${order.order_no}: ₺${Number(order.total).toLocaleString('tr-TR')}`;
        const text = `Yeni sipariş geldi.\n\nSipariş: ${order.order_no}\nMüşteri: ${order.full_name ?? ''} (${order.email ?? ''}, ${order.phone ?? ''})\nÖdeme: ${order.payment_method ?? ''}\nToplam: ₺${Number(order.total).toLocaleString('tr-TR')}\n\n${lines}\n\nYönetim paneli: ${siteUrl()}/admin/siparisler`;
        for (const a of admins) {
          const r = await sendEmail({ to: a, subject, text });
          await logMsg(sb, { channel: 'email', to_addr: a, template: 'admin_new_order', subject, status: r.status, error: r.error, order_no: orderNo });
        }
      }
    }

    const w = await postWebhook(event, {
      order_no: order.order_no, status: order.status, email: order.email, full_name: order.full_name, phone: order.phone,
      items: order.items, subtotal: order.subtotal, shipping: order.shipping, discount: order.discount ?? 0, coupon_code: order.coupon_code,
      total: order.total, payment_method: order.payment_method, tracking_carrier: order.tracking_carrier, tracking_no: order.tracking_no,
      created_at: order.created_at,
    }, sb);
    if (w.status !== 'skipped') {
      results.push({ channel: 'webhook', ...w });
      await logMsg(sb, { channel: 'webhook', to_addr: null, template: event, status: w.status, error: w.error, order_no: orderNo });
    }
  } catch (e) {
    results.push({ channel: 'email', status: 'failed', error: msg(e) });
  }
  return done();
}

/** Terk edilmiş sepet hatırlatması: abandoned_carts → e-posta; gönderilirse reminded_at / remind_count güncellenir. */
export async function notifyCart(email: string): Promise<NotifyOut> {
  const results: NotifyResult[] = [];
  try {
    const sb = serviceClient();
    const to = email.trim().toLowerCase();
    if (!sb) return { ok: true, results: [{ channel: 'email', status: 'skipped', error: 'SUPABASE_SERVICE_ROLE_KEY tanımsız' }] };
    const { data: c } = await sb.from('abandoned_carts').select('*').eq('email', to).maybeSingle();
    if (!c) return { ok: false, results: [{ channel: 'email', status: 'failed', error: 'Sepet bulunamadı' }] };
    const { data: t } = await sb.from('message_templates').select('*').eq('key', 'cart_reminder').maybeSingle();
    const tpl = t as Tpl | null;
    const items = (Array.isArray(c.items) ? c.items : []) as { name?: string; qty?: number; color?: string | null; size?: string | null; price?: number }[];
    const lines = items.map((i) => {
      const v = [i.color, i.size].filter(Boolean).join(' · ');
      return `- ${i.qty ?? 1} × ${i.name ?? 'Ürün'}${v ? ` (${v})` : ''}${i.price != null ? ` · ${money(Number(i.price) * (i.qty ?? 1))}` : ''}`;
    });
    const vars = { name: '', cart_items: lines.join('\n'), cart_url: `${siteUrl()}/sepet`, total: money(Number(c.total ?? 0)) };
    if (tpl && tpl.email_on) {
      const subject = renderTemplate(tpl.subject, vars);
      const r = await sendEmail({ to, subject, text: renderTemplate(tpl.body, vars) });
      results.push({ channel: 'email', to, ...r });
      await logMsg(sb, { channel: 'email', to_addr: to, template: 'cart_reminder', subject, status: r.status, error: r.error });
      if (r.status === 'sent') {
        await sb.from('abandoned_carts').update({ reminded_at: new Date().toISOString(), remind_count: Number(c.remind_count ?? 0) + 1 }).eq('email', to);
      }
    }
    const w = await postWebhook('cart_reminder', { email: to, items, total: c.total, cart_url: vars.cart_url }, sb);
    if (w.status !== 'skipped') {
      results.push({ channel: 'webhook', ...w });
      await logMsg(sb, { channel: 'webhook', template: 'cart_reminder', status: w.status, error: w.error });
    }
  } catch (e) {
    results.push({ channel: 'email', status: 'failed', error: msg(e) });
  }
  return { ok: !results.some((r) => r.status === 'failed'), results };
}
