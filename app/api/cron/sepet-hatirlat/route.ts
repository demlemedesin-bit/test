import { NextResponse } from 'next/server';
import { notifyCart, serviceClient } from '@/lib/notify';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const LIMIT = 50;

// Vercel Cron (günlük): 3 saatten eski, 3 günden yeni, hiç hatırlatılmamış terk edilmiş sepetlere e-posta yollar.
// Çağrı başına en çok 50 kayıt. Yetki: CRON_SECRET (Vercel otomatik gönderir).
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) return NextResponse.json({ ok: false }, { status: 401 });
  const sb = serviceClient();
  if (!sb) return NextResponse.json({ ok: false, error: 'service role yok' }, { status: 503 });

  const now = Date.now();
  const olderThan = new Date(now - 3 * 3600 * 1000).toISOString();
  const newerThan = new Date(now - 3 * 24 * 3600 * 1000).toISOString();
  const { data, error } = await sb
    .from('abandoned_carts')
    .select('email')
    .is('reminded_at', null)
    .eq('remind_count', 0)
    .lt('updated_at', olderThan)
    .gt('updated_at', newerThan)
    .order('updated_at', { ascending: true })
    .limit(LIMIT);
  if (error) return NextResponse.json({ ok: false, error: error.message.slice(0, 200) }, { status: 500 });

  let sent = 0;
  let skipped = 0;
  let failed = 0;
  for (const r of data ?? []) {
    const email = String(r.email || '');
    if (!email) continue;
    const out = await notifyCart(email);
    if (out.results.some((x) => x.channel === 'email' && x.status === 'sent')) sent++;
    else if (out.results.some((x) => x.status === 'failed')) failed++;
    else skipped++;
  }
  return NextResponse.json({ ok: true, found: data?.length ?? 0, sent, skipped, failed });
}
