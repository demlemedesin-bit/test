import { createHash, randomUUID } from 'crypto';
import { serviceClient } from '@/lib/notify';
import { GUEST_BUCKET, GUEST_EXT, GUEST_MAX_MB, GUEST_MIMES } from '@/lib/guestConst';

export const runtime = 'nodejs';
const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });

// Video yüklemek için tek kullanımlık, tek dosyalık imzalı yükleme adresi verir.
// Böylece herkese açık yazma izni yoktur; boyut ve tür burada ve depo ayarında sınırlanır, IP başına saatte 4 istek.
export async function POST(req: Request) {
  let b: { size?: unknown; type?: unknown } = {};
  try {
    b = await req.json();
  } catch {
    return json({ ok: false, error: 'Geçersiz istek' }, 400);
  }
  const size = Number(b.size);
  const type = typeof b.type === 'string' ? b.type.toLowerCase() : '';
  if (!GUEST_MIMES.includes(type)) return json({ ok: false, error: 'Lütfen bir video dosyası seç (MP4, MOV veya WebM).' }, 400);
  if (!Number.isFinite(size) || size <= 0) return json({ ok: false, error: 'Dosya boyutu okunamadı.' }, 400);
  if (size > GUEST_MAX_MB * 1024 * 1024) return json({ ok: false, error: `Video en fazla ${GUEST_MAX_MB} MB olabilir.` }, 400);

  const sb = serviceClient();
  if (!sb) return json({ ok: false, error: 'Şu an yükleme yapılamıyor.' }, 503);
  const { data: on } = await sb.from('shop_settings').select('value').eq('key', 'guest_apply_on').maybeSingle();
  if (String(on?.value ?? '') !== '1') return json({ ok: false, error: 'Başvurular şu an kapalı.' }, 403);

  const ip = (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() || 'anon';
  const ipHash = createHash('sha256').update(ip + 'konuk').digest('hex').slice(0, 24);
  const since = new Date(Date.now() - 3600_000).toISOString();
  const { count } = await sb.from('guest_upload_log').select('id', { count: 'exact', head: true }).eq('ip_hash', ipHash).gte('at', since);
  if ((count ?? 0) >= 4) return json({ ok: false, error: 'Çok fazla deneme yaptın. Biraz sonra tekrar dene.' }, 429);
  await sb.from('guest_upload_log').insert({ ip_hash: ipHash });

  const ym = new Date().toISOString().slice(0, 7);
  const path = `${ym}/${randomUUID()}.${GUEST_EXT[type]}`;
  const { data, error } = await sb.storage.from(GUEST_BUCKET).createSignedUploadUrl(path);
  if (error || !data) return json({ ok: false, error: 'Yükleme başlatılamadı. Tekrar dene.' }, 500);
  return json({ ok: true, path: data.path ?? path, token: data.token });
}
