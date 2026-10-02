import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { D } from '@/components/Display';
import { getPage } from '@/lib/cms';
import { md } from '@/lib/md';
import '../../yazi.css';

type Props = { params: Promise<{ slug: string }> };

export const dynamicParams = true;
export const revalidate = 60;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const p = await getPage(slug);
  if (!p) return {};
  const title = `${p.seo_title.trim() || p.title} · Demleme`;
  const description = p.seo_desc.trim() || undefined;
  return { title, description, alternates: { canonical: `/sayfa/${p.slug}` }, openGraph: { type: 'website', title, description, siteName: 'Demleme' } };
}

export default async function CmsPageView({ params }: Props) {
  const { slug } = await params;
  const p = await getPage(slug);
  if (!p) notFound();
  return (
    <main className="page yz">
      <h1 className="page-title">
        <D>{p.title}</D>
      </h1>
      <div className="prose yz-body" dangerouslySetInnerHTML={{ __html: md(p.body) }} />
    </main>
  );
}
