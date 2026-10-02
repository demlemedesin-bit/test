import { NextResponse } from 'next/server';
import { hasAnyPerm } from '@/lib/serverAuth';

type Check = { name: string; ok: boolean; detail: string };
const has = (k: string) => !!(process.env[k] || '').trim();

// Yapılandırma durumu: yalnızca değişkenin VAR olup olmadığı döner, değerler asla.
export async function GET(req: Request) {
  if (!(await hasAnyPerm(req, ['system', 'integrations']))) return NextResponse.json({ ok: false, checks: [] }, { status: 403 });

  const base = (process.env.IYZICO_BASE_URL || '').trim();
  const iyz: Check = !base
    ? { name: 'IYZICO_BASE_URL', ok: false, detail: 'Tanımsız' }
    : /sandbox/i.test(base)
      ? { name: 'IYZICO_BASE_URL', ok: true, detail: 'Tanımlı · sandbox (deneme) ortamı' }
      : /^https:\/\/api\.iyzipay\.com\/?$/i.test(base)
        ? { name: 'IYZICO_BASE_URL', ok: true, detail: 'Tanımlı · canlı ortam' }
        : { name: 'IYZICO_BASE_URL', ok: false, detail: 'Tanımlı ama tanınmayan adres' };

  const simple = (name: string, why: string): Check => ({ name, ok: has(name), detail: has(name) ? 'Tanımlı' : `Tanımsız · ${why}` });

  // Google Analytics / Meta Pixel kimlikleri ortam değişkeni değil, panelden (İçerik → site metinleri) girilir
  let ga = false;
  let px = false;
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (url && key) {
      const r = await fetch(`${url}/rest/v1/site_content?select=value&key=eq.texts`, { headers: { apikey: key, Authorization: `Bearer ${key}` }, cache: 'no-store', signal: AbortSignal.timeout(5000) });
      const rows = r.ok ? ((await r.json()) as { value?: Record<string, unknown> }[]) : [];
      const t = rows[0]?.value ?? {};
      ga = /^G-[A-Z0-9]{4,20}$/.test(String(t.ga_id ?? '').trim());
      px = /^\d{5,20}$/.test(String(t.pixel_id ?? '').trim());
    }
  } catch {
    /* durum bilinmiyor = tanımsız say */
  }

  const checks: Check[] = [
    simple('SUPABASE_SERVICE_ROLE_KEY', 'sunucu bildirimleri ve ödeme onayı çalışmaz'),
    simple('NEXT_PUBLIC_SITE_URL', 'bağlantılar Vercel adresine düşer'),
    simple('IYZICO_API_KEY', 'kart ödemesi kapalı'),
    simple('IYZICO_SECRET_KEY', 'kart ödemesi kapalı'),
    iyz,
    simple('SMTP2GO_API_KEY', 'e-posta gönderilmez'),
    simple('MAIL_FROM', 'e-posta gönderilmez'),
    simple('NETGSM_USERCODE', 'SMS gönderilmez'),
    simple('NETGSM_PASSWORD', 'SMS gönderilmez'),
    simple('NETGSM_HEADER', 'SMS gönderilmez'),
    { name: 'N8N_WEBHOOK_URL', ok: has('N8N_WEBHOOK_URL'), detail: has('N8N_WEBHOOK_URL') ? 'Tanımlı' : 'Tanımsız · Webhook sekmesindeki adres kullanılır' },
    simple('WEBHOOK_SECRET', 'webhook imzasız gider'),
    { name: 'Google Analytics kimliği', ok: ga, detail: ga ? 'Panelde tanımlı' : 'Panelde tanımsız (İçerik → site metinleri)' },
    { name: 'Meta Pixel kimliği', ok: px, detail: px ? 'Panelde tanımlı' : 'Panelde tanımsız (İçerik → site metinleri)' },
  ];
  return NextResponse.json({ ok: true, checks }, { headers: { 'Cache-Control': 'no-store' } });
}
