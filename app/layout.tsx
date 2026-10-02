import type { Metadata, Viewport } from 'next';
import Script from 'next/script';
import { getSite, text } from '@/lib/site';

// Başlık, açıklama ve paylaşım bilgisi panelden (İçerik → SEO) değiştirilir.
export async function generateMetadata(): Promise<Metadata> {
  const s = await getSite();
  const img = text(s, 'seo_og_image');
  return {
    title: text(s, 'seo_title'),
    description: text(s, 'seo_desc'),
    openGraph: {
      type: 'website',
      siteName: 'Demleme',
      title: text(s, 'seo_og_title'),
      description: text(s, 'seo_og_desc'),
      ...(img ? { images: [img] } : {}),
    },
  };
}

export const viewport: Viewport = { themeColor: '#F8F4EA' };

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const s = await getSite();
  const ga = text(s, 'ga_id').trim();
  const px = text(s, 'pixel_id').trim();
  const gaOk = /^G-[A-Z0-9]{4,20}$/.test(ga);
  const pxOk = /^\d{5,20}$/.test(px);
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
        {gaOk && (
          <>
            <Script src={`https://www.googletagmanager.com/gtag/js?id=${ga}`} strategy="afterInteractive" />
            <Script id="ga-init" strategy="afterInteractive">{`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments)}gtag('js',new Date());gtag('config','${ga}');`}</Script>
          </>
        )}
        {pxOk && (
          <Script id="fb-pixel" strategy="afterInteractive">{`!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${px}');fbq('track','PageView');`}</Script>
        )}
        <Script src="/demleme/track.js" strategy="afterInteractive" />
      </body>
    </html>
  );
}
