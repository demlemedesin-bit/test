import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { makePass, PASS_COOKIE, PASS_TTL_S } from '@/lib/maintenancePass';

export const dynamic = 'force-dynamic';

// Yönetim paneline giren personel için bakım modunu atlatan çerez verir.
// Yalnızca oturumu açık personel (jeton Supabase'e sorularak doğrulanır) alabilir.
export async function POST(req: Request) {
  const token = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!token || !url || !key) return NextResponse.json({ ok: false }, { status: 401 });
  const sb = createClient(url, key, { global: { headers: { Authorization: `Bearer ${token}` } }, auth: { persistSession: false } });
  const { data, error } = await sb.rpc('is_staff');
  if (error || data !== true) return NextResponse.json({ ok: false }, { status: 403 });
  const v = makePass();
  if (!v) return NextResponse.json({ ok: false }, { status: 503 });
  const res = NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
  res.cookies.set(PASS_COOKIE, v, { httpOnly: true, secure: true, sameSite: 'lax', path: '/', maxAge: PASS_TTL_S });
  return res;
}
