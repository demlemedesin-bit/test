import { NextResponse } from 'next/server';
import { serviceClient } from '@/lib/notify';
import { verify } from '@/lib/marketing';
import { siteUrl } from '@/lib/siteUrl';

export const dynamic = 'force-dynamic';

// E-postadaki doğrulama bağlantısı: imza doğruysa abonelik onaylanır.
export async function GET(req: Request) {
  const u = new URL(req.url);
  const email = (u.searchParams.get('e') || '').trim().toLowerCase();
  const to = (s: string) => NextResponse.redirect(`${siteUrl()}/bulten?s=${s}`, 303);
  if (!verify(email, 'onay', u.searchParams.get('t') || '')) return to('hata');
  const sb = serviceClient();
  if (!sb) return to('hata');
  const { data } = await sb.from('subscribers').select('consent,unsubscribed,confirmed_at').eq('email', email).maybeSingle();
  if (!data || !data.consent || data.unsubscribed) return to('hata');
  if (!data.confirmed_at) await sb.from('subscribers').update({ confirmed_at: new Date().toISOString() }).eq('email', email);
  return to('onay');
}
