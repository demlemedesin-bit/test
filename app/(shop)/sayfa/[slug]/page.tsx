import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { D } from '@/components/Display';
import { getPage } from '@/lib/cms';
import { md } from '@/lib/md';
import { JsonLd } from '@/components/JsonLd';
import { applyTemplate, baseUrl, breadcrumbLd } from '@/lib/seo';
import { getSeoBundle } from '@/lib/seoServer';
import { siteUrl } from '@/lib/siteUrl';
import '../../yazi.css';

type Props = { params: Promise<{ slug: string }> };

export const dynamicParams = true;
export const revalidate = 60;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const p = await getPage(slug);
  if (!p) return {};
  const { seo } = await getSeoBundle();
  const title = applyTemplate(seo, p.seo_title.trim() || p.title);
  const description = p.seo_desc.trim() || undefined;
  return { title: { absolute: title }, description, alternates: { canonical: `/sayfa/${p.slug}` }, openGraph: { type: 'website', title, description, siteName: seo.site_name } };
}

export default async function CmsPageView({ params }: Props) {
  const { slug } = await params;
  const p = await getPage(slug);
  if (!p) notFound();
  const { seo } = await getSeoBundle();
  const base = baseUrl(seo, siteUrl());
  return (
    <main className="page yz">
      <JsonLd data={breadcrumbLd(base, [{ name: 'Ana sayfa', path: '/' }, { name: p.title, path: `/sayfa/${p.slug}` }])} />
      <h1 className="page-title">
        <D>{p.title}</D>
      </h1>
      <div className="prose yz-body" dangerouslySetInnerHTML={{ __html: md(p.body) }} />
    </main>
  );
}
