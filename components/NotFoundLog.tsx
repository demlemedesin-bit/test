'use client';

import { useEffect } from 'react';
import { supabase } from '@/lib/supabase';

/** 404 sayfası açılınca adresi kaydeder (Yönetim → SEO ve reklam → 404 izleme). Hata sessizce yutulur. */
export function NotFoundLog() {
  useEffect(() => {
    try {
      Promise.resolve(supabase().rpc('log_404', { p_path: location.pathname, p_ref: document.referrer })).catch(() => {});
    } catch {
      /* sessizce geç */
    }
  }, []);
  return null;
}
