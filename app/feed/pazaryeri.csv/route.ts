import { abs, feedProducts, skuPart } from '@/lib/feed';
import { toCsv } from '@/lib/csv';

export const revalidate = 3600;

// Pazaryeri (Trendyol, Hepsiburada vb.) aktarımı için varyant satırlı CSV: SKU = slug-renk-beden
export async function GET() {
  const rows: (string | number)[][] = [];
  for (const p of await feedProducts()) {
    const colors = p.colors.length ? p.colors : [null];
    const sizes = p.sizes.length ? p.sizes : [null];
    for (const c of colors) {
      for (const s of sizes) {
        const sku = [p.slug, c ? skuPart(c.key || c.name) : '', s ? skuPart(s) : ''].filter(Boolean).join('-');
        rows.push([sku, '', p.name, p.desc, p.category, 'Demleme', c?.name ?? '', s ?? '', p.price.toFixed(2), p.stock ?? '', abs(c?.img) || p.images[0] || '', p.link]);
      }
    }
  }
  const csv = toCsv(['SKU', 'Barkod', 'Ürün adı', 'Açıklama', 'Kategori', 'Marka', 'Renk', 'Beden', 'Fiyat (TRY)', 'Stok', 'Görsel', 'Ürün bağlantısı'], rows);
  return new Response('﻿' + csv + '\r\n', { headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400' } });
}
