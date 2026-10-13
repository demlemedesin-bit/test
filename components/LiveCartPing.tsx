'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { readCart } from '@/lib/cart';

// Sepeti dolu ziyaretçi sayısını anonim olarak bildirir (yönetim paneli "Şu an sepeti dolu" kutusu).
// Kişisel veri gönderilmez: yalnızca bu sekmeye özgü rastgele kod ve toplam ürün adedi.
const KEY = 'dm-live-sid';
function sid(): string {
  try {
    let s = sessionStorage.getItem(KEY);
    if (!s || !/^[a-z0-9]{10,40}$/.test(s)) {
      s = Array.from(crypto.getRandomValues(new Uint8Array(12)), (x) => (x % 36).toString(36)).join('');
      sessionStorage.setItem(KEY, s);
    }
    return s;
  } catch {
    return '';
  }
}

export function LiveCartPing() {
  const path = usePathname();
  const admin = path?.startsWith('/admin');
  useEffect(() => {
    if (admin) return;
    const id = sid();
    if (!id) return;
    let last = -1;
    const send = (force: boolean) => {
      const qty = readCart().reduce((n, i) => n + i.qty, 0);
      if (!force && qty === last) return;
      if (qty === 0 && last <= 0) {
        last = 0;
        return;
      }
      last = qty;
      fetch('/api/canli-sepet', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sid: id, qty }), keepalive: true }).catch(() => {});
    };
    send(true);
    const tick = setInterval(() => {
      if (document.visibilityState === 'visible') send(true);
    }, 60000);
    const onCart = () => send(false);
    window.addEventListener('demleme-cart', onCart);
    window.addEventListener('storage', onCart);
    return () => {
      clearInterval(tick);
      window.removeEventListener('demleme-cart', onCart);
      window.removeEventListener('storage', onCart);
    };
  }, [admin]);
  return null;
}
