'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { CartItem } from '@/lib/cart';
import { parseSlots, type SetSlot } from '@/lib/setsConst';
import './Sets.css';

type Def = { slug: string; name: string; price: number; slots: SetSlot[] };
const tl = (n: number) => '₺' + n.toLocaleString('tr-TR', { maximumFractionDigits: 0 });

/** Sepette bir setin bir kısmı varsa "setini tamamla, X kazan" önerisi. Ayarlardan "Sepette göster" açıksa görünür. */
export function SetHints({ items }: { items: CartItem[] }) {
  const [defs, setDefs] = useState<Def[] | null>(null);
  const [prices, setPrices] = useState<Record<string, number>>({});

  useEffect(() => {
    let off = false;
    (async () => {
      try {
        const f = await supabase().from('shop_settings').select('value').eq('key', 'sets_cart').maybeSingle();
        if (String(f.data?.value ?? '') !== '1') return;
        const s = await supabase().from('product_sets').select('slug,name,price,slots').eq('active', true).order('sort', { ascending: true });
        if (off || s.error || !s.data?.length) return;
        const list: Def[] = (s.data as { slug: string; name: string; price: number | string; slots: unknown }[]).map((r) => ({ slug: r.slug, name: r.name, price: Number(r.price), slots: parseSlots(r.slots) }));
        const slugs = [...new Set(list.flatMap((d) => d.slots.flatMap((x) => x.slugs)))];
        const p = await supabase().from('products').select('slug,price').in('slug', slugs).eq('active', true);
        if (off) return;
        setPrices(Object.fromEntries(((p.data ?? []) as { slug: string; price: number | string }[]).map((x) => [x.slug, Number(x.price)])));
        setDefs(list);
      } catch {
        /* öneri olmadan da sepet çalışır */
      }
    })();
    return () => {
      off = true;
    };
  }, []);

  if (!defs) return null;
  const have: Record<string, number> = {};
  for (const i of items) have[i.slug] = (have[i.slug] ?? 0) + i.qty;

  const hints = defs
    .map((d) => {
      const pool = { ...have };
      let matched = 0;
      const missing: string[] = [];
      for (const sl of d.slots) {
        let got = 0;
        for (const s of sl.slugs) {
          while (got < sl.qty && (pool[s] ?? 0) > 0) { pool[s]--; got++; }
        }
        matched += got;
        if (got < sl.qty) missing.push(`${sl.qty - got > 1 ? sl.qty - got + ' ' : ''}${sl.label || 'ürün'}`.toLowerCase());
      }
      const normal = d.slots.reduce((n, sl) => n + Math.min(...sl.slugs.map((s) => prices[s] ?? Infinity)) * sl.qty, 0);
      return { d, matched, missing, save: Number.isFinite(normal) ? normal - d.price : 0 };
    })
    .filter((h) => h.matched > 0 && h.missing.length > 0)
    .slice(0, 2);
  if (!hints.length) return null;
  return (
    <>
      {hints.map((h) => (
        <p key={h.d.slug} className="st-hint" role="status">
          <b>{h.d.name}</b> için {h.missing.join(' + ')} ekle{h.save > 0 ? `, ${tl(h.save)}'ye kadar kazan` : ''}. <a href={`/setler#${h.d.slug}`}>Seti gör →</a>
        </p>
      ))}
    </>
  );
}
