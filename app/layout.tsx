import type { Metadata, Viewport } from 'next';
import Script from 'next/script';
import { getSite, text } from '@/lib/site';
import { rest } from '@/lib/catalog';
import { getSeoBundle } from '@/lib/seoServer';
import { baseUrl } from '@/lib/seo';
import { siteUrl } from '@/lib/siteUrl';
import { Popups } from '@/components/Popups';
import { CustomScripts } from '@/components/CustomScripts';
import { parseScripts } from '@/lib/design';
import { AdsLoader, ConsentBanner } from '@/components/Consent';

// Başlık, açıklama ve paylaşım bilgisi panelden (İçerik → SEO) değiştirilir.
export async function generateMetadata(): Promise<Metadata> {
  const [s, { seo }] = await Promise.all([getSite(), getSeoBundle()]);
  // Önce SEO ayarı (Yönetim → SEO ve reklam), yoksa eski İçerik → SEO alanları
  const title = seo.default_title || text(s, 'seo_title');
  const description = seo.default_desc || text(s, 'seo_desc');
  const ogTitle = seo.default_title || text(s, 'seo_og_title');
  const ogDesc = seo.default_desc || text(s, 'seo_og_desc');
  const img = seo.og_image || text(s, 'seo_og_image');
  // Site doğrulama kodları (Yönetim → Entegrasyonlar → Site doğrulama)
  const vr = (await rest<{ key: string; value: string }[]>('shop_settings?select=key,value&key=in.(verify_google,verify_meta,verify_yandex)')) ?? [];
  const v = Object.fromEntries(vr.map((r) => [r.key, String(r.value ?? '').trim()]));
  return {
    metadataBase: new URL(baseUrl(seo, siteUrl())),
    title: { default: title, template: seo.title_template || '%s' },
    description,
    ...(seo.favicon ? { icons: { icon: seo.favicon, apple: seo.favicon, shortcut: seo.favicon } } : {}),
    ...(seo.noindex_site ? { robots: { index: false, follow: false, googleBot: { index: false, follow: false } } } : {}),
    verification: {
      ...(v.verify_google ? { google: v.verify_google } : {}),
      ...(v.verify_yandex ? { yandex: v.verify_yandex } : {}),
      ...(v.verify_meta ? { other: { 'facebook-domain-verification': v.verify_meta } } : {}),
    },
    openGraph: {
      type: 'website',
      siteName: seo.site_name,
      locale: seo.locale,
      title: ogTitle,
      description: ogDesc,
      ...(img ? { images: [img] } : {}),
    },
    twitter: {
      card: img ? 'summary_large_image' : 'summary',
      title: ogTitle,
      description: ogDesc,
      ...(seo.twitter ? { site: '@' + seo.twitter, creator: '@' + seo.twitter } : {}),
      ...(img ? { images: [img] } : {}),
    },
  };
}

export const viewport: Viewport = { themeColor: '#F8F4EA' };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { ads, consent } = await getSeoBundle();
  const sc = parseScripts(((await rest<{ value: unknown }[]>('site_content?select=value&key=eq.scripts')) ?? [])[0]?.value);
  return (
    <html lang="tr">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* Kodchasan (metin) + Caveat (el yazısı) */}
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          href="https://fonts.googleapis.com/css2?family=Kodchasan:ital,wght@0,300;0,400;0,500;1,300;1,400&family=Caveat:wght@500&display=swap"
          rel="stylesheet"
        />
        {/* Strenuous (başlık fontu) — Adobe Fonts kiti */}
        <link rel="stylesheet" href="https://use.typekit.net/fjx5jha.css" />
      </head>
      <body>
        {children}
        {/* Reklam / izleme betikleri yalnızca geçerli kimlik varsa ve (gerekiyorsa) çerez onayından sonra yüklenir */}
        <AdsLoader ads={ads} />
        <ConsentBanner cfg={consent} />
        <Popups />
        <CustomScripts cfg={sc} />
        <Script src="/demleme/track.js" strategy="afterInteractive" />
      </body>
    </html>
  );
}
