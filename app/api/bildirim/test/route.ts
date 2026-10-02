import { NextResponse } from 'next/server';
import { hasAnyPerm } from '@/lib/serverAuth';
import { renderTemplate, sendEmail, serviceClient } from '@/lib/notify';
import { siteUrl } from '@/lib/siteUrl';

const json = (b: { ok: boolean; skipped?: boolean; error?: string }, status = 200) => NextResponse.json(b, { status, headers: { 'Cache-Control': 'no-store' } });

// Entegrasyonlar sayfasındaki "Test gönder": seçilen şablonu örnek verilerle yetkilinin yazdığı adrese yollar.
export async function POST(req: Request) {
  if (!(await hasAnyPerm(req, ['integrations']))) return json({ ok: false, error: 'Yetkin yok' }, 403);
  let b: { to?: unknown; template?: unknown } = {};
  try {
    b = await req.json();
  } catch {
    return json({ ok: false, error: 'Geçersiz istek' }, 400);
  }
  const to = typeof b.to === 'string' ? b.to.trim() : '';
  const key = typeof b.template === 'string' ? b.template : '';
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(to) || to.length > 160) return json({ ok: false, error: 'Geçerli bir e-posta gir' }, 400);
  const sb = serviceClient();
  if (!sb) return json({ ok: true, skipped: true, error: 'SUPABASE_SERVICE_ROLE_KEY tanımsız' });
  const { data: t } = await sb.from('message_templates').select('key,subject,body').eq('key', key).maybeSingle();
  if (!t) return json({ ok: false, error: 'Şablon bulunamadı' }, 404);

  const base = siteUrl();
  const vars: Record<string, string> = {
    name: 'Deneme',
    order_no: 'DM-0000',
    total: '₺1.250',
    track_url: `${base}/siparis-takip?no=DM-0000`,
    carrier: 'Yurtiçi Kargo',
    tracking_no: '1234567890',
    carrier_url: 'https://www.yurticikargo.com/',
    payment_info: 'Ödemeyi havale / EFT ile yapabilirsin. (Örnek metin)',
    cart_items: '- 1 × Örnek ürün · ₺420\n- 2 × Başka ürün · ₺830',
    cart_url: `${base}/sepet`,
  };
  const subject = '[TEST] ' + renderTemplate(String(t.subject), vars);
  const r = await sendEmail({ to, subject, text: renderTemplate(String(t.body), vars) });
  try {
    await sb.from('message_log').insert({ channel: 'email', to_addr: to, template: `${key} (test)`, subject, status: r.status, error: r.error ?? null });
  } catch {
    /* günlük yazılamadı */
  }
  if (r.status === 'failed') return json({ ok: false, error: r.error || 'Gönderilemedi' });
  return json({ ok: true, skipped: r.status === 'skipped', error: r.status === 'skipped' ? r.error : undefined });
}
