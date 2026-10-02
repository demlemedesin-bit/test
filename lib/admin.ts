'use client';

import { useCallback, useEffect, useState } from 'react';
import { supabase } from './supabase';
import { useAuth } from './auth';
import type { OrderRow } from '@/components/OrderParts';

export const tl = (n: number) =>
  '₺' + Number(n).toLocaleString('tr-TR', { minimumFractionDigits: Number.isInteger(Number(n)) ? 0 : 2, maximumFractionDigits: 2 });

export const dt = (iso?: string | null, time = false) =>
  iso
    ? new Date(iso).toLocaleString('tr-TR', time ? { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' } : { day: 'numeric', month: 'short', year: 'numeric' })
    : '—';

export type AdminOrder = OrderRow & {
  id: string;
  user_id: string | null;
  email: string;
  full_name: string;
  phone: string;
  note: string | null;
  admin_note: string | null;
  tracking_carrier: string | null;
  tracking_no: string | null;
  paid_at: string | null;
  shipped_at: string | null;
  updated_at: string;
  created_at: string;
  items: (OrderRow['items'][number] & { slug?: string })[];
};

export type Color = { key: string; name: string; hex: string; img: string };
export type AdminProduct = {
  slug: string;
  name: string;
  category: string;
  shop_cat: 'sofra' | 'giyim' | 'aksesuar';
  price: number;
  stock: number | null;
  colors: Color[];
  sizes: string[];
  soon: boolean;
  active: boolean;
  thumb: string | null;
  sort: number;
  data: { desc?: string; badge?: string; details?: string[][]; chart?: unknown; sizes?: unknown; size_label?: string };
};

export type Customer = {
  email: string;
  name: string;
  phone: string | null;
  registered: boolean;
  joined_at: string | null;
  role: 'admin' | 'customer' | 'guest';
  orders: number;
  spent: number;
  last_order_at: string | null;
};

/** Oturum + yönetici yetkisi. admin: null = henüz bilinmiyor. */
export function useAdmin() {
  const { session, user, loading } = useAuth();
  const [admin, setAdmin] = useState<boolean | null>(null);
  const uid = user?.id;

  useEffect(() => {
    if (loading) return;
    if (!uid) {
      Promise.resolve().then(() => setAdmin(null));
      return;
    }
    let off = false;
    supabase()
      .rpc('is_admin')
      .then(({ data, error }) => {
        if (!off) setAdmin(!error && data === true);
      });
    return () => {
      off = true;
    };
  }, [loading, uid]);

  return { session, user, loading: loading || (!!uid && admin === null), admin: admin === true };
}

/** Panelde yapılan değişiklik sitede hemen görünsün diye önbelleği yeniler. Başarısız olsa da kayıt bozulmaz (en geç 60 sn). */
export async function refreshSite(): Promise<void> {
  try {
    const { data } = await supabase().auth.getSession();
    const token = data.session?.access_token;
    if (!token) return;
    await fetch('/api/revalidate', { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
  } catch {
    /* sessizce geç */
  }
}

/** Sipariş sayaçları (kenar çubuğu rozeti). */
export function usePendingCounts(enabled: boolean) {
  const [c, setC] = useState({ pay: 0, ship: 0 });
  const load = useCallback(async () => {
    const sb = supabase();
    const [a, b] = await Promise.all([
      sb.from('orders').select('id', { count: 'exact', head: true }).eq('status', 'odeme_bekleniyor'),
      sb.from('orders').select('id', { count: 'exact', head: true }).eq('status', 'hazirlaniyor'),
    ]);
    setC({ pay: a.count ?? 0, ship: b.count ?? 0 });
  }, []);
  useEffect(() => {
    if (!enabled) return;
    let off = false;
    const run = () => {
      if (!off) load();
    };
    run();
    const t = setInterval(run, 60000);
    window.addEventListener('admin-orders-changed', run);
    return () => {
      off = true;
      clearInterval(t);
      window.removeEventListener('admin-orders-changed', run);
    };
  }, [enabled, load]);
  return c;
}

export const slugify = (s: string) =>
  s
    .toLocaleLowerCase('tr-TR')
    .replace(/ı/g, 'i')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

/** Görseli tarayıcıda WebP'ye çevirip küçültür (en çok 1400 px). */
export async function toWebp(file: File, max = 1400): Promise<Blob> {
  const bmp = await createImageBitmap(file);
  const k = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const c = document.createElement('canvas');
  c.width = Math.round(bmp.width * k);
  c.height = Math.round(bmp.height * k);
  c.getContext('2d')!.drawImage(bmp, 0, 0, c.width, c.height);
  return await new Promise<Blob>((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('Görsel işlenemedi'))), 'image/webp', 0.86));
}

export async function uploadImage(file: File, folder: string): Promise<string> {
  const blob = await toWebp(file);
  const name = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 7)}.webp`;
  const up = await supabase().storage.from('product-images').upload(name, blob, { contentType: 'image/webp', upsert: false });
  if (up.error) throw up.error;
  return supabase().storage.from('product-images').getPublicUrl(name).data.publicUrl;
}
