import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Script from 'next/script';
import { getReviews, productHtml, productJsonLd } from '@/lib/content';
import { getStorefront } from '@/lib/storefront';
import { siteUrl } from '@/lib/siteUrl';
import { ProductExtras } from '@/components/ProductExtras';
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
  const [list, sf] = await Promise.all([getProducts(), getStorefront()]);
  const p = list.find((x) => x.slug === slug);
  if (!p) notFound();
  const reviews = sf.reviews_on ? await getReviews(slug) : [];
  const html = await productHtml(list, slug, sf, reviews);
  return (
    <>
      <div suppressHydrationWarning dangerouslySetInnerHTML={{ __html: html }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: productJsonLd(p, reviews, siteUrl()) }} />
      <ProductExtras slug={slug} name={p.name} unavailable={p.out || p.soon} reviewsOn={sf.reviews_on} wishlistOn={sf.wishlist_on} stockAlertOn={sf.stock_alert_on} recentOn={sf.recent_on} />
      <Script src="/demleme/product.js" strategy="afterInteractive" />
    </>
  );
}
