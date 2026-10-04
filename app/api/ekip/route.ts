import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { serviceClient } from '@/lib/notify';

// Tam yönetici, ekip üyesini e-posta + şifreyle doğrudan oluşturur (e-posta onayı / kayıt zorunluluğu yok).
// Yalnızca oturumu açık TAM YÖNETİCİ çağırabilir.
const PERMS = ['orders', 'products', 'customers', 'campaigns', 'content', 'reports', 'tracking', 'integrations', 'system'];

export async function POST(req: Request) {
  const token = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!token || !url || !anon) return NextResponse.json({ ok: false, error: 'Yetkisiz' }, { status: 401 });

  const caller = createClient(url, anon, { global: { headers: { Authorization: `Bearer ${token}` } }, auth: { persistSession: false } });
  const { data: isAdmin, error: e0 } = await caller.rpc('is_admin');
  if (e0 || isAdmin !== true) return NextResponse.json({ ok: false, error: 'Yalnızca tam yönetici ekip üyesi oluşturabilir.' }, { status: 403 });

  const sb = serviceClient();
  if (!sb) return NextResponse.json({ ok: false, error: 'Sunucuda SUPABASE_SERVICE_ROLE_KEY tanımlı değil.' }, { status: 500 });

  let body: { email?: string; password?: string; role?: string; perms?: string[] };
  try { body = await req.json(); } catch { return NextResponse.json({ ok: false, error: 'Geçersiz istek' }, { status: 400 }); }
  const email = String(body.email || '').trim().toLowerCase();
  const password = String(body.password || '');
  const perms = Array.isArray(body.perms) ? body.perms.filter((p) => PERMS.includes(p)) : [];
  if (!/^\S+@\S+\.\S+$/.test(email)) return NextResponse.json({ ok: false, error: 'Geçerli bir e-posta yaz.' }, { status: 400 });
  if (password.length < 8) return NextResponse.json({ ok: false, error: 'Şifre en az 8 karakter olmalı.' }, { status: 400 });
  if (!perms.length) return NextResponse.json({ ok: false, error: 'En az bir yetki seç.' }, { status: 400 });

  // Kullanıcı varsa şifresini güncelle, yoksa oluştur.
  let userId: string | null = null;
  const created = await sb.auth.admin.createUser({ email, password, email_confirm: true });
  if (created.error) {
    const { data: list } = await sb.auth.admin.listUsers({ page: 1, perPage: 1000 });
    const found = list?.users.find((u) => (u.email || '').toLowerCase() === email);
    if (!found) return NextResponse.json({ ok: false, error: created.error.message }, { status: 400 });
    const upd = await sb.auth.admin.updateUserById(found.id, { password, email_confirm: true });
    if (upd.error) return NextResponse.json({ ok: false, error: upd.error.message }, { status: 400 });
    userId = found.id;
  } else {
    userId = created.data.user.id;
  }

  const { data: adm } = await sb.from('profiles').select('role').eq('id', userId).maybeSingle();
  if (adm?.role === 'admin') return NextResponse.json({ ok: false, error: 'Bu kişi zaten tam yönetici.' }, { status: 400 });

  const { error } = await sb.from('staff_roles').upsert({ user_id: userId, role: String(body.role || 'ozel').slice(0, 40), perms }, { onConflict: 'user_id' });
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
