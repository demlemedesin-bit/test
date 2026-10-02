import { revalidatePath, revalidateTag } from 'next/cache';
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { CATALOG_TAG } from '@/lib/catalog';

// Yönetim panelinde ürün/ayar kaydedilince site önbelleğini hemen yeniler.
// Yalnızca oturumu açık YÖNETİCİ çağırabilir (jetonu Supabase'e sorarak doğruluyoruz).
export async function POST(req: Request) {
  const token = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!token || !url || !key) return NextResponse.json({ ok: false }, { status: 401 });

  const sb = createClient(url, key, { global: { headers: { Authorization: `Bearer ${token}` } }, auth: { persistSession: false } });
  const { data, error } = await sb.rpc('is_admin');
  if (error || data !== true) return NextResponse.json({ ok: false }, { status: 403 });

  revalidateTag(CATALOG_TAG, { expire: 0 });
  revalidatePath('/', 'layout');
  return NextResponse.json({ ok: true });
}
