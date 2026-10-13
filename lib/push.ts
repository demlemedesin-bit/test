import webpush from 'web-push';
import type { SupabaseClient } from '@supabase/supabase-js';
import { serviceClient } from './notify';

/** Yönetici cihazlarına web push (PWA bildirimi). Yalnızca sunucu rotalarından çağrılır; hiçbir fonksiyon hata fırlatmaz. */

export type PushPayload = { title: string; body: string; url?: string; tag?: string };
export type PushResult = { id: string; label: string | null; ok: boolean; status?: number; error?: string };

let ready: boolean | null = null;
export function pushConfigured(): boolean {
  if (ready !== null) return ready;
  const pub = process.env.VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) return (ready = false);
  try {
    webpush.setVapidDetails(process.env.VAPID_SUBJECT || 'mailto:garen@demlemedesin.com', pub, priv);
    ready = true;
  } catch {
    ready = false;
  }
  return ready;
}

type SubRow = { id: string; endpoint: string; p256dh: string; auth: string; label: string | null };

/** Verilen abonelik satırlarına gönderir; süresi dolan (404/410) abonelikleri siler, sonucu kaydeder. */
export async function sendToSubs(sb: SupabaseClient, subs: SubRow[], payload: PushPayload): Promise<PushResult[]> {
  if (!pushConfigured()) return subs.map((s) => ({ id: s.id, label: s.label, ok: false, error: 'VAPID anahtarları tanımsız' }));
  const body = JSON.stringify({ title: payload.title.slice(0, 80), body: payload.body.slice(0, 200), url: payload.url || '/admin/siparisler', tag: payload.tag });
  return Promise.all(
    subs.map(async (s): Promise<PushResult> => {
      try {
        const r = await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, body, { TTL: 60 * 60 * 24, urgency: 'high', timeout: 8000 });
        await sb.from('push_subscriptions').update({ last_ok_at: new Date().toISOString(), last_error: null }).eq('id', s.id);
        return { id: s.id, label: s.label, ok: true, status: r.statusCode };
      } catch (e) {
        const status = (e as { statusCode?: number }).statusCode;
        const error = ((e as Error).message || String(e)).slice(0, 200);
        if (status === 404 || status === 410) await sb.from('push_subscriptions').delete().eq('id', s.id);
        else await sb.from('push_subscriptions').update({ last_error: `${status ?? ''} ${error}`.trim().slice(0, 300) }).eq('id', s.id);
        return { id: s.id, label: s.label, ok: false, status, error };
      }
    }),
  );
}

type OrderPush = { order_no: string; full_name: string | null; total: number | string; payment_method: string | null; status: string | null; items: { qty?: number }[] | null };
const PAY: Record<string, string> = { havale: 'Havale', kapida: 'Kapıda ödeme', kart: 'Kart (ödendi)' };

/** Yeni sipariş bildirimi. Havale/kapıda: sipariş oluşunca; kart: ödeme onaylanınca. Aynı sipariş için en fazla bir kez gider. */
export async function pushNewOrder(orderNo: string): Promise<{ sent: number; failed: number; skipped?: string }> {
  try {
    if (!pushConfigured()) return { sent: 0, failed: 0, skipped: 'VAPID anahtarları tanımsız' };
    const sb = serviceClient();
    if (!sb) return { sent: 0, failed: 0, skipped: 'servis anahtarı tanımsız' };
    const { data: o } = await sb.from('orders').select('order_no,full_name,total,payment_method,status,items').eq('order_no', orderNo).maybeSingle();
    if (!o) return { sent: 0, failed: 0, skipped: 'sipariş bulunamadı' };
    const ord = o as OrderPush;
    if (ord.status === 'iptal') return { sent: 0, failed: 0, skipped: 'iptal' };
    if (ord.payment_method === 'kart' && ord.status === 'odeme_bekleniyor') return { sent: 0, failed: 0, skipped: 'kart ödemesi onaylanmadı' };
    const { error: dup } = await sb.from('push_sent').insert({ key: `siparis:${ord.order_no}` });
    if (dup) return { sent: 0, failed: 0, skipped: 'zaten bildirildi' };
    const { data: subs } = await sb.from('push_subscriptions').select('id,endpoint,p256dh,auth,label');
    if (!subs?.length) return { sent: 0, failed: 0, skipped: 'kayıtlı cihaz yok' };
    const adet = (ord.items ?? []).reduce((a, i) => a + (Number(i.qty) || 1), 0);
    const tl = Number(ord.total).toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const res = await sendToSubs(sb, subs as SubRow[], {
      title: `Yeni sipariş · ₺${tl}`,
      body: [ord.order_no, ord.full_name, PAY[ord.payment_method ?? ''] ?? ord.payment_method, adet ? `${adet} ürün` : ''].filter(Boolean).join(' · '),
      url: '/admin/siparisler',
      tag: `siparis-${ord.order_no}`,
    });
    const sent = res.filter((r) => r.ok).length;
    if (!sent) await sb.from('push_sent').delete().eq('key', `siparis:${ord.order_no}`); // hiçbiri ulaşmadıysa tekrar denenebilsin
    return { sent, failed: res.length - sent };
  } catch (e) {
    return { sent: 0, failed: 0, skipped: ((e as Error).message || String(e)).slice(0, 120) };
  }
}
