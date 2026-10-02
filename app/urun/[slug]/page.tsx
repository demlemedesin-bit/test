import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Script from 'next/script';
import { productHtml } from '@/lib/content';
import { getProducts } from '@/lib/catalog';
import './product.css';

type Props = { params: Promise<{ slug: string }> };

// Yeni eklenen ürünler de açılsın; liste veritabanından gelir.
export const dynamicParams = true;
export const revalidate = 60;

export async function generateStaticParams() {
  return (await getProducts()).map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const p = (await getProducts()).find((x) => x.slug === slug);
  if (!p) return {};
  const title = p.seoTitle || `${p.name} · Demleme Mağaza`;
  const description = p.seoDesc || p.desc;
  return { title, description, openGraph: { type: 'website', title, description, siteName: 'Demleme', ...(p.thumb ? { images: [p.thumb] } : {}) } };
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  const list = await getProducts();
  if (!list.some((p) => p.slug === slug)) notFound();
  return (
    <>
      <div suppressHydrationWarning dangerouslySetInnerHTML={{ __html: await productHtml(list) }} />
      <Script src="/demleme/product.js" strategy="afterInteractive" />
    </>
  );
}
