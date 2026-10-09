import { NextResponse } from 'next/server';
import { paynCfg, refundOrder } from '@/lib/paynkolay';
import { hasAnyPerm } from '@/lib/serverAuth';

export const dynamic = 'force-dynamic';

// Yönetici: kart ödemesini iade/iptal eder ve siparişi iptal eder. Gövde: { order_no }
export async function POST(req: Request) {
  if (!(await hasAnyPerm(req, ['orders']))) return NextResponse.json({ ok: false, error: 'Yetkisiz' }, { status: 403 });
  const cfg = paynCfg();
  if (!cfg) return NextResponse.json({ ok: false, error: 'Paynkolay anahtarları tanımlı değil.' }, { status: 503 });
  let orderNo = '';
  try {
    orderNo = String(((await req.json()) as { order_no?: string }).order_no || '').trim().toUpperCase();
  } catch {
    /* boş */
  }
  if (!orderNo) return NextResponse.json({ ok: false, error: 'Sipariş numarası gerekli.' }, { status: 400 });
  const r = await refundOrder(cfg, orderNo);
  return NextResponse.json(r, { status: r.ok ? 200 : 502 });
}
