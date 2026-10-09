import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { D } from '@/components/Display';
import { docSlugs, legalDocs } from '@/lib/legal';
import { getConfig } from '@/lib/catalog';

type Props = { params: Promise<{ doc: string }> };

export const dynamicParams = false;
export const revalidate = 60;

export function generateStaticParams() {
  return docSlugs.map((doc) => ({ doc }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { doc } = await params;
  const d = legalDocs(await getConfig()).find((x) => x.slug === doc);
  return d ? { title: `${d.title} · Demleme`, description: d.lead } : {};
}

export default async function Page({ params }: Props) {
  const { doc } = await params;
  const d = legalDocs(await getConfig()).find((x) => x.slug === doc);
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
