import { NextResponse } from 'next/server';
import { CONSENT_TEXT } from '@/lib/marketing';
import { renderTemplate, serviceClient } from '@/lib/notify';
import { renderEmailHtml, tokenVars } from '@/lib/emailHtml';
import { sendMarketing } from '@/lib/marketing';

export const dynamic = 'force-dynamic';

const json = (b: object, status = 200) => NextResponse.json(b, { status, headers: { 'Cache-Control': 'no-store' } });
const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

// Bülten kaydı: rıza kutusu zorunlu; rıza kaydı (tarih, metin, kaynak) tutulur; e-posta doğrulaması aranmaz. Yanıt: { ok, error? }
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

  const { data: cur } = await sb.from('subscribers').select('confirmed_at,unsubscribed').eq('email', email).maybeSingle();
  const now = new Date().toISOString();
  if (cur?.confirmed_at && !cur.unsubscribed) return json({ ok: true, already: true });
  // Tek adımlı kayıt: onay kutusu işaretlenince rıza kaydı (tarih, metin, kaynak) tutulur ve izin hemen geçerli olur.
  const row = { email, source, consent: true, consent_at: now, consent_text: CONSENT_TEXT, confirmed_at: now };
  const { error } = cur
    ? await sb.from('subscribers').update({ ...row, unsubscribed: false, unsubscribed_at: null }).eq('email', email)
    : await sb.from('subscribers').insert({ ...row, unsubscribed: false });
  if (error) return json({ ok: false, error: 'Kaydın alınamadı. Biraz sonra tekrar dene.' }, 500);
  // Hoş geldin e-postası (panel → Mesaj şablonları → welcome). Gönderilemese de kayıt başarılıdır.
  try {
    const { data: t } = await sb.from('message_templates').select('subject,body,email_on').eq('key', 'welcome').maybeSingle();
    if (t && t.email_on) {
      const vars: Record<string, string> = {};
      const subject = renderTemplate(String(t.subject), vars);
      const r = await sendMarketing(sb, {
        to: email,
        subject,
        text: renderTemplate(String(t.body), vars),
        html: (f) => renderEmailHtml(renderTemplate(String(t.body), tokenVars(vars)), vars, { preheader: 'Demleme ailesine hoş geldin.', ...f }),
      });
      await sb.from('message_log').insert({ channel: 'email', to_addr: email, template: 'welcome', subject, status: r.status, error: r.error ?? null, order_no: null });
    }
  } catch {
    /* hoş geldin e-postası kaydı engellemez */
  }
  return json({ ok: true });
}
