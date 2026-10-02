import { NextResponse } from 'next/server';
import { clientIp, iyzicoCfg, startCheckout } from '@/lib/iyzico';
import { serviceClient } from '@/lib/notify';

export const dynamic = 'force-dynamic';

const hits = new Map<string, { n: number; t: number }>();
function limited(ip: string) {
  const now = Date.now();
  const h = hits.get(ip);
  if (!h || now - h.t > 60000) {
    hits.set(ip, { n: 1, t: now });
    return false;
  }
  h.n += 1;
  return h.n > 12;
}

// Gövde: { order_no, email }. Tutar HİÇBİR zaman istemciden alınmaz; sipariş satırı veritabanından okunur.
export async function POST(req: Request) {
  const ip = clientIp(req);
  if (limited(ip)) return NextResponse.json({ ok: false, error: 'Çok fazla deneme. Biraz bekle.' }, { status: 429 });
  const cfg = iyzicoCfg();
  const sb = serviceClient();
  if (!cfg || !sb) return NextResponse.json({ ok: false, error: 'Kart ödemesi şu an kullanılamıyor.' }, { status: 503 });

  let body: { order_no?: string; email?: string } = {};
  try {
    body = await req.json();
  } catch {
    /* boş */
  }
  const orderNo = String(body.order_no || '').trim().toUpperCase();
  const email = String(body.email || '').trim().toLowerCase();
  if (!orderNo || !email) return NextResponse.json({ ok: false, error: 'Eksik bilgi.' }, { status: 400 });

  const { data: o } = await sb.from('orders').select('*').eq('order_no', orderNo).eq('email', email).maybeSingle();
  if (!o) return NextResponse.json({ ok: false, error: 'Sipariş bulunamadı.' }, { status: 404 });
  if (o.payment_method !== 'kart' || o.status !== 'odeme_bekleniyor') return NextResponse.json({ ok: false, error: 'Bu sipariş için ödeme alınamaz.' }, { status: 409 });

  const r = await startCheckout(cfg, o, ip);
  if (!r.ok) return NextResponse.json({ ok: false, error: r.error }, { status: 502 });
  await sb.from('payments').insert({ order_no: orderNo, provider: 'iyzico', token: r.token, status: 'init' });
  return NextResponse.json({ ok: true, url: r.url });
}
