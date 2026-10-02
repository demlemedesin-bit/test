import type { MetadataRoute } from 'next';
import { getProducts } from '@/lib/catalog';
import { docSlugs } from '@/lib/legal';
import { siteUrl } from '@/lib/siteUrl';

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();
  const products = await getProducts();
  return [
    { url: base, changeFrequency: 'weekly', priority: 1 },
    ...products.map((p) => ({ url: `${base}/urun/${p.slug}`, changeFrequency: 'weekly' as const, priority: 0.7 })),
    ...docSlugs.map((s) => ({ url: `${base}/${s}`, changeFrequency: 'yearly' as const, priority: 0.2 })),
  ];
}
