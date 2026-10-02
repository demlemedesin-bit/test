'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useWishlist } from '@/lib/wishlist';
import { Alert } from './ui';
import './ShopExtras.css';

type P = { slug: string; name: string; price: number | string; thumb: string | null; colors: { img?: string }[] | null; stock: number | null; soon: boolean };

const tl = (n: number) => '₺' + n.toLocaleString('tr-TR', { minimumFractionDigits: Number.isInteger(n) ? 0 : 2, maximumFractionDigits: 2 });

/** Hesabım → Favorilerim. */
export function Favorites() {
  const { slugs, loading, error, remove } = useWishlist();
  const [prods, setProds] = useState<Record<string, P> | null>(null);
  const [err, setErr] = useState('');
  const key = (slugs ?? []).slice().sort().join(',');

  useEffect(() => {
    if (!key) return;
    let off = false;
    supabase()
      .from('products')
      .select('slug,name,price,thumb,colors,stock,soon')
      .in('slug', key.split(','))
      .then(({ data, error: e }) => {
        if (off) return;
        if (e) return setErr('Ürün bilgileri yüklenemedi.');
        setErr('');
        setProds(Object.fromEntries(((data ?? []) as P[]).map((p) => [p.slug, p])));
      });
    return () => {
      off = true;
    };
  }, [key]);

  async function rm(slug: string) {
    if (!(await remove(slug))) setErr('Favorilerden çıkarılamadı. Tekrar dene.');
  }

  if (error) return <Alert kind="err">Favorilerin yüklenemedi. Sayfayı yenile.</Alert>;
  if (loading || !slugs) return <p className="loading">Favorilerin yükleniyor…</p>;
  if (!slugs.length)
    return (
      <div className="empty">
        <h2>Henüz favorin yok</h2>
        <p>Ürün sayfasındaki kalp simgesiyle beğendiklerini buraya ekleyebilirsin.</p>
        <a className="btn btn--solid" href="/#magaza">
          Mağazaya göz at
        </a>
      </div>
    );
  if (!prods) return <p className="loading">Favorilerin yükleniyor…</p>;

  return (
    <>
      {err && <Alert kind="err">{err}</Alert>}
      <ul className="fav-grid">
        {slugs.map((s) => {
          const p = prods[s];
          if (!p)
            return (
              <li key={s} className="fav-card">
                <span className="sr-name">{s}</span>
                <span className="sr-meta">Bu ürün artık satışta değil.</span>
                <div className="fav-actions">
                  <button className="btn-text" onClick={() => rm(s)}>
                    Kaldır
                  </button>
                </div>
              </li>
            );
          const img = p.thumb || p.colors?.[0]?.img || '';
          const out = p.stock != null && p.stock <= 0;
          return (
            <li key={s} className="fav-card">
              <a className="sr-card" href={`/urun/${p.slug}`}>
                <span className="sr-img">{img ? <img src={img} alt="" loading="lazy" /> : null}</span>
                <span className="sr-name">{p.name}</span>
                <span className="sr-meta">{out ? 'Tükendi' : p.soon ? 'Yakında' : ' '}</span>
                <span className="sr-price">{tl(Number(p.price))}</span>
              </a>
              <div className="fav-actions">
                <a className="link" href={`/urun/${p.slug}`}>
                  Ürüne git
                </a>
                <button className="btn-text" onClick={() => rm(s)} aria-label={`${p.name} favorilerden kaldır`}>
                  Kaldır
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </>
  );
}
