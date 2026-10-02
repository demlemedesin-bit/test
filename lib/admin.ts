'use client';

import { useCallback, useEffect, useState } from 'react';
import { supabase } from './supabase';
import { useAuth } from './auth';
import { compressImage, getMediaSettings, uploadImageDetailed } from './media';
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
  coupon_code?: string | null;
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

export const PERMS = [
  { key: 'orders', label: 'Siparişler' },
  { key: 'products', label: 'Ürünler ve stok' },
  { key: 'customers', label: 'Müşteriler' },
  { key: 'campaigns', label: 'Kampanya ve indirim' },
  { key: 'content', label: 'İçerik (site, blog, sayfalar)' },
  { key: 'reports', label: 'Raporlar' },
  { key: 'tracking', label: 'Takip (UTM)' },
  { key: 'integrations', label: 'Entegrasyonlar' },
  { key: 'system', label: 'Sistem ve kullanıcılar' },
] as const;
export type Perm = (typeof PERMS)[number]['key'];

/** Hazır rol şablonları (Sistem sayfasında seçilir). */
export const ROLE_TEMPLATES: { key: string; label: string; perms: Perm[] }[] = [
  { key: 'depo', label: 'Depo', perms: ['orders', 'products'] },
  { key: 'muhasebe', label: 'Muhasebe', perms: ['orders', 'reports', 'customers'] },
  { key: 'icerik', label: 'İçerik editörü', perms: ['content'] },
  { key: 'pazarlama', label: 'Pazarlama', perms: ['campaigns', 'tracking', 'reports', 'content'] },
  { key: 'musteri', label: 'Müşteri hizmetleri', perms: ['orders', 'customers'] },
];

/** Oturum + panel yetkileri. perms boşsa panele giremez. */
export function useAdmin() {
  const { session, user, loading } = useAuth();
  const [perms, setPerms] = useState<string[] | null>(null);
  const [full, setFull] = useState(false);
  const uid = user?.id;

  useEffect(() => {
    if (loading) return;
    if (!uid) {
      Promise.resolve().then(() => setPerms(null));
      return;
    }
    let off = false;
    Promise.all([supabase().rpc('my_perms'), supabase().rpc('is_admin')]).then(([p, a]) => {
      if (off) return;
      setPerms(!p.error && Array.isArray(p.data) ? (p.data as string[]) : []);
      setFull(!a.error && a.data === true);
    });
    return () => {
      off = true;
    };
  }, [loading, uid]);

  const list = perms ?? [];
  return {
    session,
    user,
    loading: loading || (!!uid && perms === null),
    admin: list.length > 0,
    isAdmin: full,
    perms: list,
    can: (p: Perm) => list.includes(p),
  };
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

/** Görseli tarayıcıda (Medya ayarlarına göre) küçültür. Eski imza korunur; max verilirse o sınır kullanılır. */
export async function toWebp(file: File, max?: number): Promise<Blob> {
  const s = await getMediaSettings();
  return (await compressImage(file, s, { maxPx: max, force: true })).blob;
}

/** Medya ayarlarına göre sıkıştırıp yükler, herkese açık adresi döner. */
export async function uploadImage(file: File, folder: string): Promise<string> {
  return (await uploadImageDetailed(file, folder)).url;
}

export { uploadImageDetailed };
