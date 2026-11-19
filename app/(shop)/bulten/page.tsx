import type { Metadata } from 'next';
import { D } from '@/components/Display';
import { verify } from '@/lib/marketing';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Bülten tercihi', robots: { index: false, follow: false } };

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? '';

export default async function Bulten({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const s = one(sp.s);
  const e = one(sp.e).trim().toLowerCase();
  const t = one(sp.t);
  let title = 'Bülten tercihi';
  let text = 'Bu bağlantı geçersiz ya da süresi dolmuş. Sorun yaşıyorsan bize yazabilirsin.';
  let form = false;
  if (s === 'onay') {
    title = 'Teşekkürler, kaydın onaylandı';
    text = 'Artık yeni bölüm, konuk ve ürün duyurularını e-postanla alacaksın. İznini istediğin zaman her e-postanın altındaki bağlantıdan geri alabilirsin.';
  } else if (s === 'ayrildi') {
    title = 'Abonelikten çıkarıldın';
    text = 'Bundan sonra sana kampanya ve duyuru e-postası göndermeyeceğiz. Sipariş ve kargo bilgilendirmeleri gelmeye devam eder.';
  } else if (s === 'ayril' && verify(e, 'ayril', t)) {
    title = 'Abonelikten çık';
    text = `${e} adresine kampanya ve duyuru e-postaları gönderilmesin mi?`;
    form = true;
  }
  return (
    <main className="page page-wide">
      <p className="eyebrow">Bülten</p>
      <h1 className="page-title">
        <D>{title}</D>
      </h1>
      <p className="lead">{text}</p>
      {form && (
        <form method="post" action="/api/bulten/ayril">
          <input type="hidden" name="e" value={e} />
          <input type="hidden" name="t" value={t} />
          <button className="btn btn--solid" type="submit">
            Evet, abonelikten çık
          </button>
        </form>
      )}
    </main>
  );
}
