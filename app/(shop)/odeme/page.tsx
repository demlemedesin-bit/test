import type { Metadata } from 'next';
import { CheckoutView } from '@/components/CheckoutView';
import { D } from '@/components/Display';

export const metadata: Metadata = { title: 'Ödeme · Demleme', robots: { index: false } };

export default function Page() {
  return (
    <main className="page page-wide">
      <p className="crumb">
        <a href="/#magaza">Mağaza</a>
        <span>/</span>
        <a href="/sepet">Sepet</a>
        <span>/</span>Ödeme
      </p>
      <h1 className="page-title">
        <D>Ödeme</D>
      </h1>
      <CheckoutView />
    </main>
  );
}
