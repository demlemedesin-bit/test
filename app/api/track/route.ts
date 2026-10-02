import { logEvent, isBot } from '@/lib/track';

const KEYS = ['type', 'sid', 'link_code', 'source', 'medium', 'campaign', 'term', 'content', 'path', 'referrer', 'order_no'];

// Tarayıcıdaki track.js buraya olay yollar (ziyaret, sepete ekleme, sipariş). Anon anahtarla RPC'yi çağırır.
export async function POST(req: Request) {
  if (isBot(req.headers.get('user-agent'))) return new Response(null, { status: 204 });
  let b: Record<string, unknown> = {};
  try {
    b = JSON.parse(await req.text());
  } catch {
    return new Response(null, { status: 400 });
  }
  const p: Record<string, string> = {};
  for (const k of KEYS) if (typeof b[k] === 'string') p[k] = (b[k] as string).slice(0, 200);
  await logEvent(p);
  return new Response(null, { status: 204 });
}
