import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { hasAnyPerm } from '@/lib/serverAuth';
import { serviceClient } from '@/lib/notify';
import { pushConfigured, sendToSubs } from '@/lib/push';

export const dynamic = 'force-dynamic';
const json = (b: Record<string, unknown>, status = 200) => NextResponse.json(b, { status, headers: { 'Cache-Control': 'no-store' } });

// Tarayıcı abonelik için herkese açık VAPID anahtarını ister (gizli değildir).
export async function GET() {
  const key = process.env.VAPID_PUBLIC_KEY;
  if (!key || !pushConfigured()) return json({ ok: false, error: 'Bildirim anahtarları sunucuda tanımlı değil.' }, 503);
  return json({ ok: true, key });
}

async function userIdOf(req: Request): Promise<string | null> {
  const token = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '').trim();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!token || !url || !anon) return null;
  const { data } = await createClient(url, anon, { auth: { persistSession: false, autoRefreshToken: false } }).auth.getUser(token);
  return data.user?.id ?? null;
}

type Sub = { endpoint?: unknown; keys?: { p256dh?: unknown; auth?: unknown } };

// action: subscribe | unsubscribe | status | test — hepsi yetkili (siparişleri görebilen) yönetici oturumu ister.
export async function POST(req: Request) {
  if (!(await hasAnyPerm(req, ['orders']))) return json({ ok: false, error: 'Yetkin yok' }, 403);
  const uid = await userIdOf(req);
  if (!uid) return json({ ok: false, error: 'Oturum bulunamadı' }, 401);
  const sb = serviceClient();
  if (!sb) return json({ ok: false, error: 'SUPABASE_SERVICE_ROLE_KEY tanımsız' }, 500);
  let b: { action?: unknown; subscription?: Sub; endpoint?: unknown; label?: unknown } = {};
  try {
    b = await req.json();
  } catch {
    return json({ ok: false, error: 'Geçersiz istek' }, 400);
  }
  const action = typeof b.action === 'string' ? b.action : '';
  const endpoint = typeof b.endpoint === 'string' ? b.endpoint : typeof b.subscription?.endpoint === 'string' ? b.subscription.endpoint : '';

  if (action === 'subscribe') {
    const s = b.subscription;
    const p256dh = typeof s?.keys?.p256dh === 'string' ? s.keys.p256dh : '';
    const auth = typeof s?.keys?.auth === 'string' ? s.keys.auth : '';
    if (!/^https:\/\//.test(endpoint) || endpoint.length > 1000 || !p256dh || !auth) return json({ ok: false, error: 'Geçersiz abonelik' }, 400);
    const label = (typeof b.label === 'string' ? b.label : '').slice(0, 80) || null;
    const { error } = await sb.from('push_subscriptions').upsert({ endpoint, p256dh, auth, user_id: uid, label, last_error: null }, { onConflict: 'endpoint' });
    if (error) return json({ ok: false, error: 'Kaydedilemedi: ' + error.message }, 500);
    return json({ ok: true });
  }
  if (action === 'unsubscribe') {
    if (!endpoint) return json({ ok: false, error: 'Adres gerekli' }, 400);
    await sb.from('push_subscriptions').delete().eq('endpoint', endpoint).eq('user_id', uid);
    return json({ ok: true });
  }
  if (action === 'status') {
    const { data } = await sb.from('push_subscriptions').select('endpoint,label,last_ok_at,last_error,created_at').eq('user_id', uid);
    const mine = data ?? [];
    return json({ ok: true, configured: pushConfigured(), devices: mine.length, thisDevice: !!endpoint && mine.some((m) => m.endpoint === endpoint), list: mine.map((m) => ({ label: m.label, last_ok_at: m.last_ok_at, last_error: m.last_error, here: m.endpoint === endpoint })) });
  }
  if (action === 'test') {
    const { data: subs } = await sb.from('push_subscriptions').select('id,endpoint,p256dh,auth,label').eq('user_id', uid);
    if (!subs?.length) return json({ ok: false, error: 'Bu hesapta kayıtlı cihaz yok. Önce bildirimi aç.' }, 404);
    const res = await sendToSubs(sb, subs, { title: 'Test bildirimi', body: 'Bildirimler çalışıyor. Yeni siparişler böyle görünecek.', url: '/admin/siparisler', tag: 'test' });
    return json({ ok: res.some((r) => r.ok), results: res.map((r) => ({ label: r.label, ok: r.ok, status: r.status, error: r.error })) });
  }
  return json({ ok: false, error: 'Bilinmeyen işlem' }, 400);
}
