'use client';

import { useEffect, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from './supabase';

/** Oturum durumu: loading bitene kadar user=null'a güvenme. */
export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const sb = supabase();
    let off = false;
    sb.auth.getSession().then(({ data }) => {
      if (!off) {
        setSession(data.session);
        setLoading(false);
      }
    });
    const { data: sub } = sb.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      setLoading(false);
    });
    return () => {
      off = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  return { session, user: (session?.user ?? null) as User | null, loading };
}

/** ?next= yalnızca site içi yollara izin verir (açık yönlendirme yok). */
export function safeNext(fallback = '/hesabim'): string {
  try {
    const n = new URLSearchParams(window.location.search).get('next') || '';
    return n.startsWith('/') && !n.startsWith('//') && !n.includes('\\') ? n : fallback;
  } catch {
    return fallback;
  }
}

export function authMessage(err: { message?: string; code?: string; status?: number } | null): string {
  if (!err) return '';
  const m = (err.message || '').toLowerCase();
  const c = err.code || '';
  if (c === 'invalid_credentials' || m.includes('invalid login')) return 'E-posta veya şifre hatalı.';
  if (c === 'email_not_confirmed' || m.includes('not confirmed')) return 'E-postanı henüz doğrulamadın. Gelen kutundaki bağlantıya tıkla.';
  if (c === 'user_already_exists' || m.includes('already registered')) return 'Bu e-posta ile zaten bir hesap var. Giriş yapmayı dene.';
  if (c === 'weak_password' || m.includes('password should')) return 'Şifren en az 8 karakter olmalı.';
  if (c === 'over_email_send_rate_limit' || err.status === 429 || m.includes('rate limit')) return 'Kısa sürede çok fazla deneme yapıldı. Biraz bekleyip tekrar dene.';
  if (c === 'same_password' || m.includes('different from the old')) return 'Yeni şifren eskisinden farklı olmalı.';
  if (m.includes('failed to fetch') || m.includes('network')) return 'Bağlantı kurulamadı. İnternetini kontrol edip tekrar dene.';
  return 'Bir sorun oluştu. Biraz sonra tekrar dene.';
}
