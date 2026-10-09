import { NextResponse } from 'next/server';
import { serviceClient } from '@/lib/notify';
import { paynCfg, reconcilePending } from '@/lib/paynkolay';

export const dynamic = 'force-dynamic';

// Vercel Cron (günlük): 2 saatten eski, ödenmemiş KART siparişlerini iptal eder (stok geri döner).
// Önce Paynkolay'daki bekleyen ödemeler eşitlenir (webhook olmadığı için tarayıcısı kapanan müşterinin ödemesi burada yakalanır).
// İnceleme (review) durumundaki ödemesi olan siparişlere dokunmaz. Yetki: CRON_SECRET (Vercel otomatik gönderir).
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) return NextResponse.json({ ok: false }, { status: 401 });
  const sb = serviceClient();
  if (!sb) return NextResponse.json({ ok: false, error: 'service role yok' }, { status: 503 });
  const cfg = paynCfg();
  if (cfg) await reconcilePending(cfg, sb).catch(() => {});
  const before = new Date(Date.now() - 2 * 3600 * 1000).toISOString();
  const { data: stale } = await sb.from('orders').select('order_no').eq('payment_method', 'kart').eq('status', 'odeme_bekleniyor').lt('created_at', before).limit(200);
  const nos = (stale ?? []).map((o) => o.order_no as string);
  if (!nos.length) return NextResponse.json({ ok: true, cancelled: 0 });
  const { data: busy } = await sb.from('payments').select('order_no').in('order_no', nos).in('status', ['review', 'paid']);
  const skip = new Set((busy ?? []).map((p) => p.order_no as string));
  const todo = nos.filter((n) => !skip.has(n));
  if (todo.length) await sb.from('orders').update({ status: 'iptal' }).in('order_no', todo);
  return NextResponse.json({ ok: true, cancelled: todo.length });
}
