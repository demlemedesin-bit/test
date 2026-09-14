import type { Metadata } from 'next';
import Script from 'next/script';
import '../styles/globals.css';
import GlobalModals from '@/app/components/GlobalModals';
import CartToast from '@/app/components/CartToast';

export const metadata: Metadata = {
  title: 'Demleme — İyi Bir Sohbet, Zamanla Demlenir.',
  description: 'Demleme; sohbetin, çayın ve hikâyenin yavaş yavaş demlendiği bir masa.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr">
      <head>
        <meta name="theme-color" content="#F7F3E9" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Kodchasan:ital,wght@0,200;0,300;0,400;0,500;0,600;0,700;1,200;1,300;1,400;1,500;1,600;1,700&display=swap"
          rel="stylesheet"
        />
        <Script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.15.0/gsap.min.js" strategy="beforeInteractive" />
        <Script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.15.0/ScrollTrigger.min.js" strategy="beforeInteractive" />
        <Script src="https://cdn.jsdelivr.net/npm/lenis@1.3.26/dist/lenis.min.js" strategy="beforeInteractive" />
      </head>
      <body>
        {children}
        <GlobalModals />
        <CartToast />
        <Script src="/main.js" strategy="afterInteractive" />
      </body>
    </html>
  );
}
