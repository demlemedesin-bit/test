import type { MetadataRoute } from 'next';
import { getProducts } from '@/lib/catalog';
import { getPages, getPosts } from '@/lib/cms';
import { docSlugs } from '@/lib/legal';
import { siteUrl } from '@/lib/siteUrl';

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();
  const [products, pages, posts] = await Promise.all([getProducts(), getPages(), getPosts()]);
  return [
    { url: base, changeFrequency: 'weekly', priority: 1 },
    ...products.map((p) => ({ url: `${base}/urun/${p.slug}`, changeFrequency: 'weekly' as const, priority: 0.7 })),
    ...docSlugs.map((s) => ({ url: `${base}/${s}`, changeFrequency: 'yearly' as const, priority: 0.2 })),
    ...pages.map((p) => ({ url: `${base}/sayfa/${p.slug}`, changeFrequency: 'monthly' as const, priority: 0.4 })),
    ...(posts.length ? [{ url: `${base}/blog`, changeFrequency: 'weekly' as const, priority: 0.5 }] : []),
    ...posts.map((p) => ({
      url: `${base}/blog/${p.slug}`,
      lastModified: p.published_at ?? p.created_at,
      changeFrequency: 'monthly' as const,
      priority: 0.5,
    })),
  ];
}
