import { NextResponse } from 'next/server';
import { iyzicoCfg, settleToken } from '@/lib/iyzico';
import { siteUrl } from '@/lib/siteUrl';

export const dynamic = 'force-dynamic';

// iyzico, müşteriyi ödeme sonrası buraya POST (form-data: token) ile döndürür.
export async function POST(req: Request) {
  const to = (q: string) => NextResponse.redirect(`${siteUrl()}/siparis-tamamlandi${q}`, 303);
  const cfg = iyzicoCfg();
  if (!cfg) return to('?durum=hata');
  let token = '';
  try {
    token = String((await req.formData()).get('token') || '');
  } catch {
    /* boş */
  }
  const r = await settleToken(cfg, token);
  const no = r.orderNo ? `no=${encodeURIComponent(r.orderNo)}&` : '';
  return to(`?${no}durum=${r.state === 'bilinmiyor' ? 'hata' : r.state}`);
}

// Tarayıcı adresi doğrudan açılırsa ana akışa dön.
export function GET() {
  return NextResponse.redirect(`${siteUrl()}/siparis-tamamlandi`, 303);
}
