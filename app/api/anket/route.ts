import { createHash } from 'crypto';

// Ayın demleyenleri anketi: GET = sonuçlar, POST = oy ver (anon anahtarla RPC; tarayıcı başına 1 oy, IP başına en çok 5).
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

async function rpc(fn: string, body: Record<string, unknown>) {
  if (!url || !key) return null;
  try {
    const r = await fetch(`${url}/rest/v1/rpc/${fn}`, {
      method: 'POST',
      headers: { apikey: key, Authorization: `Bearer ${key}`, 'content-type': 'application/json' },
      body: JSON.stringify(body),
      cache: 'no-store',
      signal: AbortSignal.timeout(4000),
    });
    return r.ok ? await r.json() : null;
  } catch {
    return null;
  }
}

const json = (d: unknown, status = 200) => new Response(JSON.stringify(d), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });

export async function GET(req: Request) {
  const month = (new URL(req.url).searchParams.get('month') ?? '').slice(0, 40);
  if (!month) return json({}, 400);
  return json((await rpc('demleyen_oy_sonuc', { p_month: month })) ?? {});
}

export async function POST(req: Request) {
  let b: { month?: unknown; voter?: unknown; photo?: unknown } = {};
  try {
    b = JSON.parse(await req.text());
  } catch {
    return json({ ok: false }, 400);
  }
  const month = String(b.month ?? '').slice(0, 40), voter = String(b.voter ?? '').slice(0, 64), photo = String(b.photo ?? '').slice(0, 80);
  if (!month || voter.length < 8 || !photo) return json({ ok: false }, 400);
  const ip = (req.headers.get('x-forwarded-for') ?? '').split(',')[0].trim();
  const ipHash = ip ? createHash('sha256').update(ip + month).digest('hex').slice(0, 24) : '';
  const ok = await rpc('demleyen_oy_ver', { p_month: month, p_voter: voter, p_photo: photo, p_ip: ipHash });
  if (ok !== true) return json({ ok: false }, 429);
  return json({ ok: true, results: (await rpc('demleyen_oy_sonuc', { p_month: month })) ?? {} });
}
