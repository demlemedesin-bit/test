import { NextResponse } from 'next/server';
import { notifyOrder, serviceClient } from '@/lib/notify';
import { credsFor, isDelivered, parseTracking, trackShipment } from '@/lib/hepsijet';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const LIMIT = 40;

// Vercel Cron: kargoda olan canlı HepsiJET gönderilerinin durumunu sorgular; teslim edilenleri
// "Teslim edildi"ye çeker ve müşteriye teslim bildirimini gönderir. Yetki: CRON_SECRET.
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) return NextResponse.json({ ok: false }, { status: 401 });
  const sb = serviceClient();
  if (!sb) return NextResponse.json({ ok: false, error: 'service role yok' }, { status: 503 });
  if (!credsFor('prod')) return NextResponse.json({ ok: true, skipped: 'kimlik yok' });

  const { data, error } = await sb
    .from('hepsijet_shipments')
    .select('order_no, barcode, orders!inner(status)')
    .eq('env', 'prod')
    .eq('status', 'olusturuldu')
    .eq('orders.status', 'kargoda')
    .order('updated_at', { ascending: true })
    .limit(LIMIT);
  if (error) return NextResponse.json({ ok: false, error: error.message.slice(0, 200) }, { status: 500 });

  let checked = 0;
  let delivered = 0;
  for (const s of (data ?? []) as { order_no: string; barcode: string }[]) {
    try {
      const r = await trackShipment('prod', s.barcode);
      if (!r.ok) continue;
      checked++;
      const t = parseTracking(r.json);
      const now = new Date().toISOString();
      await sb.from('hepsijet_shipments').update({ last_status: t.last || 'OK', last_checked_at: now, updated_at: now }).eq('order_no', s.order_no);
      if (isDelivered(t.last)) {
        const { data: up } = await sb.from('orders').update({ status: 'teslim_edildi' }).eq('order_no', s.order_no).eq('status', 'kargoda').select('order_no');
        if (up && up.length) {
          delivered++;
          await notifyOrder('order_delivered', s.order_no);
        }
      }
    } catch {
      /* bir gönderi hata verirse diğerlerine devam */
    }
  }
  return NextResponse.json({ ok: true, checked, delivered });
}
