import { SiteFooter, SiteHeader } from '@/components/SiteChrome';
import { D } from '@/components/Display';
import { NotFoundLog } from '@/components/NotFoundLog';
import './(shop)/shop.css';

export default function NotFound() {
  return (
    <>
      <NotFoundLog />
      <SiteHeader />
      <main className="err-page">
        <h1>
          <D>Bulamadık</D>
        </h1>
        <p>Aradığın sayfa yok ya da taşınmış olabilir.</p>
        <a className="btn btn--solid" href="/">
          Ana sayfaya dön
        </a>
      </main>
      <SiteFooter />
    </>
  );
}
