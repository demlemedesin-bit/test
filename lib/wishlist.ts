'use client';

import { useCallback, useEffect, useState } from 'react';
import { supabase } from './supabase';
import { useAuth } from './auth';

/** Favoriler (wishlists tablosu, RLS: yalnızca kendi satırların). Yalnızca oturum açmış kullanıcı için çalışır. */
const EVT = 'dm:wishlist';

export async function listWishlist(): Promise<string[]> {
  const { data, error } = await supabase().from('wishlists').select('product_slug').order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []).map((r) => String((r as { product_slug: string }).product_slug));
}

export async function addWishlist(userId: string, slug: string): Promise<void> {
  const { error } = await supabase().from('wishlists').upsert({ user_id: userId, product_slug: slug }, { onConflict: 'user_id,product_slug', ignoreDuplicates: true });
  if (error) throw error;
}

export async function removeWishlist(slug: string): Promise<void> {
  const { error } = await supabase().from('wishlists').delete().eq('product_slug', slug);
  if (error) throw error;
}

/**
 * Favori listesi kancası. slugs: null = yükleniyor ya da giriş yok (authed ile ayırt et).
 * Değişiklikler iyimser uygulanır; hata olursa geri alınır ve false döner. Aynı sayfadaki tüm kopyalar eşitlenir.
 */
export function useWishlist() {
  const { user, loading: authLoading } = useAuth();
  const uid = user?.id ?? null;
  const [state, setState] = useState<{ uid: string; slugs: string[]; error: boolean } | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const h = () => setTick((n) => n + 1);
    window.addEventListener(EVT, h);
    return () => window.removeEventListener(EVT, h);
  }, []);

  useEffect(() => {
    if (!uid) return;
    let off = false;
    listWishlist()
      .then((slugs) => !off && setState({ uid, slugs, error: false }))
      .catch(() => !off && setState({ uid, slugs: [], error: true }));
    return () => {
      off = true;
    };
  }, [uid, tick]);

  const cur = state && state.uid === uid ? state : null;
  const slugs = cur ? cur.slugs : null;

  const add = useCallback(
    async (slug: string): Promise<boolean> => {
      if (!uid) return false;
      setState((s) => (s && s.uid === uid && !s.slugs.includes(slug) ? { ...s, slugs: [slug, ...s.slugs] } : s));
      try {
        await addWishlist(uid, slug);
        window.dispatchEvent(new Event(EVT));
        return true;
      } catch {
        setState((s) => (s && s.uid === uid ? { ...s, slugs: s.slugs.filter((x) => x !== slug) } : s));
        return false;
      }
    },
    [uid],
  );

  const remove = useCallback(
    async (slug: string): Promise<boolean> => {
      if (!uid) return false;
      let prev: string[] = [];
      setState((s) => {
        if (s && s.uid === uid) prev = s.slugs;
        return s && s.uid === uid ? { ...s, slugs: s.slugs.filter((x) => x !== slug) } : s;
      });
      try {
        await removeWishlist(slug);
        window.dispatchEvent(new Event(EVT));
        return true;
      } catch {
        setState((s) => (s && s.uid === uid ? { ...s, slugs: prev.length ? prev : [slug, ...s.slugs] } : s));
        return false;
      }
    },
    [uid],
  );

  const has = useCallback((slug: string) => !!slugs?.includes(slug), [slugs]);
  const toggle = useCallback((slug: string) => (has(slug) ? remove(slug) : add(slug)), [has, add, remove]);

  return {
    slugs,
    /** Oturum açık mı (açıksa true). */
    authed: !!uid,
    loading: authLoading || (!!uid && !cur),
    error: !!cur?.error,
    has,
    add,
    remove,
    toggle,
  };
}
