import { NextResponse } from 'next/server';
import { iyzicoCfg, settleToken, webhookSignatureOk } from '@/lib/iyzico';

export const dynamic = 'force-dynamic';

// iyzico webhook (yedek onay). İmza geçerliyse yine de durumu iyzico'dan sorgulayıp işler; idempotenttir.
export async function POST(req: Request) {
  const cfg = iyzicoCfg();
  if (!cfg) return NextResponse.json({ ok: false }, { status: 503 });
  let p: { iyziEventType?: string; iyziPaymentId?: string | number; token?: string; paymentConversationId?: string; status?: string } = {};
  try {
    p = await req.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  if (!webhookSignatureOk(cfg, req.headers.get('x-iyz-signature-v3'), p)) return NextResponse.json({ ok: false }, { status: 401 });
  if (p.token) await settleToken(cfg, p.token).catch((e) => console.error('[iyzico] webhook', e));
  return NextResponse.json({ ok: true });
}
