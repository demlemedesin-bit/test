'use client';

import { useCallback, useEffect, useState } from 'react';

export type CartItem = {
  slug: string;
  color: string; // renk anahtarı (products.colors[].key)
  size: string; // beden, yoksa ''
  name: string; // sepette görünen ad (renk/beden dahil)
  price: string; // gösterim fiyatı, örn "₺650" (asıl fiyat sunucudan gelir)
  qty: number;
  img?: string;
};

export const CART_KEY = 'demleme-cart';
export const MAX_QTY = 9;

export const lineKey = (i: Pick<CartItem, 'slug' | 'color' | 'size'>) => `${i.slug}|${i.color}|${i.size || ''}`;

const valid = (x: unknown): x is CartItem => {
  const i = x as CartItem;
  return !!i && typeof i.slug === 'string' && i.slug !== '' && typeof i.qty === 'number' && i.qty >= 1 && typeof i.name === 'string';
};

export function readCart(): CartItem[] {
  try {
    const raw = JSON.parse(localStorage.getItem(CART_KEY) || '[]');
    return Array.isArray(raw)
      ? raw.filter(valid).map((i) => ({ ...i, color: i.color || '', size: i.size || '', qty: Math.min(MAX_QTY, Math.floor(i.qty)) }))
      : [];
  } catch {
    return [];
  }
}

export function writeCart(items: CartItem[]) {
  try {
    localStorage.setItem(CART_KEY, JSON.stringify(items));
  } catch {
    /* depolama kapalıysa sepet bu oturumla sınırlı kalır */
  }
  window.dispatchEvent(new Event('demleme-cart'));
}

export function useCart() {
  const [items, setItems] = useState<CartItem[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const sync = () => {
      setItems(readCart());
      setReady(true);
    };
    sync();
    window.addEventListener('demleme-cart', sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener('demleme-cart', sync);
      window.removeEventListener('storage', sync);
    };
  }, []);

  const setQty = useCallback((key: string, qty: number) => {
    const next = readCart()
      .map((i) => (lineKey(i) === key ? { ...i, qty: Math.min(MAX_QTY, qty) } : i))
      .filter((i) => i.qty > 0);
    writeCart(next);
  }, []);
  const remove = useCallback((key: string) => writeCart(readCart().filter((i) => lineKey(i) !== key)), []);
  const clear = useCallback(() => writeCart([]), []);

  return { items, ready, setQty, remove, clear };
}
