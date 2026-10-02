'use client';

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { readCart, writeCart, type CartItem } from '@/lib/cart';
import { tl } from '@/lib/shop';
import { useStorefront } from './RecentlyViewed';
import './ProductExtras.css';

type P = {
  slug: string;
  name: string;
  category: string;
  shop_cat: string | null;
  price: number | string;
  colors: { key: string; name: string; img?: string }[] | null;
  sizes: string[] | null;
  soon: boolean;
  active: boolean;
  stock: number | null;
  thumb: string | null;
  sort: number | null;
  data: { related?: unknown } | null;
};

const relatedOf = (p: P): string[] => (Array.isArray(p.data?.related) ? (p.data.related as unknown[]).filter((x): x is string => typeof x === 'string') : []);
// Renk ya da beden seçimi gerekiyorsa sepete doğrudan eklenmez, ürün sayfasına gidilir
const needsChoice = (p: P) => (p.colors?.length ?? 0) > 1 || (p.sizes?.length ?? 0) > 0;

/** Sepet sayfası çapraz satış: sepette olmayan, satıştaki, stoktaki ürünler; kategori ve "ilgili ürün" eşleşmesi önce gelir. */
export function Upsell({ items }: { items: CartItem[] }) {
  const sf = useStorefront();
  const [all, setAll] = useState<P[] | null>(null);
  const on = !!sf?.upsell_cart_on;

  useEffect(() => {
    if (!on) return;
    let off = false;
    (async () => {
      try {
        const { data, error } = await supabase().from('products').select('slug,name,category,shop_cat,price,colors,sizes,soon,active,stock,thumb,sort,data').eq('active', true).order('sort', { ascending: true });
        if (!off && !error && data) setAll(data as P[]);
      } catch {
        /* çapraz satış olmadan da sepet çalışır */
      }
    })();
    return () => {
      off = true;
    };
  }, [on]);

  const slugKey = items.map((i) => i.slug).sort().join(',');
  const picks = useMemo(() => {
    if (!all || !sf) return [];
    const inCart = new Set(slugKey ? slugKey.split(',') : []);
    const mine = all.filter((p) => inCart.has(p.slug));
    const cats = new Set(mine.map((p) => p.shop_cat).filter(Boolean));
    const names = new Set(mine.map((p) => p.category));
    const rel = new Set(mine.flatMap(relatedOf));
    return all
      .filter((p) => p.active && !p.soon && (p.stock == null || p.stock > 0) && !inCart.has(p.slug))
      .map((p) => ({ p, score: (rel.has(p.slug) ? 4 : 0) + (p.shop_cat && cats.has(p.shop_cat) ? 2 : 0) + (names.has(p.category) ? 1 : 0) }))
      .sort((a, b) => b.score - a.score || (a.p.sort ?? 0) - (b.p.sort ?? 0))
      .slice(0, sf.upsell_count)
      .map((x) => x.p);
  }, [all, sf, slugKey]);

  function add(p: P) {
    const c = p.colors?.[0];
    const line: CartItem = {
      slug: p.slug,
      color: c?.key ?? '',
      size: '',
      name: c ? `${p.name} (${c.name})` : p.name,
      price: tl(Number(p.price)),
      qty: 1,
      img: c?.img || p.thumb || undefined,
    };
    writeCart([...readCart(), line]);
  }

  if (!on || !sf || !picks.length) return null;
  return (
    <section className="px px-upsell" aria-label={sf.upsell_title}>
      <h2 className="px-h">{sf.upsell_title}</h2>
      <div className="px-row px-row-up">
        {picks.map((p) => {
          const img = p.thumb || p.colors?.[0]?.img;
          return (
            <div className="px-card px-card-up" key={p.slug}>
              <a className="px-card-link" data-rec="upsell" href={`/urun/${p.slug}`}>
                <span className="px-th">{img ? <img src={img} alt="" loading="lazy" /> : null}</span>
                <span className="px-nm">{p.name}</span>
                <span className="px-pr">{tl(Number(p.price))}</span>
              </a>
              {needsChoice(p) ? (
                <a className="px-btn px-btn-sm" href={`/urun/${p.slug}`}>
                  Ürüne git
                </a>
              ) : (
                <button type="button" className="px-btn px-btn-sm" onClick={() => add(p)}>
                  Sepete ekle
                </button>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
