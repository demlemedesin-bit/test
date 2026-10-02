import { Footer } from '@/components/Footer';
import { Header } from '@/components/Header';
import { D } from '@/components/Display';
import './(shop)/shop.css';

export default function NotFound() {
  return (
    <>
      <Header />
      <main className="err-page">
        <h1>
          <D>Bulamadık</D>
        </h1>
        <p>Aradığın sayfa yok ya da taşınmış olabilir.</p>
        <a className="btn btn--solid" href="/">
          Ana sayfaya dön
        </a>
      </main>
      <Footer />
    </>
  );
}
