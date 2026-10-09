import { NextResponse } from 'next/server';
import { paynCfg, settleResult } from '@/lib/paynkolay';
import { siteUrl } from '@/lib/siteUrl';

export const dynamic = 'force-dynamic';

// Paynkolay, müşteriyi ödeme sonrası buraya POST (form) ile döndürür (başarılı ve başarısız işlemler aynı adrese gelir).
// Sonuç yalnızca imza (hashDataV2) doğrulanıp Paynkolay'dan teyit edildikten sonra kabul edilir.
export async function POST(req: Request) {
  const to = (q: string) => NextResponse.redirect(`${siteUrl()}/siparis-tamamlandi${q}`, 303);
  const cfg = paynCfg();
  if (!cfg) return to('?durum=hata');
  const f: Record<string, string> = {};
  try {
    (await req.formData()).forEach((v, k) => {
      if (typeof v === 'string') f[k] = v;
    });
  } catch {
    /* boş */
  }
  const r = await settleResult(cfg, f);
  const no = r.orderNo ? `no=${encodeURIComponent(r.orderNo)}&` : '';
  return to(`?${no}durum=${r.state === 'bilinmiyor' ? 'hata' : r.state}`);
}

// Tarayıcı adresi doğrudan açılırsa ana akışa dön.
export function GET() {
  return NextResponse.redirect(`${siteUrl()}/siparis-tamamlandi`, 303);
}
