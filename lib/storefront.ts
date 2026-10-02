import { supabase } from './supabase';

/**
 * Vitrin ayarları (site_content, key = 'storefront'): yorumlar, ilgili ürünler, sepet çapraz satış,
 * ücretsiz kargo çubuğu, son baktıkların, stok haberi, favoriler, "Yeni" rozeti.
 * Kayıt yoksa ya da bozuksa varsayılanlar geçerlidir; bu dosya hem sunucuda hem istemcide kullanılabilir
 * (catalog.ts fs kullandığı için burada içe aktarılmaz; React hook'u useStorefront components/RecentlyViewed.tsx'te).
 */
export type Storefront = {
  reviews_on: boolean;
  related_on: boolean;
  related_title: string;
  related_count: number;
  related_mode: 'auto' | 'manual' | 'together';
  upsell_cart_on: boolean;
  upsell_title: string;
  upsell_count: number;
  ship_bar_on: boolean;
  recent_on: boolean;
  stock_alert_on: boolean;
  wishlist_on: boolean;
  badges: { new_days: number };
};

export const STOREFRONT_KEY = 'storefront';

export const STOREFRONT_DEFAULTS: Storefront = {
  reviews_on: true,
  related_on: true,
  related_title: 'Bunu da beğenebilirsin',
  related_count: 4,
  related_mode: 'auto',
  upsell_cart_on: true,
  upsell_title: 'Sepetine yakışır',
  upsell_count: 3,
  ship_bar_on: true,
  recent_on: true,
  stock_alert_on: true,
  wishlist_on: true,
  badges: { new_days: 14 },
};

const bool = (v: unknown, d: boolean) => (typeof v === 'boolean' ? v : d);
const int = (v: unknown, d: number, min: number, max: number) => {
  const n = typeof v === 'number' ? v : typeof v === 'string' && v.trim() !== '' ? Number(v) : NaN;
  return Number.isFinite(n) ? Math.min(max, Math.max(min, Math.round(n))) : d;
};
const str = (v: unknown, d: string) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, 60) : d);

/** Bozuk / eksik değerleri varsayılana çeker; sayıları sınırlar. */
export function toStorefront(v: unknown): Storefront {
  const o = v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
  const d = STOREFRONT_DEFAULTS;
  const b = o.badges && typeof o.badges === 'object' ? (o.badges as Record<string, unknown>) : {};
  return {
    reviews_on: bool(o.reviews_on, d.reviews_on),
    related_on: bool(o.related_on, d.related_on),
    related_title: str(o.related_title, d.related_title),
    related_count: int(o.related_count, d.related_count, 1, 8),
    related_mode: o.related_mode === 'manual' ? 'manual' : o.related_mode === 'together' ? 'together' : 'auto',
    upsell_cart_on: bool(o.upsell_cart_on, d.upsell_cart_on),
    upsell_title: str(o.upsell_title, d.upsell_title),
    upsell_count: int(o.upsell_count, d.upsell_count, 1, 6),
    ship_bar_on: bool(o.ship_bar_on, d.ship_bar_on),
    recent_on: bool(o.recent_on, d.recent_on),
    stock_alert_on: bool(o.stock_alert_on, d.stock_alert_on),
    wishlist_on: bool(o.wishlist_on, d.wishlist_on),
    badges: { new_days: int(b.new_days, d.badges.new_days, 0, 365) },
  };
}

/** Sunucu: ayarları anon anahtarla okur (60 sn önbellek, panelden kaydedilince 'catalog' etiketiyle yenilenir). */
export async function getStorefront(): Promise<Storefront> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return STOREFRONT_DEFAULTS;
  try {
    const r = await fetch(`${url}/rest/v1/site_content?select=value&key=eq.${STOREFRONT_KEY}`, {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
      next: { revalidate: 60, tags: ['catalog'] }, // lib/catalog.ts CATALOG_TAG ile aynı
      signal: AbortSignal.timeout(8000),
    });
    if (!r.ok) return STOREFRONT_DEFAULTS;
    const rows = (await r.json()) as { value: unknown }[];
    return toStorefront(rows[0]?.value);
  } catch {
    return STOREFRONT_DEFAULTS;
  }
}

/** İstemci: ayarları bir kez çeker (sayfa ömrü boyunca paylaşılır). Hata olursa varsayılanlar. */
let pending: Promise<Storefront> | null = null;
export function fetchStorefront(fresh = false): Promise<Storefront> {
  if (!pending || fresh) {
    pending = (async () => {
      try {
        const { data, error } = await supabase().from('site_content').select('value').eq('key', STOREFRONT_KEY).maybeSingle();
        return error ? STOREFRONT_DEFAULTS : toStorefront(data?.value);
      } catch {
        return STOREFRONT_DEFAULTS;
      }
    })();
  }
  return pending;
}

// ── Son baktığın ürünler (yalnızca tarayıcıda) ────────────────────────
export const RECENT_KEY = 'demleme-recent';
export const RECENT_MAX = 12;

export function readRecent(): string[] {
  try {
    const raw = JSON.parse(localStorage.getItem(RECENT_KEY) || '[]');
    return Array.isArray(raw) ? raw.filter((x): x is string => typeof x === 'string' && x !== '').slice(0, RECENT_MAX) : [];
  } catch {
    return [];
  }
}

export function pushRecent(slug: string) {
  try {
    const next = [slug, ...readRecent().filter((s) => s !== slug)].slice(0, RECENT_MAX);
    localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch {
    /* depolama kapalıysa sorun değil */
  }
}
