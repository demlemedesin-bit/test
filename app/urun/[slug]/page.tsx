import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Script from 'next/script';
import { productHtml, products } from '@/lib/content';
import './product.css';

type Props = { params: Promise<{ slug: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return products().map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const p = products().find((x) => x.slug === slug);
  if (!p) return {};
  return { title: `${p.name} · Demleme Mağaza`, description: p.desc };
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  if (!products().some((p) => p.slug === slug)) notFound();
  return (
    <>
      <div suppressHydrationWarning dangerouslySetInnerHTML={{ __html: productHtml() }} />
      <Script src="/demleme/product.js" strategy="afterInteractive" />
    </>
  );
}
