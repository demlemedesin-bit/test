import type { Metadata } from 'next';
import { D } from '@/components/Display';
import { TrackView } from '@/components/TrackView';

export const metadata: Metadata = { title: 'Sipariş takibi · Demleme' };

export default function Page() {
  return (
    <main className="page page-wide">
      <p className="eyebrow">Yardım</p>
      <h1 className="page-title">
        <D>Sipariş takibi</D>
      </h1>
      <p className="lead">Üye olmadan verdiğin siparişin durumunu sipariş numarası ve e-posta adresinle öğrenebilirsin. Üyeysen siparişlerini hesabında da görürsün.</p>
      <TrackView />
    </main>
  );
}
