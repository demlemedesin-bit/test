import type { Metadata, Viewport } from 'next';

export const metadata: Metadata = {
  title: 'Demleme — Bir demin 40 yıllık hatırı var',
  description:
    'Demleme; sohbetin, çayın ve hikâyenin yavaş yavaş demlendiği bir masa. YouTube bölümleri, podcast, konuklar ve kendi mağazasıyla sofradaki konuşmaları mikrofonun karşısına taşıyor.',
  openGraph: {
    type: 'website',
    siteName: 'Demleme',
    title: 'Demleme — İyi Bir Sohbet, Zamanla Demlenir.',
    description: 'Sohbetin, çayın ve hikâyenin yavaş yavaş demlendiği bir masa — YouTube, podcast, konuklar ve mağaza bir arada.',
  },
};

export const viewport: Viewport = { themeColor: '#F8F4EA' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
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
      <body>{children}</body>
    </html>
  );
}
