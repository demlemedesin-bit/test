import { NextResponse } from 'next/server';
import { hasAnyPerm } from '@/lib/serverAuth';
import { sendMarketing } from '@/lib/marketing';
import { serviceClient } from '@/lib/notify';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const json = (b: object, status = 200) => NextResponse.json(b, { status, headers: { 'Cache-Control': 'no-store' } });
const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const BATCH = 40;

// Panelden toplu e-posta: yalnızca rızası olan, e-postası doğrulanmış ve ayrılmamış kişilere gider.
// Her gönderim ayrılma bağlantısı ve gönderici kimliği içerir. Aynı "key" ile tekrar çağrılınca gönderilenler atlanır (kalan 0 olana kadar tekrar çağrılır).
// Yetki: customers. Gövde: { subject, text, key, test? } → test doluysa yalnızca o adrese bir deneme gider.
export async function POST(req: Request) {
  let b: { subject?: unknown; text?: unknown; key?: unknown; test?: unknown } = {};
  try {
    b = await req.json();
  } catch {
    return json({ ok: false, error: 'Geçersiz istek' }, 400);
  }
  const subject = typeof b.subject === 'string' ? b.subject.trim().slice(0, 150) : '';
  const text = typeof b.text === 'string' ? b.text.trim().slice(0, 20000) : '';
  const key = typeof b.key === 'string' ? b.key.replace(/[^\w-]/g, '').slice(0, 40) : '';
  const test = typeof b.test === 'string' ? b.test.trim().toLowerCase() : '';
  if (!subject || text.length < 10) return json({ ok: false, error: 'Konu ve metin gerekli.' }, 400);
  if (!(await hasAnyPerm(req, ['customers']))) return json({ ok: false, error: 'Yetkin yok' }, 403);
  const sb = serviceClient();
  if (!sb) return json({ ok: false, error: 'Sunucu anahtarı tanımsız' }, 503);

  if (test) {
    if (!EMAIL.test(test)) return json({ ok: false, error: 'Deneme adresi geçersiz.' }, 400);
    const r = await sendMarketing(sb, { to: test, subject: `[DENEME] ${subject}`, text });
    return json({ ok: r.status === 'sent', sent: r.status === 'sent' ? 1 : 0, remaining: 0, error: r.error });
  }
  if (!key) return json({ ok: false, error: 'Gönderim kodu eksik.' }, 400);

  const base = () => sb.from('subscribers').select('email', { count: 'exact' }).eq('consent', true).eq('unsubscribed', false).not('confirmed_at', 'is', null);
  const { data, count, error } = await base().or(`last_sent_key.is.null,last_sent_key.neq.${key}`).order('created_at').limit(BATCH);
  if (error) return json({ ok: false, error: error.message.slice(0, 200) }, 500);
  let sent = 0;
  let failed = 0;
  for (const r of data ?? []) {
    const to = String(r.email);
    const out = await sendMarketing(sb, { to, subject, text });
    await sb.from('message_log').insert({ channel: 'email', to_addr: to, template: 'campaign', subject, status: out.status, error: out.error ?? null });
    if (out.status === 'sent') {
      sent++;
      await sb.from('subscribers').update({ last_sent_key: key }).eq('email', to);
    } else failed++;
  }
  const remaining = Math.max(0, (count ?? 0) - sent - failed);
  return json({ ok: true, sent, failed, remaining: failed ? remaining : remaining, total: count ?? 0 });
}
