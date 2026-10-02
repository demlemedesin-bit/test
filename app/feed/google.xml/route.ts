import { feedProducts, priceTry } from '@/lib/feed';
import { siteUrl } from '@/lib/siteUrl';

export const revalidate = 3600;

const x = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
// XML'de geçersiz kontrol karakterlerini at
const clean = (s: string) => s.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '');

// Google Merchant Center ürün beslemesi (RSS 2.0, g: alanları)
export async function GET() {
  const base = siteUrl();
  const items = (await feedProducts())
    .filter((p) => p.images.length && p.price > 0)
    .map((p) => {
      const color = p.colors.map((c) => c.name).filter(Boolean).join('/');
      return [
        '<item>',
        `<g:id>${x(p.slug)}</g:id>`,
        `<g:title>${x(clean(p.name).slice(0, 150))}</g:title>`,
        `<g:description>${x(clean(p.desc || p.name).slice(0, 4900))}</g:description>`,
        `<g:link>${x(p.link)}</g:link>`,
        `<g:image_link>${x(p.images[0])}</g:image_link>`,
        ...p.images.slice(1, 11).map((u) => `<g:additional_image_link>${x(u)}</g:additional_image_link>`),
        `<g:availability>${p.inStock ? 'in_stock' : 'out_of_stock'}</g:availability>`,
        `<g:price>${priceTry(p.price)}</g:price>`,
        '<g:brand>Demleme</g:brand>',
        '<g:condition>new</g:condition>',
        color && `<g:color>${x(color)}</g:color>`,
        '<g:identifier_exists>no</g:identifier_exists>',
        '</item>',
      ]
        .filter(Boolean)
        .join('');
    })
    .join('\n');
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0"><channel><title>Demleme</title><link>${x(base)}</link><description>Demleme ürünleri</description>\n${items}\n</channel></rss>\n`;
  return new Response(xml, { headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400' } });
}
