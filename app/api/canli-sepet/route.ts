import { NextResponse } from 'next/server';
import { serviceClient } from '@/lib/notify';
import { clientIp } from '@/lib/paynkolay';

export const dynamic = 'force-dynamic';

// Anonim "canlı sepet" sayacı: kişisel veri yok. Yalnızca rastgele oturum kodu ve ürün adedi tutulur.
const hits = new Map<string, { n: number; t: number }>();
function limited(ip: string) {
  const now = Date.now();
  const h = hits.get(ip);
  if (!h || now - h.t > 60000) {
    hits.set(ip, { n: 1, t: now });
    return false;
  }
  h.n += 1;
  return h.n > 20;
}

export async function POST(req: Request) {
  if (limited(clientIp(req))) return NextResponse.json({ ok: false }, { status: 429 });
  let b: { sid?: unknown; qty?: unknown } = {};
  try {
    b = await req.json();
  } catch {
    /* boş */
  }
  const sid = typeof b.sid === 'string' ? b.sid : '';
  const qty = Math.floor(Number(b.qty));
  if (!/^[a-z0-9]{10,40}$/.test(sid) || !Number.isFinite(qty) || qty < 0 || qty > 999) return NextResponse.json({ ok: false }, { status: 400 });
  const sb = serviceClient();
  if (!sb) return NextResponse.json({ ok: false }, { status: 503 });
  if (qty === 0) await sb.from('live_carts').delete().eq('sid', sid);
  else await sb.from('live_carts').upsert({ sid, qty, updated_at: new Date().toISOString() });
  if (Math.random() < 0.02) await sb.from('live_carts').delete().lt('updated_at', new Date(Date.now() - 24 * 3600 * 1000).toISOString());
  return NextResponse.json({ ok: true });
}
