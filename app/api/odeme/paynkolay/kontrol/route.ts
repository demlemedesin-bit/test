import { NextResponse } from 'next/server';
import { clientIp, paynCfg, reconcilePayment, PROVIDER } from '@/lib/paynkolay';
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
  return h.n > 10;
}

// Müşteri sonuç sayfasından dönmeden tarayıcıyı kapattıysa, sipariş sayfası ödemeyi Paynkolay'dan teyit ettirir.
// Gövde: { order_no, email } → { durum: 'ok' | 'bekliyor' | 'hata' | 'tutar' }
export async function POST(req: Request) {
  if (limited(clientIp(req))) return NextResponse.json({ durum: 'bekliyor' }, { status: 429 });
  const cfg = paynCfg();
  const sb = serviceClient();
  if (!cfg || !sb) return NextResponse.json({ durum: 'bekliyor' });
  let body: { order_no?: string; email?: string } = {};
  try {
    body = await req.json();
  } catch {
    /* boş */
  }
  const orderNo = String(body.order_no || '').trim().toUpperCase();
  const email = String(body.email || '').trim().toLowerCase();
  if (!orderNo || !email) return NextResponse.json({ durum: 'bekliyor' }, { status: 400 });
  const { data: o } = await sb.from('orders').select('order_no,status').eq('order_no', orderNo).eq('email', email).maybeSingle();
  if (!o) return NextResponse.json({ durum: 'bekliyor' }, { status: 404 });
  if (o.status !== 'odeme_bekleniyor') return NextResponse.json({ durum: 'ok' });
  const { data: pays } = await sb.from('payments').select('id,order_no,status,token,payment_id,created_at').eq('order_no', orderNo).eq('provider', PROVIDER).in('status', ['init', 'review']).order('created_at', { ascending: false }).limit(3);
  let durum: string = 'bekliyor';
  for (const p of pays ?? []) {
    const r = await reconcilePayment(cfg, p, sb);
    if (r.state === 'ok') return NextResponse.json({ durum: 'ok' });
    if (r.state === 'tutar') durum = 'tutar';
  }
  return NextResponse.json({ durum });
}
