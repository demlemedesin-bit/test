'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { tl } from '@/lib/shop';
import { fetchStorefront, readRecent, type Storefront } from '@/lib/storefront';
import './ProductExtras.css';

/** Yüklenene kadar null döner (bileşenler o ana kadar bir şey çizmez, açılıp kapanma titremesi olmaz). */
export function useStorefront(): Storefront | null {
  const [sf, setSf] = useState<Storefront | null>(null);
  useEffect(() => {
    let off = false;
    fetchStorefront().then((s) => {
      if (!off) setSf(s);
    });
    return () => {
      off = true;
    };
  }, []);
  return sf;
}

type Mini = { slug: string; name: string; price: number; thumb: string | null; colors: { img?: string }[] | null };

/** Son baktığın ürünler. enabled verilmezse vitrin ayarındaki recent_on okunur (sepet sayfası böyle kullanır). */
export function RecentlyViewed({ exclude = [], enabled, limit = 4, title = 'Son baktıkların' }: { exclude?: string[]; enabled?: boolean; limit?: number; title?: string }) {
  const sf = useStorefront();
  const on = enabled ?? sf?.recent_on ?? false;
  const [list, setList] = useState<Mini[]>([]);
  const skip = exclude.join(',');

  useEffect(() => {
    if (!on) return;
    let off = false;
    const t = setTimeout(async () => {
      const ex = new Set(skip ? skip.split(',') : []);
      const slugs = readRecent().filter((s) => !ex.has(s)).slice(0, limit);
      if (!slugs.length) return;
      try {
        const { data, error } = await supabase().from('products').select('slug,name,price,thumb,colors').in('slug', slugs).eq('active', true);
        if (off || error || !data) return;
        const by = new Map((data as Mini[]).map((p) => [p.slug, p]));
        setList(slugs.map((s) => by.get(s)).filter((p): p is Mini => !!p));
      } catch {
        /* görünmesi şart değil */
      }
    }, 0);
    return () => {
      off = true;
      clearTimeout(t);
    };
  }, [on, skip, limit]);

  if (!on || !list.length) return null;
  return (
    <section className="px px-recent" aria-label={title}>
      <h2 className="px-h">{title}</h2>
      <div className="px-row">
        {list.map((p) => (
          <a className="px-card" data-rec="recent" href={`/urun/${p.slug}`} key={p.slug}>
            <span className="px-th">{p.thumb || p.colors?.[0]?.img ? <img src={p.thumb || p.colors?.[0]?.img} alt="" loading="lazy" /> : null}</span>
            <span className="px-nm">{p.name}</span>
            <span className="px-pr">{tl(Number(p.price))}</span>
          </a>
        ))}
      </div>
    </section>
  );
}
