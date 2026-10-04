import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { D } from '@/components/Display';
import { getProfiles } from '@/lib/guestProfiles';
import { applyTemplate } from '@/lib/seo';
import { getSeoBundle } from '@/lib/seoServer';
import '../../yazi.css';

type Props = { params: Promise<{ slug: string }> };

export const dynamicParams = true;
export const revalidate = 60;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const p = (await getProfiles()).find((x) => x.slug === slug);
  if (!p) return {};
  const { seo } = await getSeoBundle();
  const description = p.bio[0].slice(0, 160);
  return {
    title: { absolute: applyTemplate(seo, p.name) },
    description,
    alternates: { canonical: `/konuklar/${p.slug}` },
    openGraph: { type: 'profile', title: applyTemplate(seo, p.name), description, siteName: seo.site_name, ...(p.img ? { images: [p.img] } : {}) },
  };
}

export default async function Konuk({ params }: Props) {
  const { slug } = await params;
  const list = await getProfiles();
  const i = list.findIndex((x) => x.slug === slug);
  if (i < 0) notFound();
  const p = list[i];
  const next = list[(i + 1) % list.length];
  return (
    <main className="page yz kp">
      <p className="crumb">
        <a href="/">Ana sayfa</a> <span aria-hidden="true">/</span> <a href="/konuklar">Konuklar</a>
      </p>
      <div className="kp-head">
        {p.img && <img className="kp-portrait" src={p.img} alt="" />}
        <h1 className="page-title">
          <D>{p.name}</D>
        </h1>
      </div>
      <div className="prose yz-body">
        {p.bio.map((t, k) => (
          <p key={k}>{t}</p>
        ))}
      </div>
      {p.videos.length > 0 && (
        <section className="kp-videos">
          <h2>Videolar</h2>
          {p.videos.map((id) => (
            <div className="kp-video" key={id}>
              <iframe src={`https://www.youtube-nocookie.com/embed/${id}`} title={`${p.name} videosu`} loading="lazy" allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" />
            </div>
          ))}
        </section>
      )}
      {p.photos.length > 0 && (
        <div className="kp-photos">
          {p.photos.map((u) => (
            <img key={u} src={u} alt="" loading="lazy" />
          ))}
        </div>
      )}
      <nav className="kp-nav" aria-label="Konuklar">
        <a href="/konuklar">← Tüm konuklar</a>
        {next.slug !== p.slug && <a href={`/konuklar/${next.slug}`}>Sıradaki: {next.name} →</a>}
      </nav>
    </main>
  );
}
