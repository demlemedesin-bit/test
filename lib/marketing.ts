import { createHmac, timingSafeEqual } from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import { configFromMap } from './catalog';
import { sendEmail, serviceClient, type SendResult } from './notify';
import { siteUrl } from './siteUrl';

/**
 * Ticari elektronik ileti (6563 sayılı Kanun): rıza kaydı, e-posta doğrulama (çift onay), ayrılma bağlantısı.
 * Bağlantı imzaları HMAC'tir; ayrı bir ortam değişkeni gerekmez (sunucu anahtarından türetilir). Yalnızca sunucuda kullanılır.
 */

/** Onay kutusunun yanında gösterilen ve rıza kaydına yazılan metin. */
export const CONSENT_TEXT = 'Kampanya ve yeni ürün e-postaları (ticari elektronik ileti) almak istiyorum.';

const secret = () => process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.CRON_SECRET || '';

export function sign(email: string, purpose: 'onay' | 'ayril'): string {
  return createHmac('sha256', secret()).update(`${purpose}:${email.trim().toLowerCase()}`).digest('base64url');
}

export function verify(email: string, purpose: 'onay' | 'ayril', token: string): boolean {
  if (!secret() || !email || !token) return false;
  const a = Buffer.from(sign(email, purpose));
  const b = Buffer.from(token);
  return a.length === b.length && timingSafeEqual(a, b);
}

export const confirmUrl = (email: string) => `${siteUrl()}/api/bulten/onay?e=${encodeURIComponent(email)}&t=${sign(email, 'onay')}`;
export const unsubUrl = (email: string) => `${siteUrl()}/bulten?s=ayril&e=${encodeURIComponent(email)}&t=${sign(email, 'ayril')}`;
export const unsubPostUrl = (email: string) => `${siteUrl()}/api/bulten/ayril?e=${encodeURIComponent(email)}&t=${sign(email, 'ayril')}`;

/** Ticari iletinin altına eklenen gönderici kimliği ve ret bağlantısı. */
export async function marketingFooter(sb: SupabaseClient, email: string): Promise<string> {
  const { data } = await sb.from('shop_settings').select('key,value');
  const m = Object.fromEntries((data ?? []).map((r) => [r.key as string, String(r.value ?? '')]));
  const s = configFromMap(m).seller;
  const who = [s.name, s.address].filter(Boolean).join(' · ');
  return `\n\n—\nBu e-postayı, ticari elektronik ileti izni verdiğin için aldın.${who ? `\nGönderen: ${who}` : ''}\nİzni geri almak (ücretsiz, tek tıkla): ${unsubUrl(email)}`;
}

/** Ticari e-posta gönderir: ret bağlantılı alt bilgi + List-Unsubscribe başlıkları ekler. */
export async function sendMarketing(sb: SupabaseClient, p: { to: string; subject: string; text: string; html?: (f: { who: string; unsubUrl: string; reason: string }) => string }): Promise<SendResult> {
  const footer = await marketingFooter(sb, p.to);
  const { data: st } = await sb.from('shop_settings').select('key,value');
  const sel = configFromMap(Object.fromEntries((st ?? []).map((r) => [r.key as string, String(r.value ?? '')]))).seller;
  return sendEmail({
    to: p.to,
    subject: p.subject,
    text: p.text.trim() + footer,
    ...(p.html ? { html: p.html({ who: [sel.name, sel.address].filter(Boolean).join(' · '), unsubUrl: unsubUrl(p.to), reason: 'Bu e-postayı, ticari elektronik ileti izni verdiğin için aldın.' }) } : {}),
    headers: [
      { header: 'List-Unsubscribe', value: `<${unsubPostUrl(p.to)}>` },
      { header: 'List-Unsubscribe-Post', value: 'List-Unsubscribe=One-Click' },
    ],
  });
}

/** Bu e-posta ticari ileti alabilir mi? (rıza var, e-posta doğrulanmış, ayrılmamış) */
export async function canMarket(sb: SupabaseClient | null, email: string): Promise<boolean> {
  if (!sb) return false;
  const { data } = await sb.from('subscribers').select('consent,confirmed_at,unsubscribed').eq('email', email.trim().toLowerCase()).maybeSingle();
  return !!data && data.consent === true && !!data.confirmed_at && data.unsubscribed === false;
}

export { serviceClient };
