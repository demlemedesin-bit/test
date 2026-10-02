import type { Metadata } from 'next';
import { D } from '@/components/Display';
import { getProducts, type SiteProduct } from '@/lib/catalog';
import '@/components/Listing.css';

export const metadata: Metadata = {
  title: 'Tüm ürünler',
  description: 'Demleme mağazası: sofra, giyim ve aksesuar ürünlerinin tamamı.',
  alternates: { canonical: '/urunler' },
};

const CATS: [SiteProduct['shopCat'] | '', string][] = [['', 'Tümü'], ['sofra', 'Ev & Sofra'], ['giyim', 'Giyim'], ['aksesuar', 'Aksesuar']];
const SORTS: [string, string][] = [['', 'Öne çıkan'], ['artan', 'Fiyat: düşükten yükseğe'], ['azalan', 'Fiyat: yüksekten düşüğe'], ['indirim', 'İndirimdekiler']];

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? '';
const href = (kat: string, sirala: string) => {
  const q = new URLSearchParams();
  if (kat) q.set('kat', kat);
  if (sirala) q.set('sirala', sirala);
  const s = q.toString();
  return '/urunler' + (s ? `?${s}` : '');
};

export default async function Urunler({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams;
  const kat = CATS.some(([k]) => k === one(sp.kat)) ? one(sp.kat) : '';
  const sirala = SORTS.some(([k]) => k === one(sp.sirala)) ? one(sp.sirala) : '';

  const all = await getProducts();
  let list = all.filter((p) => !kat || p.shopCat === kat);
  if (sirala === 'indirim') list = list.filter((p) => p.was);
  if (sirala === 'artan') list = [...list].sort((a, b) => a.priceNum - b.priceNum);
  else if (sirala === 'azalan') list = [...list].sort((a, b) => b.priceNum - a.priceNum);
  else list = [...list].sort((a, b) => a.sort - b.sort);

  const count = (k: string) => all.filter((p) => !k || p.shopCat === k).length;
  const saleN = all.filter((p) => p.was).length;

  return (
    <main className="page page-wide">
      <p className="eyebrow">Mağaza</p>
      <h1 className="page-title"><D>Tüm ürünler</D></h1>
      <p className="lead">Sofranı, gardırobunu ve çay saatini tamamlayan Demleme ürünleri.</p>

      <div className="ls-bar">
        <nav className="ls-cats" aria-label="Kategoriler">
          {CATS.map(([k, label]) => (
            <a key={k || 'all'} href={href(k, sirala)} className={`ls-chip${kat === k ? ' on' : ''}`} aria-current={kat === k ? 'page' : undefined}>
              {label} <small>{count(k)}</small>
            </a>
          ))}
        </nav>
        <nav className="ls-sort" aria-label="Sırala">
          {SORTS.filter(([k]) => k !== 'indirim' || saleN > 0).map(([k, label]) => (
            <a key={k || 'def'} href={href(kat, k)} className={`ls-s${sirala === k ? ' on' : ''}`}>{label}</a>
          ))}
        </nav>
      </div>

      {list.length === 0 ? (
        <div className="empty"><h2>Bu filtrede ürün yok</h2><p><a className="link" href="/urunler">Tüm ürünleri göster</a></p></div>
      ) : (
        <ul className="ls-grid">
          {list.map((p) => (
            <li key={p.slug}>
              <a className="ls-card" href={`/urun/${p.slug}`}>
                <span className="ls-img">
                  {p.thumb ? <img src={p.thumb} alt={p.name} loading="lazy" /> : null}
                  {p.was && !p.out && !p.soon && p.salePct ? <span className="ls-pct">-%{p.salePct}</span> : null}
                  {p.out ? <span className="ls-tag">Tükendi</span> : p.soon ? <span className="ls-tag">Yakında</span> : p.badge ? <span className="ls-tag">{p.badge}</span> : null}
                </span>
                <span className="ls-name">{p.name}</span>
                <span className="ls-cat">{p.cat}</span>
                <span className="ls-price">
                  {p.was && !p.out && !p.soon ? <s>{p.was}</s> : null}
                  <b className={p.was && !p.out && !p.soon ? 'sale' : ''}>{p.price}</b>
                </span>
                {p.left && !p.out ? <span className="ls-low">Son {p.left} adet</span> : null}
              </a>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
