'use client';

import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Footer } from '@/components/Footer';
import { Header } from '@/components/Header';
import './(shop)/shop.css';

export default function ErrorPage({ error, reset }: { error: Error; reset: () => void }) {
  // Hata kaydı: yalnızca sayfa yolu + hata metni (kişisel veri yok)
  useEffect(() => {
    try {
      void supabase().rpc('log_error', { p_path: location.pathname, p_message: error?.message || (error as { digest?: string })?.digest || '' }).then(() => {}, () => {});
    } catch {
      /* kayıt hatası sayfayı etkilememeli */
    }
  }, [error]);
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
