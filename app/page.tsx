import Script from 'next/script';
import { homeHtml } from '@/lib/content';
import './home.css';

// Sayfa içeriği handoff tasarımının HTML'idir (content/home.html); mağaza kartları veritabanından gelir (60 sn / panelden anında yenilenir).
export const revalidate = 60;

export default async function Home() {
  return (
    <>
      <div suppressHydrationWarning dangerouslySetInnerHTML={{ __html: await homeHtml() }} />
      <Script src="/demleme/home.js" strategy="afterInteractive" />
    </>
  );
}
