import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { D } from '@/components/Display';
import { getPost, trDate } from '@/lib/cms';
import { md } from '@/lib/md';
import { JsonLd } from '@/components/JsonLd';
import { applyTemplate, articleLd, baseUrl, breadcrumbLd } from '@/lib/seo';
import { getSeoBundle } from '@/lib/seoServer';
import { siteUrl } from '@/lib/siteUrl';
import '../../yazi.css';

type Props = { params: Promise<{ slug: string }> };

export const dynamicParams = true;
export const revalidate = 60;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const p = await getPost(slug);
  if (!p) return {};
  const { seo } = await getSeoBundle();
  const title = applyTemplate(seo, p.seo_title.trim() || p.title);
  const description = p.seo_desc.trim() || p.excerpt.trim() || undefined;
  return {
    title: { absolute: title },
    description,
    alternates: { canonical: `/blog/${p.slug}` },
    openGraph: {
      type: 'article',
      title,
      description,
      siteName: seo.site_name,
      ...(p.published_at ? { publishedTime: p.published_at } : {}),
      ...(p.cover ? { images: [p.cover] } : {}),
    },
  };
}

export default async function BlogPost({ params }: Props) {
  const { slug } = await params;
  const p = await getPost(slug);
  if (!p) notFound();
  const { seo } = await getSeoBundle();
  const base = baseUrl(seo, siteUrl());
  return (
    <main className="page yz">
      <JsonLd
        data={[
          articleLd(seo, base, { slug: p.slug, title: p.seo_title.trim() || p.title, description: p.seo_desc.trim() || p.excerpt.trim() || undefined, cover: p.cover, published: p.published_at ?? p.created_at }),
          breadcrumbLd(base, [{ name: 'Ana sayfa', path: '/' }, { name: 'Blog', path: '/blog' }, { name: p.title, path: `/blog/${p.slug}` }]),
        ]}
      />
      <p className="crumb">
        <a href="/blog">Blog</a>
      </p>
      <h1 className="page-title">
        <D>{p.title}</D>
      </h1>
      <div className="yz-meta">
        <time dateTime={p.published_at ?? p.created_at}>{trDate(p.published_at ?? p.created_at)}</time>
        {p.tags?.length > 0 && (
          <ul className="yz-tags" aria-label="Etiketler">
            {p.tags.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        )}
      </div>
      {p.cover && <img className="yz-cover" src={p.cover} alt="" />}
      <div className="prose yz-body" dangerouslySetInnerHTML={{ __html: md(p.body) }} />
    </main>
  );
}
