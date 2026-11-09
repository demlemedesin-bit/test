import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { checkPass, PASS_COOKIE } from '@/lib/maintenancePass';

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

/**
 * Bakım modu (Yönetim → Ayarlar). Açıkken panel, giriş ve api dışındaki tüm sayfalar
 * sunucuda 503 (panele girmiş personel imzalı çerezle siteyi görür) + "Demleniyor" ekranıyla yanıtlanır; gerçek sayfa hiç üretilmez.
 * Ayar bellekte 15 sn tutulur. Okunamazsa site açık kalır.
 */
let mt: { at: number; on: boolean } | null = null;
async function maintenanceOn(): Promise<boolean> {
  if (mt && Date.now() - mt.at < 15_000) return mt.on;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return false;
  try {
    const r = await fetch(`${url}/rest/v1/shop_settings?select=value&key=eq.maintenance`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
      cache: 'no-store',
      signal: AbortSignal.timeout(2000),
    });
    if (!r.ok) throw new Error(String(r.status));
    const rows = (await r.json()) as { value: string }[];
    mt = { at: Date.now(), on: String(rows[0]?.value ?? '') === '1' };
  } catch {
    mt = { at: Date.now() - 10_000, on: mt?.on ?? false };
  }
  return mt.on;
}

const PAGE = `<!doctype html><html lang="tr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Demleniyor…</title><style>
html,body{height:100%;margin:0}body{display:flex;align-items:center;justify-content:center;background:#F8F4EA;color:#3a2a1c;font-family:Kodchasan,system-ui,sans-serif;text-align:center}
.w{display:flex;flex-direction:column;align-items:center;gap:18px;padding:24px}svg{width:112px;height:112px;animation:b 2.4s ease-in-out infinite}
.s{fill:none;stroke:currentColor;stroke-width:5;stroke-linecap:round;opacity:0;animation:s 2.4s ease-in-out infinite}.s2{animation-delay:.4s}.s3{animation-delay:.8s}
p{margin:0;font-size:28px;letter-spacing:.02em}i{font-style:normal;opacity:.2;animation:d 1.2s infinite}i:nth-child(2){animation-delay:.2s}i:nth-child(3){animation-delay:.4s}
@keyframes s{0%{opacity:0;transform:translateY(10px)}40%{opacity:.8}100%{opacity:0;transform:translateY(-8px)}}@keyframes b{50%{transform:translateY(-4px)}}@keyframes d{50%{opacity:1}}
@media(prefers-reduced-motion:reduce){svg,.s,i{animation:none}.s{opacity:.6}i{opacity:1}}
</style></head><body><div class="w"><svg viewBox="0 0 120 120" aria-hidden="true"><path class="s" d="M44 40c-6-8 6-12 0-22"/><path class="s s2" d="M60 40c-6-8 6-12 0-22"/><path class="s s3" d="M76 40c-6-8 6-12 0-22"/><path d="M26 52h68v14a34 34 0 0 1-34 34 34 34 0 0 1-34-34z" fill="currentColor"/><path d="M94 58h6a10 10 0 0 1 0 20h-9" fill="none" stroke="currentColor" stroke-width="6" stroke-linecap="round"/><rect x="30" y="106" width="60" height="6" rx="3" fill="currentColor" opacity=".35"/></svg><p>Demleniyor<i>.</i><i>.</i><i>.</i></p></div></body></html>`;

export async function proxy(req: NextRequest) {
  try {
    const p = req.nextUrl.pathname;
    if (!p.startsWith('/giris') && !checkPass(req.cookies.get(PASS_COOKIE)?.value) && (await maintenanceOn())) {
      return new NextResponse(PAGE, {
        status: 503,
        headers: { 'content-type': 'text/html; charset=utf-8', 'retry-after': '300', 'cache-control': 'no-store', 'x-robots-tag': 'noindex' },
      });
    }
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
