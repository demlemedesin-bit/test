import type { Metadata } from 'next';
import { CartView } from '@/components/CartView';
import { D } from '@/components/Display';

export const metadata: Metadata = { title: 'Sepet · Demleme', robots: { index: false } };

export default function Page() {
  return (
    <main className="page page-wide">
      <p className="crumb">
        <a href="/#magaza">Mağaza</a>
        <span>/</span>Sepet
      </p>
      <h1 className="page-title">
        <D>Sepetin</D>
      </h1>
      <CartView />
    </main>
  );
}
