import type { Metadata } from 'next';
import { D } from '@/components/Display';
import { getProfiles } from '@/lib/guestProfiles';
import { applyTemplate } from '@/lib/seo';
import { getSeoBundle } from '@/lib/seoServer';
import '../yazi.css';

export const revalidate = 60;

export async function generateMetadata(): Promise<Metadata> {
  const { seo } = await getSeoBundle();
  return {
    title: { absolute: applyTemplate(seo, 'Konuklar') },
    description: `${seo.site_name} sofrasına oturan konuklar ve hikâyeleri.`,
    alternates: { canonical: '/konuklar' },
  };
}

export default async function Konuklar() {
  const list = await getProfiles();
  return (
    <main className="page yz-list">
      <p className="eyebrow">Konuklar</p>
      <h1 className="page-title">
        <D>Sofradaki konuklar</D>
      </h1>
      <p className="lead">Demleme’de çay içen, anlatan, dinleyen herkes. Birine tıkla, sofraya nasıl geldiğini oku.</p>
      <ul className="kp-grid">
        {list.map((p) => (
          <li key={p.slug}>
            <a className="kp-card" href={`/konuklar/${p.slug}`}>
              <span className={`kp-img${p.photo ? ' kp-img--photo' : ''}`}>{p.photo || p.img ? <img src={(p.photo ?? p.img) as string} alt="" loading="lazy" /> : <span aria-hidden="true" />}</span>
              <h2>{p.name}</h2>
              <p>{p.bio[0]}</p>
            </a>
          </li>
        ))}
      </ul>
    </main>
  );
}
