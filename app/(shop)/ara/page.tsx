import type { Metadata } from 'next';
import { D } from '@/components/Display';
import { getProducts, type SiteProduct } from '@/lib/catalog';
import { getPosts, trDate } from '@/lib/cms';
import { score, tokens } from '@/lib/search';
import '@/components/ShopExtras.css';

export const metadata: Metadata = {
  title: 'Ara · Demleme',
  description: 'Demleme mağazasında ürün ve yazı ara.',
  robots: { index: false, follow: true },
};

const CAT: Record<SiteProduct['shopCat'], string> = { sofra: 'Sofra', giyim: 'Giyim', aksesuar: 'Aksesuar' };

function ProductCard({ p }: { p: SiteProduct }) {
  return (
    <li>
      <a className="sr-card" href={`/urun/${p.slug}`}>
        <span className="sr-img">{p.thumb ? <img src={p.thumb} alt="" loading="lazy" /> : null}</span>
        <span className="sr-name">{p.name}</span>
        <span className="sr-meta">
          {p.cat || CAT[p.shopCat]}
          {p.out ? ' · Tükendi' : p.soon ? ' · Yakında' : ''}
        </span>
        <span className="sr-price">{p.was && !p.out && !p.soon ? <s style={{ opacity: 0.5, marginRight: 6 }}>{p.was}</s> : null}{p.price}</span>
      </a>
    </li>
  );
}

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string | string[] }> }) {
  const sp = await searchParams;
  const raw = Array.isArray(sp.q) ? sp.q[0] : sp.q;
  const q = (raw ?? '').replace(/\s+/g, ' ').trim().slice(0, 80);
  const toks = tokens(q);

  const [products, posts] = await Promise.all([getProducts(), toks.length ? getPosts() : Promise.resolve([])]);

  const hitProducts = toks.length
    ? products
        .map((p) => ({ p, s: score([p.name, p.cat, CAT[p.shopCat], p.desc], toks) }))
        .filter((x) => x.s > 0)
        .sort((a, b) => b.s - a.s || a.p.sort - b.p.sort)
        .map((x) => x.p)
    : [];
  const hitPosts = toks.length
    ? posts
        .map((p) => ({ p, s: score([p.title, (p.tags ?? []).join(' '), p.excerpt], toks) }))
        .filter((x) => x.s > 0)
        .sort((a, b) => b.s - a.s)
        .map((x) => x.p)
        .slice(0, 8)
    : [];

  const empty = !!toks.length && !hitProducts.length && !hitPosts.length;
  const cats = Array.from(new Set(products.map((p) => p.cat).filter(Boolean))).slice(0, 8);
  const suggest = products.filter((p) => !p.soon).slice(0, 4);

  return (
    <main className="page page-wide">
      <p className="eyebrow">Ara</p>
      <h1 className="page-title">
        <D>{q ? `“${q}”` : 'Ne arıyorsun?'}</D>
      </h1>

      <form className="sr-form" action="/ara" method="get" role="search">
        <label className="sr-sr" htmlFor="sr-q">
          Ürün veya yazı ara
        </label>
        <input id="sr-q" className="sr-in" type="search" name="q" defaultValue={q} placeholder="Ürün, kategori veya yazı ara" maxLength={80} autoComplete="off" />
        <button className="btn btn--solid" type="submit">
          Ara
        </button>
      </form>

      {!toks.length && <p className="lead">Aramak istediğin ürünün ya da yazının adını yaz.</p>}

      {!!toks.length && !empty && (
        <p className="muted" aria-live="polite">
          {hitProducts.length} ürün{hitPosts.length ? `, ${hitPosts.length} yazı` : ''} bulundu.
        </p>
      )}

      {hitProducts.length > 0 && (
        <section aria-labelledby="sr-p">
          <h2 className="section-h" id="sr-p">
            Ürünler
          </h2>
          <ul className="sr-grid">
            {hitProducts.map((p) => (
              <ProductCard key={p.slug} p={p} />
            ))}
          </ul>
        </section>
      )}

      {hitPosts.length > 0 && (
        <section aria-labelledby="sr-y" style={{ marginTop: 'var(--s-48)' }}>
          <h2 className="section-h" id="sr-y">
            Yazılar
          </h2>
          <ul className="sr-posts">
            {hitPosts.map((p) => (
              <li key={p.slug}>
                <a href={`/blog/${p.slug}`}>
                  <b>{p.title}</b>
                  {p.excerpt && <span>{p.excerpt}</span>}
                  <span className="small">{trDate(p.published_at ?? p.created_at)}</span>
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}

      {(empty || !toks.length) && (
        <section style={{ marginTop: 'var(--s-32)' }}>
          {empty && (
            <div className="empty" style={{ paddingTop: 0 }}>
              <h2>Sonuç bulunamadı</h2>
              <p>“{q}” için eşleşen ürün ya da yazı yok. Yazımı kontrol et ya da daha kısa bir sözcük dene.</p>
            </div>
          )}
          {cats.length > 0 && (
            <>
              <h2 className="section-h">Kategoriler</h2>
              <p className="sr-chips">
                {cats.map((c) => (
                  <a key={c} className="sr-chip" href={`/ara?q=${encodeURIComponent(c)}`}>
                    {c}
                  </a>
                ))}
              </p>
            </>
          )}
          {suggest.length > 0 && (
            <>
              <h2 className="section-h" style={{ marginTop: 'var(--s-32)' }}>
                Bunlara göz atabilirsin
              </h2>
              <ul className="sr-grid">
                {suggest.map((p) => (
                  <ProductCard key={p.slug} p={p} />
                ))}
              </ul>
            </>
          )}
          <p style={{ marginTop: 'var(--s-32)' }}>
            <a className="link" href="/blog">
              Blog yazılarına göz at
            </a>
          </p>
        </section>
      )}
    </main>
  );
}
