import type { Metadata } from 'next';
import NavBar from '@/app/components/NavBar';
import CheckoutClient from '@/app/components/CheckoutClient';

export const metadata: Metadata = {
  title: 'Sipariş Tamamla — Demleme Shop',
};

export default function OdemePage() {
  return (
    <>
      <NavBar />
      <main style={{minHeight:'100vh',background:'var(--cream)',paddingTop:'72px',paddingBottom:'80px'}}>
        <CheckoutClient />
      </main>
    </>
  );
}
