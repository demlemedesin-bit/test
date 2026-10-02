/**
 * Süreli kampanya fiyatı (products.data.sale = {price, starts_at, ends_at}).
 * Veritabanındaki public.eff_price() ile birebir aynı kural: indirimli fiyat geçerliyse (taban fiyattan düşük, pencere içinde) o kullanılır.
 * Hem sunucu hem istemci kullanır; sipariş tutarını yine veritabanı hesaplar, burası yalnızca gösterim içindir.
 */
export type SaleInfo = { price: number; base: number; on: boolean; was?: number; ends?: string; pct?: number };

export function saleOf(base: number, data: unknown, now: number = Date.now()): SaleInfo {
  const off: SaleInfo = { price: base, base, on: false };
  const s = data && typeof data === 'object' ? (data as { sale?: unknown }).sale : null;
  if (!s || typeof s !== 'object' || Array.isArray(s)) return off;
  const o = s as { price?: unknown; starts_at?: unknown; ends_at?: unknown };
  const raw = o.price;
  if (raw === null || raw === undefined || raw === '') return off;
  const sp = Number(raw);
  if (!isFinite(sp) || sp < 0 || sp >= base) return off;
  const a = typeof o.starts_at === 'string' && o.starts_at ? Date.parse(o.starts_at) : NaN;
  const b = typeof o.ends_at === 'string' && o.ends_at ? Date.parse(o.ends_at) : NaN;
  if (isFinite(a) && now < a) return off;
  if (isFinite(b) && now >= b) return off;
  return { price: sp, base, on: true, was: base, ends: isFinite(b) ? (o.ends_at as string) : undefined, pct: Math.round(((base - sp) / base) * 100) };
}
