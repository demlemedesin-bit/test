import { NextResponse } from 'next/server';
import { iyzicoCfg } from '@/lib/iyzico';
import { serviceClient } from '@/lib/notify';

// Kart seçeneği /odeme sayfasında yalnızca sunucu hazırsa açılır (anahtarlar değil, sadece evet/hayır döner).
export const dynamic = 'force-dynamic';
export function GET() {
  return NextResponse.json({ iyzico: !!iyzicoCfg() && !!serviceClient() });
}
