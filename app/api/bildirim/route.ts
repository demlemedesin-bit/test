import { NextResponse } from 'next/server';
import { hasAnyPerm } from '@/lib/serverAuth';
import { notifyCart, notifyOrder, serviceClient, type NotifyOut, type OrderEvent } from '@/lib/notify';

type Out = { ok: boolean; skipped?: boolean; error?: string };
const json = (b: Out, status = 200) => NextResponse.json(b, { status, headers: { 'Cache-Control': 'no-store' } });

// Basit bellek-içi hız sınırı (sunucusuz ortamda örnek başına; kaba bir kalkan)
const hits = new Map<string, { n: number; reset: number }>();
function limited(ip: string): boolean {
  const now = Date.now();
  if (hits.size > 2000) for (const [k, v] of hits) if (v.reset < now) hits.delete(k);
  const h = hits.get(ip);
  if (!h || h.reset < now) {
    hits.set(ip, { n: 1, reset: now + 60_000 });
    return false;
  }
  return ++h.n > 20;
}
const inflight = new Set<string>();

const STAFF: Record<string, string> = {
  order_paid: 'orders',
  order_shipped: 'orders',
  order_delivered: 'orders',
  order_cancelled: 'orders',
  cart_reminder: 'customers',
};

function summarize(r: NotifyOut): Out {
  const sent = r.results.some((x) => x.status === 'sent');
  const failed = r.results.find((x) => x.status === 'failed');
  if (failed && !sent) return { ok: false, error: failed.error || 'Gönderilemedi' };
  return { ok: true, skipped: !sent };
}

// Sipariş / sepet bildirimleri. order_created herkese açıktır ama sipariş no + e-posta eşleşmesi ister;
// diğer olaylar yalnızca yetkili personelin jetonuyla çalışır.
export async function POST(req: Request) {
  let b: { event?: unknown; order_no?: unknown; email?: unknown } = {};
  try {
    b = await req.json();
  } catch {
    return json({ ok: false, error: 'Geçersiz istek' }, 400);
  }
  const event = typeof b.event === 'string' ? b.event : '';
  const orderNo = typeof b.order_no === 'string' ? b.order_no.trim().slice(0, 40) : '';
  const email = typeof b.email === 'string' ? b.email.trim().toLowerCase().slice(0, 160) : '';

  if (event === 'order_created') {
    const ip = (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() || 'anon';
    if (limited(ip)) return json({ ok: false, error: 'Çok fazla istek' }, 429);
    if (!orderNo || !email) return json({ ok: false, error: 'Sipariş no ve e-posta gerekli' }, 400);
    const sb = serviceClient();
    if (!sb) return json({ ok: true, skipped: true });
    const { data: o } = await sb.from('orders').select('order_no,email,created_at').eq('order_no', orderNo).maybeSingle();
    if (!o || String(o.email).toLowerCase() !== email) return json({ ok: false, error: 'Sipariş bulunamadı' }, 404);
    if (Date.now() - new Date(o.created_at as string).getTime() > 15 * 60_000) return json({ ok: true, skipped: true });
    if (inflight.has(orderNo)) return json({ ok: true, skipped: true });
    inflight.add(orderNo);
    try {
      const { count } = await sb.from('message_log').select('id', { count: 'exact', head: true }).eq('order_no', orderNo).eq('template', 'order_created');
      if ((count ?? 0) > 0) return json({ ok: true, skipped: true });
      return json(summarize(await notifyOrder('order_created', orderNo)));
    } finally {
      inflight.delete(orderNo);
    }
  }

  const perm = STAFF[event];
  if (!perm) return json({ ok: false, error: 'Bilinmeyen olay' }, 400);
  if (!(await hasAnyPerm(req, [perm]))) return json({ ok: false, error: 'Yetkin yok' }, 403);

  if (event === 'cart_reminder') {
    if (!email) return json({ ok: false, error: 'E-posta gerekli' }, 400);
    return json(summarize(await notifyCart(email)));
  }
  if (!orderNo) return json({ ok: false, error: 'Sipariş no gerekli' }, 400);
  return json(summarize(await notifyOrder(event as OrderEvent, orderNo)));
}
