import { NextResponse } from 'next/server';
import { paynCfg } from '@/lib/paynkolay';
import { serviceClient } from '@/lib/notify';

// Kart seçeneği /odeme sayfasında yalnızca sunucu hazırsa açılır (anahtarlar değil, sadece evet/hayır döner).
export const dynamic = 'force-dynamic';
export function GET() {
  return NextResponse.json({ kart: !!paynCfg() && !!serviceClient() });
}
