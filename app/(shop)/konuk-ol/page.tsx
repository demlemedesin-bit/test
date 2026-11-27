import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { D } from '@/components/Display';
import { KonukForm } from '@/components/KonukForm';
import { guestApplyOn } from '@/lib/guestApply';
import { getSeoBundle } from '@/lib/seoServer';
import { applyTemplate } from '@/lib/seo';
import { getSite, text } from '@/lib/site';
import './konuk-ol.css';

export const revalidate = 60;

export async function generateMetadata(): Promise<Metadata> {
  const [{ seo }, site] = await Promise.all([getSeoBundle(), getSite()]);
  return { title: { absolute: applyTemplate(seo, text(site, 'ko_title')) }, description: text(site, 'ko_lead').replace(/\s*\n\s*/g, ' '), alternates: { canonical: '/konuk-ol' } };
}

export default async function KonukOl() {
  if (!(await guestApplyOn())) notFound();
  const site = await getSite();
  const lead = text(site, 'ko_lead').split('\n');
  const t: Record<string, string> = Object.fromEntries(['ko_f_name', 'ko_f_name_ph', 'ko_f_email', 'ko_f_email_ph', 'ko_f_who', 'ko_f_who_ph', 'ko_v_title', 'ko_v_sub', 'ko_v_btn', 'ko_send', 'ko_consent_link', 'ko_consent', 'ko_ok'].map((k) => [k, text(site, k)]));
  return (
    <main className="ko">
      <section className="ko-hero">
        <div className="ko-copy">
          <h1>
            <D>{text(site, 'ko_title')}</D>
          </h1>
          <p className="ko-lead">
            {lead.map((l, i) => (
              <span key={i}>{i > 0 ? <br /> : null}{l}</span>
            ))}
          </p>
          <p className="ko-script">{text(site, 'ko_script')}</p>
        </div>
        <img className="ko-art" src={text(site, 'ko_image') || '/demleme/konuk-ol/sofra.webp'} alt="" width={1200} height={675} />
      </section>
      <KonukForm t={t} />
    </main>
  );
}
