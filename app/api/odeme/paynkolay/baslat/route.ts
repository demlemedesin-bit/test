import { NextResponse } from 'next/server';
import { checkoutForm, clientIp, paynCfg, PROVIDER } from '@/lib/paynkolay';
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
// Yanıt: tarayıcının Paynkolay ortak ödeme sayfasına POST edeceği adres ve alanlar.
export async function POST(req: Request) {
  const ip = clientIp(req);
  if (limited(ip)) return NextResponse.json({ ok: false, error: 'Çok fazla deneme. Biraz bekle.' }, { status: 429 });
  const cfg = paynCfg();
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

  const { data: o } = await sb.from('orders').select('order_no,total,status,payment_method').eq('order_no', orderNo).eq('email', email).maybeSingle();
  if (!o) return NextResponse.json({ ok: false, error: 'Sipariş bulunamadı.' }, { status: 404 });
  if (o.payment_method !== 'kart' || o.status !== 'odeme_bekleniyor') return NextResponse.json({ ok: false, error: 'Bu sipariş için ödeme alınamaz.' }, { status: 409 });
  if (!(Number(o.total) > 0)) return NextResponse.json({ ok: false, error: 'Sipariş tutarı doğrulanamadı.' }, { status: 409 });

  const f = checkoutForm(cfg, o, ip);
  const { error } = await sb.from('payments').insert({ order_no: orderNo, provider: PROVIDER, token: f.clientRefCode, status: 'init' });
  if (error) return NextResponse.json({ ok: false, error: 'Ödeme sayfası açılamadı. Biraz sonra tekrar dene.' }, { status: 502 });
  return NextResponse.json({ ok: true, url: f.url, fields: f.fields });
}
