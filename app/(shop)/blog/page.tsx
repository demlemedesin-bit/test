import type { Metadata } from 'next';
import { D } from '@/components/Display';
import { getPosts, trDate } from '@/lib/cms';
import '../yazi.css';

export const revalidate = 60;

export const metadata: Metadata = {
  title: 'Blog · Demleme',
  description: 'Demleme’den yazılar, notlar ve haberler.',
  alternates: { canonical: '/blog' },
};

export default async function BlogIndex() {
  const posts = await getPosts();
  return (
    <main className="page yz-list">
      <p className="eyebrow">Blog</p>
      <h1 className="page-title">
        <D>Yazılar</D>
      </h1>
      {posts.length === 0 ? (
        <p className="lead">Henüz yayınlanmış yazı yok. Yakında burada olacak.</p>
      ) : (
        <ul className="yz-grid">
          {posts.map((p) => (
            <li key={p.slug}>
              <article className="yz-card">
                <a href={`/blog/${p.slug}`}>
                  {p.cover ? <img className="yz-card-img" src={p.cover} alt="" loading="lazy" /> : <div className="yz-card-ph" aria-hidden="true" />}
                </a>
                <a href={`/blog/${p.slug}`}>
                  <h2>{p.title}</h2>
                </a>
                {p.excerpt && <p>{p.excerpt}</p>}
                <span className="small">{trDate(p.published_at ?? p.created_at)}</span>
              </article>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
