const BOT = /bot|crawl|spider|slurp|preview|facebookexternalhit|whatsapp|telegram|headless|lighthouse|pingdom|uptime/i;
export const isBot = (ua: string | null) => !ua || BOT.test(ua);

export async function logEvent(p: Record<string, unknown>): Promise<void> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return;
  try {
    await fetch(`${url}/rest/v1/rpc/track_event`, {
      method: 'POST',
      headers: { apikey: key, Authorization: `Bearer ${key}`, 'content-type': 'application/json' },
      body: JSON.stringify({ p }),
      cache: 'no-store',
      signal: AbortSignal.timeout(3000),
    });
  } catch {
    /* takip hatası kullanıcıyı etkilememeli */
  }
}
