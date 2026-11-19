import { NextResponse } from 'next/server';
import { CONSENT_TEXT, confirmUrl } from '@/lib/marketing';
import { sendEmail, serviceClient } from '@/lib/notify';
import { siteUrl } from '@/lib/siteUrl';

export const dynamic = 'force-dynamic';

const json = (b: object, status = 200) => NextResponse.json(b, { status, headers: { 'Cache-Control': 'no-store' } });
const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

// Bülten kaydı: rıza kutusu zorunlu; rıza kaydı (tarih, metin, kaynak) tutulur, e-posta doğrulama bağlantısı gönderilir.
// Doğrulanana kadar kişiye ticari ileti gönderilmez. Yanıt: { ok, error? }
export async function POST(req: Request) {
  let b: { email?: unknown; source?: unknown; consent?: unknown } = {};
  try {
    b = await req.json();
  } catch {
    return json({ ok: false, error: 'Geçersiz istek' }, 400);
  }
  const email = typeof b.email === 'string' ? b.email.trim().toLowerCase() : '';
  const source = (typeof b.source === 'string' ? b.source : 'site').replace(/[^\w-]/g, '').slice(0, 40) || 'site';
  if (!EMAIL.test(email) || email.length > 120) return json({ ok: false, error: 'Geçerli bir e-posta adresi yaz.' }, 400);
  if (b.consent !== true) return json({ ok: false, error: 'Devam etmek için onay kutusunu işaretlemelisin.' }, 400);
  const sb = serviceClient();
  if (!sb) return json({ ok: false, error: 'Şu an kayıt alınamıyor.' }, 503);

  const hourAgo = new Date(Date.now() - 3600_000).toISOString();
  const { count } = await sb.from('subscribers').select('email', { count: 'exact', head: true }).gt('created_at', hourAgo);
  if ((count ?? 0) > 200) return json({ ok: false, error: 'Şu an çok fazla kayıt var, biraz sonra tekrar dene.' }, 429);

  const { data: cur } = await sb.from('subscribers').select('confirmed_at,unsubscribed,confirm_sent_at').eq('email', email).maybeSingle();
  const now = new Date().toISOString();
  if (cur?.confirmed_at && !cur.unsubscribed) return json({ ok: true, already: true });
  // Aynı adrese 1 saatte en fazla bir doğrulama e-postası (başkasının adresine tekrar tekrar posta atılmasın)
  if (cur?.confirm_sent_at && Date.now() - new Date(cur.confirm_sent_at).getTime() < 3600_000 && !cur.unsubscribed) return json({ ok: true, pending: true });
  const row = { email, source, consent: true, consent_at: now, consent_text: CONSENT_TEXT, confirm_sent_at: now };
  const { error } = cur
    ? await sb.from('subscribers').update({ ...row, unsubscribed: false, unsubscribed_at: null, confirmed_at: null }).eq('email', email)
    : await sb.from('subscribers').insert({ ...row, unsubscribed: false });
  if (error) return json({ ok: false, error: 'Kaydın alınamadı. Biraz sonra tekrar dene.' }, 500);

  const r = await sendEmail({
    to: email,
    subject: 'Demleme bültenine kaydını onayla',
    text: `Merhaba,\n\nDemleme bültenine bu e-posta adresiyle kayıt istendi. Ticari elektronik ileti (kampanya, yeni ürün ve bölüm duyuruları) almak istiyorsan aşağıdaki bağlantıya tıklayıp onayla:\n\n${confirmUrl(email)}\n\nBu isteği sen yapmadıysan bu e-postayı yok sayabilirsin; onaylamadığın sürece sana ticari ileti gönderilmez.\n\nİzin metni: ${siteUrl()}/acik-riza-ticari-ileti\n\nDemleme`,
  });
  await sb.from('message_log').insert({ channel: 'email', to_addr: email, template: 'newsletter_confirm', subject: 'Demleme bültenine kaydını onayla', status: r.status, error: r.error ?? null });
  if (r.status === 'failed') return json({ ok: false, error: 'Doğrulama e-postası gönderilemedi. Biraz sonra tekrar dene.' }, 502);
  return json({ ok: true, pending: true });
}
