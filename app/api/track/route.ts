import { logEvent, isBot } from '@/lib/track';

const KEYS = ['type', 'sid', 'link_code', 'source', 'medium', 'campaign', 'term', 'content', 'path', 'referrer', 'order_no', 'product', 'rec'];

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
  // Meta Conversion API (isteğe bağlı): tarayıcı Pixel ile aynı eventID (sipariş no) → Meta çift saymaz
  if (p.type === 'order' && p.order_no && process.env.META_CAPI_TOKEN) {
    try {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      const r = url && key ? await fetch(`${url}/rest/v1/site_content?select=value&key=eq.ads`, { headers: { apikey: key, Authorization: `Bearer ${key}` }, cache: 'no-store', signal: AbortSignal.timeout(3000) }) : null;
      const pixel = String(((await r?.json()) as { value?: { meta_pixel?: string } }[] | undefined)?.[0]?.value?.meta_pixel ?? '').trim();
      const value = Number(b.value);
      if (/^\d{8,20}$/.test(pixel)) {
        await fetch(`https://graph.facebook.com/v19.0/${pixel}/events?access_token=${encodeURIComponent(process.env.META_CAPI_TOKEN)}`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ data: [{ event_name: 'Purchase', event_time: Math.floor(Date.now() / 1000), event_id: p.order_no, action_source: 'website', event_source_url: String(b.url ?? '').slice(0, 300) || undefined,
            user_data: { client_user_agent: req.headers.get('user-agent') ?? '', client_ip_address: (req.headers.get('x-forwarded-for') ?? '').split(',')[0].trim() || undefined },
            custom_data: { currency: 'TRY', value: isFinite(value) ? value : 0, order_id: p.order_no } }] }),
          signal: AbortSignal.timeout(4000),
        });
      }
    } catch {
      /* CAPI hatası siparişi etkilemez */
    }
  }
  return new Response(null, { status: 204 });
}
