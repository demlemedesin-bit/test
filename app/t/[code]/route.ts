import { NextResponse } from 'next/server';
import { isBot, logEvent } from '@/lib/track';

type Link = { code: string; dest: string; utm_source: string; utm_medium: string; utm_campaign: string; utm_term: string; utm_content: string };

// Kısa takip linki: /t/<kod> → tıklamayı kaydeder, UTM'li hedefe yönlendirir.
export async function GET(req: Request, ctx: { params: Promise<{ code: string }> }) {
  const { code } = await ctx.params;
  const origin = new URL(req.url).origin;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  let link: Link | null = null;
  if (url && key && /^[a-z0-9-]{2,40}$/.test(code)) {
    try {
      const r = await fetch(`${url}/rest/v1/track_links?code=eq.${code}&active=eq.true&select=*&limit=1`, {
        headers: { apikey: key, Authorization: `Bearer ${key}` },
        cache: 'no-store',
        signal: AbortSignal.timeout(5000),
      });
      if (r.ok) link = ((await r.json()) as Link[])[0] ?? null;
    } catch {
      /* bulunamadı say */
    }
  }
  if (!link) return NextResponse.redirect(new URL('/', origin), 302);

  // Hedef yalnızca site içi yol olabilir (açık yönlendirme istismarını önler)
  const dest = new URL(link.dest.startsWith('/') && !link.dest.startsWith('//') ? link.dest : '/', origin);
  const sid = Math.random().toString(36).slice(2, 12) + Date.now().toString(36);
  const set = (k: string, v: string) => v && dest.searchParams.set(k, v);
  set('utm_source', link.utm_source);
  set('utm_medium', link.utm_medium);
  set('utm_campaign', link.utm_campaign);
  set('utm_term', link.utm_term);
  set('utm_content', link.utm_content);
  set('tl', link.code);
  set('dmsid', sid);

  if (!isBot(req.headers.get('user-agent'))) {
    await logEvent({
      type: 'click',
      sid,
      link_code: link.code,
      source: link.utm_source,
      medium: link.utm_medium,
      campaign: link.utm_campaign,
      term: link.utm_term,
      content: link.utm_content,
      path: dest.pathname,
      referrer: (req.headers.get('referer') || '').slice(0, 200),
    });
  }
  const res = NextResponse.redirect(dest, 302);
  res.headers.set('Cache-Control', 'no-store');
  return res;
}
