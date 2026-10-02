import type { Metadata } from 'next';
import { D } from '@/components/Display';
import { OrderDone } from '@/components/OrderDone';

export const metadata: Metadata = { title: 'Siparişin alındı · Demleme', robots: { index: false } };

export default function Page() {
  return (
    <main className="page" style={{ maxWidth: 760, margin: '0 auto', width: '100%' }}>
      <h1 className="page-title">
        <D>Siparişin alındı</D>
      </h1>
      <OrderDone />
    </main>
  );
}
