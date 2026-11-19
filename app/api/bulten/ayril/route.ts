import { NextResponse } from 'next/server';
import { serviceClient } from '@/lib/notify';
import { verify } from '@/lib/marketing';
import { siteUrl } from '@/lib/siteUrl';

export const dynamic = 'force-dynamic';

async function unsub(email: string, token: string): Promise<boolean> {
  if (!verify(email, 'ayril', token)) return false;
  const sb = serviceClient();
  if (!sb) return false;
  const { error } = await sb.from('subscribers').update({ unsubscribed: true, unsubscribed_at: new Date().toISOString() }).eq('email', email);
  return !error;
}

// Sayfadaki "Abonelikten çık" düğmesi (form POST) ve e-posta istemcilerinin tek tıkla ayrılma isteği (RFC 8058) buraya gelir.
export async function POST(req: Request) {
  const u = new URL(req.url);
  let email = (u.searchParams.get('e') || '').trim().toLowerCase();
  let token = u.searchParams.get('t') || '';
  if (!email) {
    try {
      const f = await req.formData();
      email = String(f.get('e') || '').trim().toLowerCase();
      token = String(f.get('t') || '');
    } catch {
      /* gövde yok */
    }
  }
  const ok = await unsub(email, token);
  const accept = req.headers.get('accept') || '';
  if (accept.includes('text/html')) return NextResponse.redirect(`${siteUrl()}/bulten?s=${ok ? 'ayrildi' : 'hata'}`, 303);
  return NextResponse.json({ ok }, { status: ok ? 200 : 400 });
}
