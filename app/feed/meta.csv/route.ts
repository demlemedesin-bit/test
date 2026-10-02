import { feedProducts, priceTry } from '@/lib/feed';
import { toCsv } from '@/lib/csv';

export const revalidate = 3600;

// Meta (Facebook / Instagram) katalog beslemesi
export async function GET() {
  const rows = (await feedProducts())
    .filter((p) => p.images.length && p.price > 0)
    .map((p) => [p.slug, p.name.slice(0, 150), (p.desc || p.name).slice(0, 4900), p.inStock ? 'in stock' : 'out of stock', 'new', priceTry(p.price), p.link, p.images[0], 'Demleme']);
  const csv = toCsv(['id', 'title', 'description', 'availability', 'condition', 'price', 'link', 'image_link', 'brand'], rows);
  return new Response(csv + '\r\n', { headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400' } });
}
