import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { D } from '@/components/Display';
import SetCard from '@/components/SetCard';
import { getSetViews, setFlags } from '@/lib/sets';

export const revalidate = 60;
export const metadata: Metadata = { title: 'Kampanyalı setler', description: 'Demleme ürünlerini setle al, daha uygun öde.', alternates: { canonical: '/setler' } };

export default async function Setler() {
  const [flags, sets] = await Promise.all([setFlags(), getSetViews()]);
  if (!flags.shop || !sets.length) notFound();
  return (
    <main className="page page-wide">
      <p className="eyebrow">Mağaza</p>
      <h1 className="page-title"><D>Kampanyalı setler</D></h1>
      <p className="lead">Ürünleri set olarak al, indirim sepette kendiliğinden uygulansın. Setteki ürünleri ve renkleri sen seç.</p>
      <div className="st-grid">{sets.map((s) => <SetCard key={s.slug} v={s} />)}</div>
    </main>
  );
}
