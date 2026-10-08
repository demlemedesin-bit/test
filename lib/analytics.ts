'use client';
import { supabase } from './supabase';
import type { AdminOrder, AdminProduct } from './admin';

export type Ev = { d: string; type: string; product: string; rec: string; n: number; s: number; v: number };
export type Ret = { id: string; order_no: string; product_slug: string; qty: number; amount: number; kind: 'iade' | 'degisim'; reason: string; status: string; note: string | null; customer_note?: string | null; source?: string; created_at: string };
export type Data = { orders: AdminOrder[]; products: AdminProduct[]; events: Ev[]; returns: Ret[] };

export const DAY = 86400000;
export const startOfDay = (d = new Date()) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
export const ymd = (t: number) => {
  const d = new Date(t);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export async function loadData(): Promise<Data> {
  const sb = supabase();
  const from = new Date(Date.now() - 400 * DAY).toISOString();
  const [o, p, e, r] = await Promise.all([
    sb.from('orders').select('*').gte('created_at', from).order('created_at', { ascending: false }).limit(5000),
    sb.from('products').select('*').order('sort'),
    sb.rpc('events_agg', { p_from: from }),
    sb.from('returns').select('*').order('created_at', { ascending: false }).limit(5000),
  ]);
  return {
    orders: (o.data ?? []) as AdminOrder[],
    products: (p.data ?? []) as AdminProduct[],
    events: Array.isArray(e.data) ? (e.data as Ev[]).map((x) => ({ ...x, n: +x.n, s: +x.s, v: +x.v })) : [],
    returns: ((r.data ?? []) as Ret[]).map((x) => ({ ...x, amount: +x.amount })),
  };
}

export type Range = { from: number; to: number };
export const PERIODS: { key: string; label: string; cur: () => Range; prev?: () => Range }[] = [
  { key: 'bugun', label: 'Bugün', cur: () => ({ from: startOfDay(), to: startOfDay() + DAY }), prev: () => ({ from: startOfDay() - DAY, to: startOfDay() }) },
  { key: 'dun', label: 'Dün', cur: () => ({ from: startOfDay() - DAY, to: startOfDay() }), prev: () => ({ from: startOfDay() - 2 * DAY, to: startOfDay() - DAY }) },
  { key: '7', label: 'Son 7 gün', cur: () => ({ from: startOfDay() - 6 * DAY, to: startOfDay() + DAY }), prev: () => ({ from: startOfDay() - 13 * DAY, to: startOfDay() - 6 * DAY }) },
  { key: 'o7', label: 'Önceki 7 gün', cur: () => ({ from: startOfDay() - 13 * DAY, to: startOfDay() - 6 * DAY }), prev: () => ({ from: startOfDay() - 20 * DAY, to: startOfDay() - 13 * DAY }) },
  { key: '30', label: 'Son 30 gün', cur: () => ({ from: startOfDay() - 29 * DAY, to: startOfDay() + DAY }), prev: () => ({ from: startOfDay() - 59 * DAY, to: startOfDay() - 29 * DAY }) },
  { key: 'o30', label: 'Önceki 30 gün', cur: () => ({ from: startOfDay() - 59 * DAY, to: startOfDay() - 29 * DAY }), prev: () => ({ from: startOfDay() - 89 * DAY, to: startOfDay() - 59 * DAY }) },
  { key: 'yil', label: 'Geçen yıl aynı dönem (30 gün)', cur: () => ({ from: startOfDay() - 365 * DAY - 29 * DAY, to: startOfDay() - 365 * DAY + DAY }), prev: () => ({ from: startOfDay() - 29 * DAY, to: startOfDay() + DAY }) },
];

export const live = (o: AdminOrder) => o.status !== 'iptal';
const ts = (o: { created_at: string }) => new Date(o.created_at).getTime();
export const ordersIn = (d: Data, r: Range) => d.orders.filter((o) => live(o) && ts(o) >= r.from && ts(o) < r.to);
const evIn = (d: Data, r: Range, type: string, f?: (e: Ev) => boolean) =>
  d.events.filter((e) => e.type === type && new Date(e.d + 'T00:00:00').getTime() >= r.from && new Date(e.d + 'T00:00:00').getTime() < r.to && (!f || f(e)));
const sumS = (l: Ev[]) => l.reduce((n, e) => n + e.s, 0);
const sumN = (l: Ev[]) => l.reduce((n, e) => n + e.n, 0);

/** Müşterinin ilk sipariş zamanı (e-posta bazlı) — yeni/tekrar ayrımı için */
export function firstOrderMap(d: Data): Map<string, number> {
  const m = new Map<string, number>();
  for (const o of d.orders) if (live(o)) {
    const k = o.email.toLowerCase();
    const t = ts(o);
    if (!m.has(k) || t < m.get(k)!) m.set(k, t);
  }
  return m;
}

export function kpis(d: Data, r: Range) {
  const os = ordersIn(d, r);
  const revenue = os.reduce((n, o) => n + Number(o.total), 0);
  const visitors = sumS(evIn(d, r, 'view'));
  const carts = sumS(evIn(d, r, 'add_to_cart'));
  const checkout = sumS(evIn(d, r, 'begin_checkout'));
  const first = firstOrderMap(d);
  const emails = new Set(os.map((o) => o.email.toLowerCase()));
  let fresh = 0;
  emails.forEach((e) => { if ((first.get(e) ?? 0) >= r.from) fresh++; });
  const retAmt = d.returns.filter((x) => x.kind === 'iade' && x.status !== 'red' && ts(x) >= r.from && ts(x) < r.to).reduce((n, x) => n + x.amount, 0);
  const unitsSold = os.reduce((n, o) => n + o.items.reduce((a, i) => a + i.qty, 0), 0);
  return {
    revenue,
    orders: os.length,
    aov: os.length ? revenue / os.length : 0,
    visitors,
    conv: visitors ? (os.length / visitors) * 100 : 0,
    cartRate: visitors ? (carts / visitors) * 100 : 0,
    checkoutRate: carts ? (checkout / carts) * 100 : 0,
    abandon: checkout ? Math.max(0, (1 - os.length / checkout) * 100) : 0,
    carts,
    checkout,
    newCust: fresh,
    repeatCust: emails.size - fresh,
    returnRate: revenue ? (retAmt / revenue) * 100 : 0,
    retAmt,
    unitsSold,
  };
}
export type Kp = ReturnType<typeof kpis>;
export const pct = (cur: number, prev: number) => (prev ? ((cur - prev) / prev) * 100 : cur ? 100 : 0);

// ── Ürün / marka ───────────────────────────────────────────────────────
export const brandOf = (p: AdminProduct) => (((p.data as { brand?: string }).brand ?? '').trim() || 'Markasız');
export type ProdRow = {
  p: AdminProduct; views: number; carts: number; cartRate: number; sold: number; revenue: number; orders: number; conv: number;
  retQty: number; retRate: number; stock: number | null; perDay: number; daysLeft: number | null; turnover: number; lastSale: number;
};
export function productPerf(d: Data, r: Range): ProdRow[] {
  const sales = new Map<string, { q: number; rev: number; o: number; last: number }>();
  for (const o of d.orders.filter(live)) for (const i of o.items) {
    const k = i.slug ?? '';
    const s = sales.get(k) ?? { q: 0, rev: 0, o: 0, last: 0 };
    s.last = Math.max(s.last, ts(o));
    if (ts(o) >= r.from && ts(o) < r.to) { s.q += i.qty; s.rev += Number(i.line_total); s.o += 1; }
    sales.set(k, s);
  }
  const rec30 = startOfDay() - 29 * DAY;
  const sold30 = new Map<string, number>();
  for (const o of d.orders.filter((x) => live(x) && ts(x) >= rec30)) for (const i of o.items) sold30.set(i.slug ?? '', (sold30.get(i.slug ?? '') ?? 0) + i.qty);
  return d.products.map((p) => {
    const s = sales.get(p.slug) ?? { q: 0, rev: 0, o: 0, last: 0 };
    const views = sumN(evIn(d, r, 'view', (e) => e.product === p.slug));
    const carts = sumN(evIn(d, r, 'add_to_cart', (e) => e.product === p.slug));
    const retQty = d.returns.filter((x) => x.product_slug === p.slug && x.status !== 'red' && ts(x) >= r.from && ts(x) < r.to).reduce((n, x) => n + x.qty, 0);
    const perDay = (sold30.get(p.slug) ?? 0) / 30;
    const stock = p.stock;
    return {
      p, views, carts, cartRate: views ? (carts / views) * 100 : 0, sold: s.q, revenue: s.rev, orders: s.o, conv: views ? (s.o / views) * 100 : 0,
      retQty, retRate: s.q ? (retQty / s.q) * 100 : 0, stock, perDay,
      daysLeft: stock != null && perDay > 0 ? Math.floor(stock / perDay) : null,
      turnover: stock ? ((sold30.get(p.slug) ?? 0) / Math.max(stock, 1)) : 0, lastSale: s.last,
    };
  });
}

export type BrandRow = { brand: string; revenue: number; orders: number; units: number; aov: number; conv: number; retRate: number; stock: number; turnover: number; views: number; carts: number };
export function brandPerf(rows: ProdRow[], d: Data, r: Range): BrandRow[] {
  const m = new Map<string, BrandRow & { _sold30: number }>();
  const slugBrand = new Map(d.products.map((p) => [p.slug, brandOf(p)]));
  const ordersByBrand = new Map<string, Set<string>>();
  for (const o of ordersIn(d, r)) for (const i of o.items) {
    const b = slugBrand.get(i.slug ?? '') ?? 'Markasız';
    (ordersByBrand.get(b) ?? ordersByBrand.set(b, new Set()).get(b)!).add(o.order_no);
  }
  const retQty = new Map<string, number>();
  for (const x of d.returns) if (x.status !== 'red' && ts(x) >= r.from && ts(x) < r.to) { const b = slugBrand.get(x.product_slug) ?? 'Markasız'; retQty.set(b, (retQty.get(b) ?? 0) + x.qty); }
  for (const x of rows) {
    const b = brandOf(x.p);
    const c = m.get(b) ?? { brand: b, revenue: 0, orders: 0, units: 0, aov: 0, conv: 0, retRate: 0, stock: 0, turnover: 0, views: 0, carts: 0, _sold30: 0 };
    c.revenue += x.revenue; c.units += x.sold; c.stock += x.stock ?? 0; c.views += x.views; c.carts += x.carts; c._sold30 += x.perDay * 30;
    m.set(b, c);
  }
  return [...m.values()].map((c) => {
    const n = ordersByBrand.get(c.brand)?.size ?? 0;
    return { ...c, orders: n, aov: n ? c.revenue / n : 0, conv: c.views ? (n / c.views) * 100 : 0, retRate: c.units ? ((retQty.get(c.brand) ?? 0) / c.units) * 100 : 0, turnover: c.stock ? c._sold30 / c.stock : 0 };
  }).sort((a, b) => b.revenue - a.revenue);
}

// ── Müşteri ────────────────────────────────────────────────────────────
export type CustRow = { email: string; name: string; orders: number; spent: number; last: number; first: number };
export function customers(d: Data): CustRow[] {
  const m = new Map<string, CustRow>();
  for (const o of d.orders.filter(live)) {
    const k = o.email.toLowerCase();
    const c = m.get(k) ?? { email: k, name: o.full_name, orders: 0, spent: 0, last: 0, first: Infinity };
    c.orders++; c.spent += Number(o.total); c.last = Math.max(c.last, ts(o)); c.first = Math.min(c.first, ts(o));
    m.set(k, c);
  }
  return [...m.values()];
}

// ── Kampanya (kupon) ───────────────────────────────────────────────────
export function campaignPerf(d: Data) {
  const first = firstOrderMap(d);
  const m = new Map<string, { code: string; orders: number; revenue: number; discount: number; fresh: number; repeat: number; t0: number; t1: number }>();
  for (const o of d.orders.filter((x) => live(x) && x.coupon_code)) {
    const k = o.coupon_code!;
    const c = m.get(k) ?? { code: k, orders: 0, revenue: 0, discount: 0, fresh: 0, repeat: 0, t0: Infinity, t1: 0 };
    c.orders++; c.revenue += Number(o.total); c.discount += Number(o.discount ?? 0);
    if ((first.get(o.email.toLowerCase()) ?? 0) === ts(o)) c.fresh++; else c.repeat++;
    c.t0 = Math.min(c.t0, ts(o)); c.t1 = Math.max(c.t1, ts(o));
    m.set(k, c);
  }
  return [...m.values()].map((c) => {
    const span = Math.max(DAY, c.t1 - c.t0 + DAY);
    const before = d.orders.filter((o) => live(o) && ts(o) >= c.t0 - span && ts(o) < c.t0).reduce((n, o) => n + Number(o.total), 0);
    const during = d.orders.filter((o) => live(o) && ts(o) >= c.t0 && ts(o) < c.t0 + span).reduce((n, o) => n + Number(o.total), 0);
    return { ...c, aov: c.orders ? c.revenue / c.orders : 0, before, during };
  }).sort((a, b) => b.revenue - a.revenue);
}

// ── Öneri performansı ──────────────────────────────────────────────────
export const REC_LABEL: Record<string, string> = { related: 'Bunu da beğenebilirsin', upsell: 'Sepette çapraz satış', recent: 'Son görüntülenenler' };
export function recPerf(d: Data, r: Range) {
  const out: { rec: string; clicks: number; carts: number; orders: number; revenue: number }[] = [];
  for (const rec of Object.keys(REC_LABEL)) {
    const f = (e: Ev) => e.rec === rec;
    out.push({
      rec, clicks: sumN(evIn(d, r, 'rec_click', f)), carts: sumN(evIn(d, r, 'add_to_cart', f)),
      orders: sumN(evIn(d, r, 'order', f)), revenue: evIn(d, r, 'order', f).reduce((n, e) => n + e.v, 0),
    });
  }
  return out;
}

// ── Ürün içerik / SEO kalitesi ─────────────────────────────────────────
type PD = { desc?: string; short?: string; brand?: string; sku?: string; barcode?: string; video?: string; seo_title?: string; seo_desc?: string; crit?: number };
export const CHECKS: { key: string; label: string; group: 'icerik' | 'seo' | 'katalog'; test: (p: AdminProduct, d: PD) => boolean }[] = [
  { key: 'desc', label: 'Açıklama yok', group: 'icerik', test: (_p, d) => !(d.desc ?? '').trim() },
  { key: 'short', label: 'Kısa açıklama yok', group: 'icerik', test: (_p, d) => !(d.short ?? '').trim() },
  { key: 'img', label: 'Görseli yok', group: 'icerik', test: (p) => !(p.thumb || p.colors.some((c) => c.img)) },
  { key: 'img1', label: 'Tek görselli', group: 'icerik', test: (p) => p.colors.filter((c) => c.img).length === 1 },
  { key: 'video', label: 'Videosu yok', group: 'icerik', test: (_p, d) => !(d.video ?? '').trim() },
  { key: 'cat', label: 'Kategorisi yok', group: 'katalog', test: (p) => !p.category.trim() || p.category === 'Ürün' },
  { key: 'brand', label: 'Markası tanımsız', group: 'katalog', test: (_p, d) => !(d.brand ?? '').trim() },
  { key: 'sku', label: 'SKU eksik', group: 'katalog', test: (_p, d) => !(d.sku ?? '').trim() },
  { key: 'barcode', label: 'Barkod yok', group: 'katalog', test: (_p, d) => !(d.barcode ?? '').trim() },
  { key: 'price', label: 'Fiyatı yok', group: 'katalog', test: (p) => !(p.price > 0) },
  { key: 'stock', label: 'Stoğu tükenmiş', group: 'katalog', test: (p) => p.stock === 0 },
  { key: 'variant', label: 'Varyant bilgisi eksik', group: 'katalog', test: (p) => !p.colors.length || p.colors.some((c) => !c.name?.trim()) || (p.shop_cat === 'giyim' && !p.sizes.length) },
  { key: 'mt', label: 'Meta title yok', group: 'seo', test: (_p, d) => !(d.seo_title ?? '').trim() },
  { key: 'md', label: 'Meta description yok', group: 'seo', test: (_p, d) => !(d.seo_desc ?? '').trim() },
  { key: 'url', label: 'URL sorunlu', group: 'seo', test: (p) => !urlOk(p.slug) },
];
export const urlOk = (s: string) => /^[a-z0-9]+(-[a-z0-9]+)*$/.test(s) && s.length <= 60 && !/^\d+$/.test(s);
export function seoScore(p: AdminProduct) {
  const d = p.data as PD;
  const checks = {
    mt: !!(d.seo_title ?? '').trim() && (d.seo_title ?? '').length <= 65,
    md: !!(d.seo_desc ?? '').trim() && (d.seo_desc ?? '').length >= 70 && (d.seo_desc ?? '').length <= 165,
    desc: (d.desc ?? '').trim().length >= 80,
    url: urlOk(p.slug),
    img: !!(p.thumb || p.colors.some((c) => c.img)),
    schema: p.price > 0 && !!p.name && !!(p.thumb || p.colors.some((c) => c.img)),
    alt: p.colors.length > 0 && p.colors.every((c) => !!c.name?.trim()),
  };
  const w = { mt: 20, md: 20, desc: 20, url: 10, img: 10, schema: 10, alt: 10 } as const;
  const score = (Object.keys(w) as (keyof typeof w)[]).reduce((n, k) => n + (checks[k] ? w[k] : 0), 0);
  return { score, checks };
}
export function qualityIssues(p: AdminProduct) {
  const d = p.data as PD;
  return CHECKS.filter((c) => c.test(p, d));
}

export const RET_STATUS: Record<string, string> = { talep: 'Talep', onaylandi: 'Onaylandı', teslim_alindi: 'Teslim alındı', hasarli: 'Hasarlı', tamamlandi: 'Tamamlandı', red: 'Reddedildi' };
export const RET_REASON: Record<string, string> = { beden: 'Beden uymadı', kusurlu: 'Kusurlu / hasarlı', yanlis: 'Yanlış ürün', begenmedi: 'Beğenmedi', gec: 'Geç teslim', diger: 'Diğer' };

