import { NextResponse } from 'next/server';
import { hasAnyPerm } from '@/lib/serverAuth';
import { notifyStock } from '@/lib/notifyStock';

export const dynamic = 'force-dynamic';

const json = (b: object, status = 200) => NextResponse.json(b, { status, headers: { 'Cache-Control': 'no-store' } });
const inflight = new Set<string>();

// Panelden "Haber ver": ürün stoktayken bekleyen e-posta kayıtlarına bildirim yollar.
// Yetki: products ya da customers (Bearer personel jetonu). Yanıt: { ok, sent, skipped, error? }
export async function POST(req: Request) {
  let b: { slug?: unknown } = {};
  try {
    b = await req.json();
  } catch {
    return json({ ok: false, sent: 0, skipped: 0, error: 'Geçersiz istek' }, 400);
  }
  const slug = typeof b.slug === 'string' ? b.slug.trim() : '';
  if (!/^[A-Za-z0-9_-]{1,100}$/.test(slug)) return json({ ok: false, sent: 0, skipped: 0, error: 'Ürün adresi geçersiz' }, 400);
  if (!(await hasAnyPerm(req, ['products', 'customers']))) return json({ ok: false, sent: 0, skipped: 0, error: 'Yetkin yok' }, 403);
  if (inflight.has(slug)) return json({ ok: false, sent: 0, skipped: 0, error: 'Bu ürün için gönderim sürüyor' }, 409);
  inflight.add(slug);
  try {
    return json(await notifyStock(slug));
  } finally {
    inflight.delete(slug);
  }
}
