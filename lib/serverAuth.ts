import { createClient } from '@supabase/supabase-js';

/** İstekteki Bearer jetonuyla `has_perm` RPC'sini sorar. Yetkiler dizisinden biri yeterlidir. Sunucu rotalarında kullanılır. */
export async function hasAnyPerm(req: Request, perms: string[]): Promise<boolean> {
  const token = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '').trim();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!token || !url || !key) return false;
  try {
    const sb = createClient(url, key, { global: { headers: { Authorization: `Bearer ${token}` } }, auth: { persistSession: false, autoRefreshToken: false } });
    for (const p of perms) {
      const { data, error } = await sb.rpc('has_perm', { p });
      if (!error && data === true) return true;
    }
  } catch {
    /* yetkisiz say */
  }
  return false;
}
