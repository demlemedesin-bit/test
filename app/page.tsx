import Script from 'next/script';
import { homeHtml } from '@/lib/content';
import './home.css';

// Sayfa içeriği handoff tasarımının birebir HTML'idir (content/home.html); animasyonlar /demleme/home.js'te.
export default function Home() {
  return (
    <>
      <div suppressHydrationWarning dangerouslySetInnerHTML={{ __html: homeHtml() }} />
      <Script src="/demleme/home.js" strategy="afterInteractive" />
    </>
  );
}
