import { createHash } from 'crypto';
import { sendEmail, serviceClient } from '@/lib/notify';
import { GUEST_PATH_RE } from '@/lib/guestConst';
import { siteUrl } from '@/lib/siteUrl';

export const runtime = 'nodejs';
const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });
const clean = (v: unknown, max: number) => (typeof v === 'string' ? v.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '').trim().slice(0, max) : '');

// Konuk başvurusu: doğrulama + IP başına saatte 3 başvuru; kayıt sonrası admin_emails adreslerine bildirim gider.
export async function POST(req: Request) {
  let b: Record<string, unknown> = {};
  try {
    b = await req.json();
  } catch {
    return json({ ok: false, error: 'Geçersiz istek' }, 400);
  }
  if (clean(b.website, 50)) return json({ ok: true }); // bal tuzağı: botlar bu gizli alanı doldurur
  const full_name = clean(b.full_name, 120);
  const email = clean(b.email, 200).toLowerCase();
  const wanted_guest = clean(b.wanted_guest, 600);
  const videoPath = clean(b.video_path, 120);
  const video_name = clean(b.video_name, 160) || null;
  const video_size = Number(b.video_size) > 0 ? Math.min(Math.round(Number(b.video_size)), 200 * 1024 * 1024) : null;
  if (full_name.length < 2) return json({ ok: false, error: 'Adını ve soyadını yaz.' }, 400);
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return json({ ok: false, error: 'Geçerli bir e-posta adresi yaz.' }, 400);
  if (wanted_guest.length < 2) return json({ ok: false, error: 'Kimin hikayesini dinlemek istediğini yaz.' }, 400);
  if (b.consent !== true) return json({ ok: false, error: 'Devam etmek için aydınlatma metnini onaylaman gerekiyor.' }, 400);
  if (videoPath && !GUEST_PATH_RE.test(videoPath)) return json({ ok: false, error: 'Video bilgisi geçersiz. Videoyu yeniden yükle.' }, 400);

  const sb = serviceClient();
  if (!sb) return json({ ok: false, error: 'Şu an başvuru alınamıyor.' }, 503);
  const { data: on } = await sb.from('shop_settings').select('value').eq('key', 'guest_apply_on').maybeSingle();
  if (String(on?.value ?? '') !== '1') return json({ ok: false, error: 'Başvurular şu an kapalı.' }, 403);

  const ip = (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() || 'anon';
  const ip_hash = createHash('sha256').update(ip + 'konuk').digest('hex').slice(0, 24);
  const { count } = await sb.from('guest_applications').select('id', { count: 'exact', head: true }).eq('ip_hash', ip_hash).gte('created_at', new Date(Date.now() - 3600_000).toISOString());
  if ((count ?? 0) >= 3) return json({ ok: false, error: 'Çok fazla başvuru gönderdin. Biraz sonra tekrar dene.' }, 429);

  const { error } = await sb.from('guest_applications').insert({ full_name, email, wanted_guest, video_path: videoPath || null, video_name, video_size, ip_hash, consent: true });
  if (error) return json({ ok: false, error: 'Başvuru kaydedilemedi. Tekrar dene.' }, 500);

  // Bildirim: admin_emails ayarındaki adreslere (kayıt tutulur; hata başvuruyu bozmaz)
  try {
    const { data: s } = await sb.from('shop_settings').select('value').eq('key', 'admin_emails').maybeSingle();
    const admins = String(s?.value ?? '').split(/[,;\s]+/).map((x) => x.trim()).filter((x) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(x)).slice(0, 5);
    const subject = `Yeni konuk başvurusu: ${full_name}`;
    const text = `Demleme'ye yeni bir konuk başvurusu geldi.\n\nAd soyad: ${full_name}\nE-posta: ${email}\nKimin hikayesini dinlemek istersiniz: ${wanted_guest}\nVideo: ${videoPath ? 'yüklendi' : 'yok'}\n\nPanelde gör: ${siteUrl()}/admin/konuk-basvurulari`;
    for (const a of admins) {
      const r = await sendEmail({ to: a, subject, text });
      await sb.from('message_log').insert({ channel: 'email', to_addr: a, template: 'guest_application', subject, status: r.status, error: r.error ?? null, order_no: null });
    }
  } catch {
    /* sessizce geç */
  }
  return json({ ok: true });
}
