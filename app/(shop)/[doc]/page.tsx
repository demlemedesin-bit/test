import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { D } from '@/components/Display';
import { docBySlug, docs } from '@/lib/legal';

type Props = { params: Promise<{ doc: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return docs.map((d) => ({ doc: d.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const d = docBySlug((await params).doc);
  return d ? { title: `${d.title} · Demleme`, description: d.lead } : {};
}

export default async function Page({ params }: Props) {
  const d = docBySlug((await params).doc);
  if (!d) notFound();
  return (
    <main className="page page-wide">
      <p className="eyebrow">Bilgi</p>
      <h1 className="page-title">
        <D>{d.title}</D>
      </h1>
      <p className="lead">{d.lead}</p>
      <div className="prose">{d.body()}</div>
    </main>
  );
}
