import fs from 'node:fs';
import path from 'node:path';
import { saleOf } from './sale';

/**
 * Ürün ve ayarların tek kaynağı Supabase'tir (yönetim panelinden düzenlenir).
 * Okuma anon anahtarla yapılır, 60 sn önbelleğe alınır ve panelden kaydedilince anında yenilenir.
 * Veritabanına ulaşılamazsa (ya da şema henüz güncel değilse) content/ altındaki dosyalara düşülür, site kapanmaz.
 */

export const CATALOG_TAG = 'catalog';

export type Color = { key: string; name: string; hex?: string; img?: string; imgs?: string[] };
export type SizeBlock = { label: string; items: string[][]; pick?: boolean };
export type SiteProduct = {
  slug: string;
  name: string;
  cat: string;
  shopCat: 'sofra' | 'giyim' | 'aksesuar';
  price: string; // "₺2.400"
  priceNum: number;
  was?: string; // süreli kampanyada eski fiyat
  saleEnds?: string; // kampanya bitişi (ISO)
  salePct?: number; // indirim yüzdesi
  left?: number; // az kalan stok adedi
  desc: string;
  badge?: string;
  soon: boolean;
  out: boolean; // stok bitti
  thumb: string;
  gallery?: string[];
  episode?: { title: string; url: string };
  colors: Color[];
  sizes?: SizeBlock;
  chart?: unknown;
  details: string[][];
  sort: number;
  seoTitle?: string;
  seoDesc?: string;
};

type Row = {
  slug: string;
  name: string;
  category: string;
  price: number | string;
  colors: Color[];
  sizes: string[] | null;
  soon: boolean;
  active: boolean;
  data?: { gallery?: string[]; episode_title?: string; episode_url?: string; seo_title?: string; seo_desc?: string; desc?: string; badge?: string; chart?: unknown; details?: string[][]; sizes?: SizeBlock; size_label?: string };
  shop_cat?: SiteProduct['shopCat'];
  thumb?: string | null;
  stock?: number | null;
  sort?: number;
};

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const tlStr = (n: number) => '₺' + n.toLocaleString('tr-TR', { minimumFractionDigits: Number.isInteger(n) ? 0 : 2, maximumFractionDigits: 2 });

export async function rest<T>(query: string): Promise<T | null> {
  if (!SUPABASE_URL || !SUPABASE_KEY) return null;
  try {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/${query}`, {
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` },
      next: { revalidate: 60, tags: [CATALOG_TAG] },
      signal: AbortSignal.timeout(8000),
    });
    return r.ok ? ((await r.json()) as T) : null;
  } catch {
    return null;
  }
}

function fromRow(r: Row): SiteProduct {
  const d = r.data ?? {};
  const base = Number(r.price);
  const sl = saleOf(base, d);
  const onSale = sl.on;
  const price = sl.price;
  const crit = Number((d as { crit?: number }).crit) > 0 ? Number((d as { crit?: number }).crit) : 5;
  const sizes: SizeBlock | undefined = r.sizes?.length
    ? { label: d.size_label || 'Beden', items: r.sizes.map((s) => [s, '']), pick: true }
    : d.sizes;
  return {
    slug: r.slug,
    name: r.name,
    cat: r.category,
    shopCat: r.shop_cat ?? 'sofra',
    price: tlStr(price),
    priceNum: price,
    ...(onSale ? { was: tlStr(base), saleEnds: sl.ends, salePct: sl.pct } : {}),
    ...(r.stock != null && r.stock > 0 && r.stock <= crit ? { left: r.stock } : {}),
    desc: d.desc ?? '',
    badge: d.badge || undefined,
    soon: !!r.soon,
    out: r.stock != null && r.stock <= 0,
    thumb: r.thumb || r.colors?.[0]?.img || '',
    colors: r.colors ?? [],
    ...(d.episode_title?.trim() && /^https?:\/\//i.test(d.episode_url ?? '') ? { episode: { title: d.episode_title.trim().slice(0, 140), url: (d.episode_url as string).trim() } } : {}),
    ...(Array.isArray(d.gallery) && d.gallery.length ? { gallery: d.gallery.filter((g) => typeof g === 'string').slice(0, 10) } : {}),
    sizes,
    chart: d.chart,
    details: d.details ?? [],
    sort: r.sort ?? 0,
    seoTitle: d.seo_title?.trim() || undefined,
    seoDesc: d.seo_desc?.trim() || undefined,
  };
}

type JsonProduct = Omit<SiteProduct, 'priceNum' | 'out' | 'sizes' | 'soon'> & { sizes?: SizeBlock; soon?: boolean };

function fromFiles(): SiteProduct[] {
  const raw = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'content', 'products.json'), 'utf-8')) as JsonProduct[];
  return raw.map((p) => ({ ...p, soon: !!p.soon, out: false, priceNum: Number(String(p.price).replace(/\./g, '').replace(/[^\d]/g, '')) }));
}

/** Satıştaki (aktif) ürünler, sıraya göre. */
export async function getProducts(): Promise<SiteProduct[]> {
  const rows = await rest<Row[]>('products?select=*&active=eq.true&order=sort.asc');
  if (rows && rows.length) return rows.map(fromRow);
  return fromFiles();
}

export async function getProduct(slug: string): Promise<SiteProduct | null> {
  return (await getProducts()).find((p) => p.slug === slug) ?? null;
}

// ── Ayarlar ───────────────────────────────────────────────────────────
export type ShopConfig = {
  contactEmail: string;
  seller: { name: string; address: string; taxOffice: string; taxNo: string; mersis: string; phone: string };
  bank: { holder: string; bankName: string; iban: string };
  freeFrom: number;
  fee: number;
};

export function configFromMap(m: Record<string, string | number | null | undefined>): ShopConfig {
  const f = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'content', 'shop-config.json'), 'utf-8')) as {
    contactEmail: string;
    seller: ShopConfig['seller'];
    bank: ShopConfig['bank'];
  };
  const s = (k: string, d: string) => (m[k] != null && String(m[k]).trim() !== '' ? String(m[k]).trim() : d);
  const n = (k: string, d: number) => (m[k] != null && String(m[k]).trim() !== '' && !isNaN(Number(m[k])) ? Number(m[k]) : d);
  return {
    contactEmail: s('contact_email', f.contactEmail),
    seller: {
      name: s('seller_name', f.seller.name),
      address: s('seller_address', f.seller.address),
      taxOffice: s('seller_tax_office', f.seller.taxOffice),
      taxNo: s('seller_tax_no', f.seller.taxNo),
      mersis: s('seller_mersis', f.seller.mersis),
      phone: s('seller_phone', f.seller.phone),
    },
    bank: { holder: s('bank_holder', f.bank.holder), bankName: s('bank_name', f.bank.bankName), iban: s('bank_iban', f.bank.iban) },
    freeFrom: n('free_shipping_threshold', 750),
    fee: n('shipping_fee', 59.9),
  };
}

export async function getConfig(): Promise<ShopConfig> {
  const rows = await rest<{ key: string; value: string | number }[]>('shop_settings?select=key,value');
  return configFromMap(Object.fromEntries((rows ?? []).map((r) => [r.key, r.value])));
}
