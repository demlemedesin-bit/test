import { notFound } from 'next/navigation';
import { products, getProduct } from '@/lib/products';
import NavBar from '@/app/components/NavBar';
import ProductDetailClient from '@/app/components/ProductDetailClient';

export async function generateStaticParams() {
  return products.map(p => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const p = getProduct(slug);
  if (!p) return {};
  return {
    title: `${p.name} — Demleme Shop`,
    description: p.description,
  };
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const p = getProduct(slug);
  if (!p) notFound();
  const related = products.filter(r => r.id !== p.id).slice(0, 4);
  return (
    <>
      <NavBar />
      <ProductDetailClient product={p} related={related} />
    </>
  );
}
