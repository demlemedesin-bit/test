import { rest } from './catalog';

/** Sayfa ve blog (pages / posts tabloları). Okuma anon anahtarla, 60 sn önbellekli; panelden kaydedilince anında yenilenir. */
export type CmsPage = { slug: string; title: string; body: string; seo_title: string; seo_desc: string; in_footer: boolean; sort: number };
export type CmsPostCard = { slug: string; title: string; excerpt: string; cover: string | null; tags: string[]; published_at: string | null; created_at: string };
export type CmsPost = CmsPostCard & { body: string; seo_title: string; seo_desc: string };

const SLUG = /^[a-z0-9-]{2,80}$/;
const visible = (p: { published_at: string | null }) => !p.published_at || new Date(p.published_at).getTime() <= Date.now();
// Not: sorgu metnine "şimdi" konmaz (önbellek anahtarı sabit kalsın); zaman süzgeci burada yapılır.

export async function getPage(slug: string): Promise<CmsPage | null> {
  if (!SLUG.test(slug)) return null;
  const r = await rest<CmsPage[]>(`pages?select=slug,title,body,seo_title,seo_desc,in_footer,sort&slug=eq.${slug}&published=eq.true&limit=1`);
  return r?.[0] ?? null;
}

export async function getPages(): Promise<{ slug: string; title: string; in_footer: boolean; sort: number }[]> {
  return (await rest<{ slug: string; title: string; in_footer: boolean; sort: number }[]>('pages?select=slug,title,in_footer,sort&published=eq.true&order=sort.asc,title.asc')) ?? [];
}

/** Footer'da gösterilecek sayfalar (in_footer = true). */
export async function getFooterPages(): Promise<{ label: string; href: string }[]> {
  return (await getPages()).filter((p) => p.in_footer).map((p) => ({ label: p.title, href: `/sayfa/${p.slug}` }));
}

export async function getPosts(): Promise<CmsPostCard[]> {
  const r = await rest<CmsPostCard[]>('posts?select=slug,title,excerpt,cover,tags,published_at,created_at&published=eq.true&order=published_at.desc.nullslast,created_at.desc&limit=200');
  return (r ?? []).filter(visible);
}

export async function getPost(slug: string): Promise<CmsPost | null> {
  if (!SLUG.test(slug)) return null;
  const r = await rest<(CmsPost & { published_at: string | null })[]>(
    `posts?select=slug,title,excerpt,cover,tags,body,seo_title,seo_desc,published_at,created_at&slug=eq.${slug}&published=eq.true&limit=1`,
  );
  const p = r?.[0];
  return p && visible(p) ? p : null;
}

export const trDate = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' }) : '';
