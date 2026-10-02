import type { MetadataRoute } from 'next';
import { getProducts, rest } from '@/lib/catalog';
import { getPages, getPosts } from '@/lib/cms';
import { docSlugs } from '@/lib/legal';
import { siteUrl } from '@/lib/siteUrl';
import { baseUrl } from '@/lib/seo';
import { getSeoBundle } from '@/lib/seoServer';

export const revalidate = 3600;

type Entry = MetadataRoute.Sitemap[number];

/** Dışlama listesi: tam yol ya da sonu * olan önek ("/sayfa/gizli*"). */
function excluded(list: string[], path: string): boolean {
  const p = path.length > 1 ? path.replace(/\/+$/, '') : path;
  return list.some((x) => (x.endsWith('*') ? p.startsWith(x.slice(0, -1)) : (x.length > 1 ? x.replace(/\/+$/, '') : x) === p));
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const { seo } = await getSeoBundle();
  // Site yayın öncesi gizliyse sitemap boş kalır
  if (seo.noindex_site) return [];
  const base = baseUrl(seo, siteUrl());
  const c = seo.sitemap;
  const abs = (u: string) => (u.startsWith('/') ? base + u : u);

  const [products, pages, posts, pMeta, gMeta, bMeta] = await Promise.all([
    c.include_products ? getProducts() : Promise.resolve([]),
    c.include_pages ? getPages() : Promise.resolve([]),
    c.include_blog ? getPosts() : Promise.resolve([]),
    c.include_products ? rest<{ slug: string; updated_at: string | null }[]>('products?select=slug,updated_at&active=eq.true') : Promise.resolve(null),
    c.include_pages ? rest<{ slug: string; updated_at: string | null }[]>('pages?select=slug,updated_at&published=eq.true') : Promise.resolve(null),
    c.include_blog ? rest<{ slug: string; updated_at: string | null }[]>('posts?select=slug,updated_at&published=eq.true&limit=500') : Promise.resolve(null),
  ]);
  const upd = (rows: { slug: string; updated_at: string | null }[] | null) => new Map((rows ?? []).filter((r) => r.updated_at).map((r) => [r.slug, r.updated_at as string]));
  const pU = upd(pMeta);
  const gU = upd(gMeta);
  const bU = upd(bMeta);
  const cf = c.changefreq;

  const out: Entry[] = [{ url: base, changeFrequency: cf, priority: c.priorities.home }];
  for (const p of products) {
    const imgs = c.include_images ? [p.thumb, ...p.colors.map((x) => x.img)].filter((x): x is string => !!x).map(abs) : [];
    out.push({
      url: `${base}/urun/${p.slug}`,
      ...(pU.get(p.slug) ? { lastModified: pU.get(p.slug) } : {}),
      changeFrequency: cf,
      priority: c.priorities.products,
      ...(imgs.length ? { images: [...new Set(imgs)].slice(0, 20) } : {}),
    });
  }
  for (const s of docSlugs) out.push({ url: `${base}/${s}`, changeFrequency: 'yearly', priority: 0.2 });
  if (c.include_pages) for (const p of pages) out.push({ url: `${base}/sayfa/${p.slug}`, ...(gU.get(p.slug) ? { lastModified: gU.get(p.slug) } : {}), changeFrequency: 'monthly', priority: c.priorities.pages });
  if (c.include_blog) {
    if (posts.length) out.push({ url: `${base}/blog`, changeFrequency: 'weekly', priority: c.priorities.blog });
    for (const p of posts) {
      out.push({
        url: `${base}/blog/${p.slug}`,
        lastModified: bU.get(p.slug) ?? p.published_at ?? p.created_at,
        changeFrequency: 'monthly',
        priority: c.priorities.blog,
        ...(c.include_images && p.cover ? { images: [abs(p.cover)] } : {}),
      });
    }
  }
  return out.filter((e) => !excluded(c.exclude, e.url.slice(base.length) || '/'));
}
