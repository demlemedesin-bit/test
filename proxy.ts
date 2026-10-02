import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Yönlendirmeler (redirects tablosu, panelde Sayfa, blog, yönlendirme → Yönlendirmeler).
 * Liste anon anahtarla çekilir ve bellekte 60 sn tutulur. Hata olursa istek olduğu gibi devam eder; site asla bozulmaz.
 */
type Rule = { to: string; permanent: boolean };

const TTL = 60_000;
const RETRY = 15_000;
let cache: { at: number; map: Map<string, Rule> } | null = null;
let inflight: Promise<Map<string, Rule>> | null = null;

const norm = (p: string) => (p.length > 1 ? p.replace(/\/+$/, '') || '/' : p);

// Hedef: site içi yol ("/…", "//" ve "/\" hariç) ya da mutlak http(s) adres
const okTarget = (t: string) => (/^\/(?![/\\])/.test(t) && !/\s/.test(t)) || /^https?:\/\/[^\s]+$/i.test(t);

async function load(): Promise<Map<string, Rule>> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const stale = cache?.map ?? new Map<string, Rule>();
  if (!url || !key) return stale;
  try {
    const r = await fetch(`${url}/rest/v1/redirects?select=from_path,to_path,permanent&active=eq.true&limit=2000`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(2500),
    });
    if (!r.ok) throw new Error(String(r.status));
    const rows = (await r.json()) as { from_path: string; to_path: string; permanent: boolean }[];
    const map = new Map<string, Rule>();
    for (const x of rows) {
      if (typeof x.from_path === 'string' && typeof x.to_path === 'string' && x.from_path.startsWith('/') && okTarget(x.to_path.trim())) {
        map.set(norm(x.from_path.trim()), { to: x.to_path.trim(), permanent: x.permanent !== false });
      }
    }
    cache = { at: Date.now(), map };
    return map;
  } catch {
    // Hata: eski liste (varsa) kullanılır, kısa süre sonra yeniden denenir
    cache = { at: Date.now() - TTL + RETRY, map: stale };
    return stale;
  }
}

async function rules(): Promise<Map<string, Rule>> {
  if (cache && Date.now() - cache.at < TTL) return cache.map;
  inflight ??= load().finally(() => {
    inflight = null;
  });
  return inflight;
}

export async function proxy(req: NextRequest) {
  try {
    const map = await rules();
    if (map.size === 0) return NextResponse.next();
    const here = norm(req.nextUrl.pathname);

    // Zinciri sonuna kadar izle (en çok 5 adım); döngü ya da kendine dönüş varsa yönlendirme yapma
    let rule = map.get(here);
    if (!rule) return NextResponse.next();
    const seen = new Set([here]);
    let final = rule;
    for (let i = 0; i < 5; i++) {
      if (!final.to.startsWith('/')) break;
      const next = norm(final.to.split(/[?#]/)[0]);
      if (seen.has(next)) return NextResponse.next();
      seen.add(next);
      const r2 = map.get(next);
      if (!r2) break;
      final = r2;
    }
    rule = final;

    const dest = rule.to.startsWith('/') ? new URL(rule.to, req.url) : new URL(rule.to);
    if (!dest.search && rule.to.startsWith('/')) dest.search = req.nextUrl.search; // sorgu dizesi (utm vb.) korunur
    if (dest.origin === req.nextUrl.origin && norm(dest.pathname) === here && dest.search === req.nextUrl.search) return NextResponse.next();
    return NextResponse.redirect(dest, rule.permanent ? 301 : 302);
  } catch {
    return NextResponse.next();
  }
}

// Yalnızca sayfa istekleri: _next, api, /admin ve dosya uzantılı (statik) yollar hariç
export const config = {
  matcher: ['/((?!_next/|api/|admin|.*\\..*).*)'],
};
