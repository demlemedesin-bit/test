import { NextResponse } from 'next/server';
import { timingSafeEqual } from 'node:crypto';
import { pushNewOrder } from '@/lib/push';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const same = (a: string, b: string) => a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));

// Veritabanındaki tetikleyici (yeni havale / kapıda ödeme siparişi) bu adresi gizli anahtarla çağırır.
export async function POST(req: Request) {
  const secret = process.env.PUSH_SECRET || '';
  const got = req.headers.get('x-push-secret') || '';
  if (!secret || !same(secret, got)) return NextResponse.json({ ok: false }, { status: 401 });
  let no = '';
  try {
    const b = (await req.json()) as { order_no?: unknown };
    no = typeof b.order_no === 'string' ? b.order_no.trim().slice(0, 40) : '';
  } catch {
    /* boş */
  }
  if (!no) return NextResponse.json({ ok: false, error: 'order_no gerekli' }, { status: 400 });
  return NextResponse.json({ ok: true, ...(await pushNewOrder(no)) }, { headers: { 'Cache-Control': 'no-store' } });
}
