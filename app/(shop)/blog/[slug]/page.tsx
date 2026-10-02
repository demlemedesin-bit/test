import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { D } from '@/components/Display';
import { getPost, trDate } from '@/lib/cms';
import { md } from '@/lib/md';
import '../../yazi.css';

type Props = { params: Promise<{ slug: string }> };

export const dynamicParams = true;
export const revalidate = 60;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const p = await getPost(slug);
  if (!p) return {};
  const title = `${p.seo_title.trim() || p.title} · Demleme`;
  const description = p.seo_desc.trim() || p.excerpt.trim() || undefined;
  return {
    title,
    description,
    alternates: { canonical: `/blog/${p.slug}` },
    openGraph: {
      type: 'article',
      title,
      description,
      siteName: 'Demleme',
      ...(p.published_at ? { publishedTime: p.published_at } : {}),
      ...(p.cover ? { images: [p.cover] } : {}),
    },
  };
}

export default async function BlogPost({ params }: Props) {
  const { slug } = await params;
  const p = await getPost(slug);
  if (!p) notFound();
  return (
    <main className="page yz">
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
