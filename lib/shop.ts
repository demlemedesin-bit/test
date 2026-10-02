'use client';

import { useEffect, useState } from 'react';
import { supabase } from './supabase';
import type { CartItem } from './cart';
import { lineKey } from './cart';

export type DbProduct = {
  slug: string;
  name: string;
  category: string;
  price: number;
  colors: { key: string; name: string }[];
  sizes: string[];
  soon: boolean;
  active: boolean;
  stock?: number | null;
};

export type Settings = { freeFrom: number; fee: number; map: Record<string, string> };

export const tl = (n: number) =>
  '₺' + n.toLocaleString('tr-TR', { minimumFractionDigits: Number.isInteger(n) ? 0 : 2, maximumFractionDigits: 2 });

export async function fetchSettings(): Promise<Settings> {
  const { data, error } = await supabase().from('shop_settings').select('key, value');
  if (error) throw error;
  const map = Object.fromEntries((data ?? []).map((r) => [r.key as string, String(r.value ?? '')]));
  const num = (k: string, d: number) => (map[k] !== undefined && map[k] !== '' && !isNaN(Number(map[k])) ? Number(map[k]) : d);
  return { freeFrom: num('free_shipping_threshold', 750), fee: num('shipping_fee', 0), map };
}

export async function fetchProducts(slugs: string[]): Promise<DbProduct[]> {
  if (!slugs.length) return [];
  const { data, error } = await supabase().from('products').select('*').in('slug', slugs);
  if (error) throw error;
  return (data ?? []).map((p) => ({ ...p, price: Number(p.price) })) as DbProduct[];
}

export type PricedLine = {
  item: CartItem;
  key: string;
  unit: number;
  total: number;
  problem: string | null; // satışta değil / renk geçersiz / beden gerekli
};

export type Priced = {
  lines: PricedLine[];
  subtotal: number;
  shipping: number;
  total: number;
  remainingForFree: number;
  hasProblem: boolean;
};

/** Sepeti sunucudaki fiyatlarla hesaplar (create_order da aynı hesabı yapar). */
export function priceCart(items: CartItem[], products: DbProduct[], s: Settings): Priced {
  const by = new Map(products.map((p) => [p.slug, p]));
  const lines: PricedLine[] = items.map((item) => {
    const p = by.get(item.slug);
    let problem: string | null = null;
    if (!p || !p.active) problem = 'Bu ürün artık satışta değil.';
    else if (p.soon) problem = 'Bu ürün henüz satışta değil.';
    else if (item.color && !p.colors.some((c) => c.key === item.color)) problem = 'Bu renk artık mevcut değil.';
    else if (p.sizes.length && !p.sizes.includes(item.size)) problem = 'Beden seçilmesi gerekiyor.';
    else if (p.stock != null && p.stock < item.qty) problem = p.stock <= 0 ? 'Bu ürün tükendi.' : `Stokta yalnızca ${p.stock} adet var.`;
    const unit = p ? p.price : 0;
    return { item, key: lineKey(item), unit, total: problem ? 0 : unit * item.qty, problem };
  });
  const subtotal = lines.reduce((n, l) => n + l.total, 0);
  const shipping = subtotal === 0 || subtotal >= s.freeFrom ? 0 : s.fee;
  return {
    lines,
    subtotal,
    shipping,
    total: subtotal + shipping,
    remainingForFree: subtotal > 0 && subtotal < s.freeFrom ? s.freeFrom - subtotal : 0,
    hasProblem: lines.some((l) => l.problem),
  };
}

/** Sepetteki ürünlerin güncel fiyatlarını ve ayarları yükler. */
export function usePricedCart(items: CartItem[], ready: boolean) {
  const [state, setState] = useState<{ priced: Priced | null; error: string | null; loading: boolean }>({
    priced: null,
    error: null,
    loading: true,
  });
  const slugKey = [...new Set(items.map((i) => i.slug))].sort().join(',');
  const itemsKey = JSON.stringify(items.map((i) => [lineKey(i), i.qty]));

  useEffect(() => {
    if (!ready) return;
    let off = false;
    (async () => {
      try {
        if (!items.length) {
          if (!off) setState({ priced: null, error: null, loading: false });
          return;
        }
        const [products, settings] = await Promise.all([fetchProducts(slugKey ? slugKey.split(',') : []), fetchSettings()]);
        if (!off) setState({ priced: priceCart(items, products, settings), error: null, loading: false });
      } catch {
        if (!off) setState({ priced: null, error: 'Fiyatlar yüklenemedi. Bağlantını kontrol edip sayfayı yenile.', loading: false });
      }
    })();
    return () => {
      off = true;
    };
    // items içeriği itemsKey ile izlenir
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, slugKey, itemsKey]);

  return state;
}

export const COUPON_KEY = 'demleme-coupon';

export type Quote = {
  subtotal: number;
  shipping: number;
  discount: number;
  total: number;
  coupon: { code: string | null; name: string; kind: string; auto: boolean } | null;
  error: string | null;
};

/** Kupon kodu (oturum boyunca sepet ve ödeme sayfası arasında paylaşılır). */
export function useCouponCode() {
  const [code, setCodeState] = useState('');
  useEffect(() => {
    const t = setTimeout(() => {
      try {
        setCodeState(sessionStorage.getItem(COUPON_KEY) || '');
      } catch {
        /* sorun değil */
      }
    }, 0);
    return () => clearTimeout(t);
  }, []);
  const setCode = (c: string) => {
    const v = c.trim().toUpperCase();
    setCodeState(v);
    try {
      if (v) sessionStorage.setItem(COUPON_KEY, v);
      else sessionStorage.removeItem(COUPON_KEY);
    } catch {
      /* sorun değil */
    }
  };
  return [code, setCode] as const;
}

/** Sunucu hesabı: kupon / otomatik kampanya dahil sepet özeti (quote_cart). Sorun olursa null döner, sayfa yerel hesaba düşer. */
export function useQuote(items: CartItem[], code: string, email: string, enabled: boolean) {
  const [state, setState] = useState<{ quote: Quote | null; busy: boolean }>({ quote: null, busy: false });
  const key = JSON.stringify([items.map((i) => [i.slug, i.qty]), code, email.trim().toLowerCase()]);
  useEffect(() => {
    if (!enabled || !items.length) return;
    let off = false;
    const t = setTimeout(async () => {
      setState((s) => ({ ...s, busy: true }));
      const { data, error } = await supabase().rpc('quote_cart', { p_items: items.map((i) => ({ slug: i.slug, qty: i.qty })), p_code: code || null, p_email: email.trim() || null });
      if (off) return;
      setState({ quote: error || !data ? null : (data as Quote), busy: false });
    }, 300);
    return () => {
      off = true;
      clearTimeout(t);
    };
    // items içeriği key ile izlenir
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, enabled]);
  return enabled && items.length ? state : { quote: null, busy: false };
}
