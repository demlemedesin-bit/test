import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { D } from '@/components/Display';
import { KonukForm } from '@/components/KonukForm';
import { guestApplyOn } from '@/lib/guestApply';
import { getSeoBundle } from '@/lib/seoServer';
import { applyTemplate } from '@/lib/seo';
import './konuk-ol.css';

export const revalidate = 60;

export async function generateMetadata(): Promise<Metadata> {
  const { seo } = await getSeoBundle();
  return { title: { absolute: applyTemplate(seo, 'Demleme’ye konuk olmak ister misin?') }, description: 'Herkesin anlatmaya değer bir hikâyesi var. Belki de Demleme’nin bir sonraki konuğu sensin.', alternates: { canonical: '/konuk-ol' } };
}

export default async function KonukOl() {
  if (!(await guestApplyOn())) notFound();
  return (
    <main className="ko">
      <section className="ko-hero">
        <div className="ko-copy">
          <h1>
            <D>Demleme’ye konuk olmak ister misin?</D>
          </h1>
          <p className="ko-lead">
            Herkesin anlatmaya değer bir hikâyesi var.
            <br />
            Belki de Demleme’nin bir sonraki konuğu sensin.
          </p>
          <p className="ko-script">Çaylar bizden, hikâye senden.</p>
        </div>
        <img className="ko-art" src="/demleme/konuk-ol/sofra.webp" alt="" width={1200} height={675} />
      </section>
      <KonukForm />
    </main>
  );
}
