'use client';

import { Footer } from '@/components/Footer';
import { Header } from '@/components/Header';
import './(shop)/shop.css';

export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return (
    <>
      <Header />
      <main className="err-page">
        <h1>Bir sorun çıktı</h1>
        <p>Beklenmedik bir hata oldu. Tekrar deneyebilirsin.</p>
        <button className="btn btn--solid" onClick={reset}>
          Tekrar dene
        </button>
      </main>
      <Footer />
    </>
  );
}
