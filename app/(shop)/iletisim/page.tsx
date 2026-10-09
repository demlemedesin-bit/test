import type { Metadata } from 'next';
import { D } from '@/components/Display';
import { getConfig } from '@/lib/catalog';
import { sellerParts } from '@/lib/sellerInfo';
import { applyTemplate } from '@/lib/seo';
import { getSeoBundle } from '@/lib/seoServer';

export const revalidate = 60;

export async function generateMetadata(): Promise<Metadata> {
  const { seo } = await getSeoBundle();
  return { title: { absolute: applyTemplate(seo, 'İletişim') }, description: 'Demleme iletişim ve satıcı bilgileri.', alternates: { canonical: '/iletisim' } };
}

export default async function Iletisim() {
  const cfg = await getConfig();
  const rows = sellerParts(cfg);
  return (
    <main className="page page-wide">
      <p className="eyebrow">İletişim</p>
      <h1 className="page-title">
        <D>Bize ulaş</D>
      </h1>
      <p className="lead">Sipariş, iade ya da başka bir konuda yazabilirsin. E-postalara iş günlerinde en geç 2 iş günü içinde dönüyoruz.</p>
      <div className="prose">
        <table>
          <tbody>
            {rows.map((r) => (
              <tr key={r.label}>
                <th scope="row">{r.label}</th>
                <td>{r.label === 'E-posta' ? <a href={`mailto:${r.value}`}>{r.value}</a> : r.label === 'Telefon' ? <a href={`tel:${r.value.replace(/[^+\d]/g, '')}`}>{r.value}</a> : r.value}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p>
          Sipariş durumunu <a href="/siparis-takip">sipariş takibi</a> sayfasından, iade ve cayma koşullarını <a href="/kargo-ve-iade">kargo ve iade</a> sayfasından görebilirsin.
        </p>
      </div>
    </main>
  );
}
