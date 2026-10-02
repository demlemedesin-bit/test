import Script from 'next/script';
import { AnnounceBar } from '@/components/AnnounceBar';
import { homeHtml } from '@/lib/content';
import { getSite } from '@/lib/site';
import { JsonLd } from '@/components/JsonLd';
import { baseUrl, faqLd, organizationLd, websiteLd } from '@/lib/seo';
import { getSeoBundle } from '@/lib/seoServer';
import { siteUrl } from '@/lib/siteUrl';
import './home.css';

// Sayfa içeriği handoff tasarımının HTML'idir (content/home.html); mağaza kartları veritabanından gelir (60 sn / panelden anında yenilenir).
export const revalidate = 60;

export default async function Home() {
  const [{ announce, faq }, { seo }] = await Promise.all([getSite(), getSeoBundle()]);
  const base = baseUrl(seo, siteUrl());
  return (
    <>
      <JsonLd data={[organizationLd(seo, base), websiteLd(seo, base), ...[faqLd(faq)].filter((x): x is Record<string, unknown> => !!x)]} />
      <AnnounceBar a={announce} />
      <div suppressHydrationWarning dangerouslySetInnerHTML={{ __html: await homeHtml() }} />
      <Script src="/demleme/home.js" strategy="afterInteractive" />
    </>
  );
}
