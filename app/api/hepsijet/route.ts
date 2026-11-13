import { NextResponse } from 'next/server';
import { serviceClient } from '@/lib/notify';
import { hasAnyPerm } from '@/lib/serverAuth';
import {
  buildPayload, CARRIER_NAME, credsFor, errMsg, findFile, findZpl, hj, isOk, loadCfg, missing, parseTracking, productDesis,
  type HjEnv, type OrderRec,
} from '@/lib/hepsijet';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const J = (b: Record<string, unknown>, status = 200) => NextResponse.json(b, { status, headers: { 'Cache-Control': 'no-store' } });
const enc = encodeURIComponent;

type Ship = { order_no: string; barcode: string; env: HjEnv; desi: number | null; parcels: number; status: string };

// Hazırlık durumu: yalnızca "tanımlı mı" bilgisi döner, değerler asla.
export async function GET(req: Request) {
  if (!(await hasAnyPerm(req, ['orders', 'integrations', 'system']))) return J({ ok: false, error: 'Yetkisiz' }, 403);
  const c = await loadCfg();
  if (!c) return J({ ok: false, error: 'Sunucu ayarları okunamadı.' }, 503);
  return J({ ok: true, enabled: c.enabled, env: c.env, ready: c.enabled && missing(c).length === 0, missing: missing(c), creds: { test: !!credsFor('test'), prod: !!credsFor('prod') } });
}

export async function POST(req: Request) {
  if (!(await hasAnyPerm(req, ['orders']))) return J({ ok: false, error: 'Yetkisiz' }, 403);
  let b: Record<string, unknown> = {};
  try {
    b = (await req.json()) as Record<string, unknown>;
  } catch {
    return J({ ok: false, error: 'Geçersiz istek.' }, 400);
  }
  const action = String(b.action || '');
  const orderNo = String(b.order_no || '').trim().toUpperCase();
  if (!/^[A-Z0-9-]{3,30}$/.test(orderNo)) return J({ ok: false, error: 'Sipariş numarası geçersiz.' }, 400);
  const sb = serviceClient();
  if (!sb) return J({ ok: false, error: 'SUPABASE_SERVICE_ROLE_KEY tanımlı değil.' }, 503);

  try {
    // ── Yeni gönderi ──
    if (action === 'gonder') {
      const c = await loadCfg(sb);
      if (!c) return J({ ok: false, error: 'Ayarlar okunamadı.' }, 503);
      if (!c.enabled) return J({ ok: false, error: 'HepsiJET entegrasyonu kapalı (Entegrasyonlar → Kargo).' }, 409);
      const miss = missing(c);
      if (miss.length) return J({ ok: false, error: 'Eksik ayar: ' + miss.join(', ') }, 409);

      const { data: o, error } = await sb.from('orders').select('order_no, status, payment_method, full_name, phone, email, address, items').eq('order_no', orderNo).maybeSingle();
      if (error || !o) return J({ ok: false, error: 'Sipariş bulunamadı.' }, 404);
      const ord = o as OrderRec;
      if (ord.status !== 'hazirlaniyor' && ord.status !== 'kargoda') return J({ ok: false, error: 'Yalnızca ödemesi alınmış (hazırlanıyor) sipariş gönderilebilir.' }, 409);

      const { data: ex } = await sb.from('hepsijet_shipments').select('status, env').eq('order_no', orderNo).maybeSingle();
      // Test ortamından kalan kayıt canlı gönderiyi engellemez (üzerine yazılır)
      if (ex && ex.status === 'olusturuldu' && ex.env === c.env) return J({ ok: false, error: 'Bu sipariş için HepsiJET gönderisi zaten oluşturulmuş.' }, 409);

      const desiIn = b.desi === undefined || b.desi === '' || b.desi === null ? undefined : Number(String(b.desi).replace(',', '.'));
      if (desiIn !== undefined && (!Number.isFinite(desiIn) || desiIn <= 0)) return J({ ok: false, error: 'Desi geçersiz.' }, 400);
      const parcelsIn = b.parcels === undefined || b.parcels === '' || b.parcels === null ? 1 : Number(b.parcels);
      if (!Number.isInteger(parcelsIn) || parcelsIn < 1 || parcelsIn > 10) return J({ ok: false, error: 'Koli sayısı 1–10 arasında olmalı.' }, 400);

      const pd = await productDesis(sb, (ord.items || []).map((i) => i.slug || '').filter(Boolean));
      let built;
      try {
        built = buildPayload(c, ord, pd, { desi: desiIn, parcels: parcelsIn });
      } catch (e) {
        return J({ ok: false, error: (e as Error).message }, 422);
      }
      const r = await hj(c.env, 'POST', '/delivery/sendDeliveryOrderEnhanced', built.payload);
      if (!isOk(r)) return J({ ok: false, error: 'HepsiJET reddetti: ' + errMsg(r) }, 502);

      const now = new Date().toISOString();
      const { error: e2 } = await sb.from('hepsijet_shipments').upsert(
        { order_no: orderNo, barcode: built.barcode, env: c.env, desi: built.desi, parcels: built.parcels, status: 'olusturuldu', last_status: null, last_checked_at: null, note: null, updated_at: now },
        { onConflict: 'order_no' },
      );
      // Test ortamında siparişe dokunulmaz: müşteriye görünen takip bilgisi ve bildirim gitmesin
      if (c.env === 'prod') await sb.from('orders').update({ tracking_carrier: CARRIER_NAME, tracking_no: built.barcode }).eq('order_no', orderNo);
      if (e2) return J({ ok: true, barcode: built.barcode, warn: 'Gönderi oluşturuldu ama kayıt yazılamadı: ' + e2.message });
      return J({ ok: true, barcode: built.barcode, desi: built.desi, parcels: built.parcels, env: c.env, zpl: findZpl(r).length > 0 });
    }

    // Diğer işlemler mevcut gönderi kaydına dayanır
    const { data: sh } = await sb.from('hepsijet_shipments').select('order_no, barcode, env, desi, parcels, status').eq('order_no', orderNo).maybeSingle();
    const s = sh as Ship | null;
    if (!s) return J({ ok: false, error: 'Bu sipariş için HepsiJET gönderisi yok.' }, 404);
    const env = s.env;
    if (!credsFor(env)) return J({ ok: false, error: 'Bu gönderinin ortamı için kimlik bilgisi tanımlı değil.' }, 503);

    // ── Etiket ──
    if (action === 'etiket') {
      if (s.status !== 'olusturuldu') return J({ ok: false, error: 'Gönderi aktif değil.' }, 409);
      const fmt = String(b.format || 'pdf').toLowerCase();
      if (fmt === 'zpl') {
        const r = await hj(env, 'GET', `/delivery/generateZplBarcode/${enc(s.barcode)}/${s.parcels}`);
        const z = findZpl(r);
        if (!r.ok || !z.length) return J({ ok: false, error: 'ZPL alınamadı: ' + errMsg(r) }, 502);
        return J({ ok: true, zpl: z, barcode: s.barcode });
      }
      const f = fmt === 'png' ? 'PNG' : fmt === 'jpeg' || fmt === 'jpg' ? 'JPEG' : 'PDF';
      const r = await hj(env, 'POST', `/delivery/barcodes-label?format=${f}`, { barcodes: [s.barcode] }, true);
      const file = r.ok ? findFile(r) : null;
      if (!file) return J({ ok: false, error: 'Etiket alınamadı: ' + errMsg(r) }, 502);
      return new NextResponse(new Uint8Array(file.buf), { headers: { 'Content-Type': file.mime, 'Cache-Control': 'no-store', 'Content-Disposition': `inline; filename="${s.barcode}.${f.toLowerCase()}"` } });
    }

    // ── Takip ──
    if (action === 'takip') {
      const body = { deliveries: [{ customerDeliveryNo: s.barcode }] };
      let r = await hj(env, 'POST', '/delivery/getDeliveryTracking', body);
      if (r.http === 404) r = await hj(env, 'POST', '/getDeliveryTracking', body);
      if (!r.ok) return J({ ok: false, error: 'Takip alınamadı: ' + errMsg(r) }, 502);
      const t = parseTracking(r.json);
      await sb.from('hepsijet_shipments').update({ last_status: t.last || 'OK', last_checked_at: new Date().toISOString() }).eq('order_no', orderNo);
      return J({ ok: true, last: t.last, events: t.events, picked: t.events.length > 0, raw: JSON.stringify(r.json ?? r.text).slice(0, 4000) });
    }

    // ── Silme (kurye almadan) / geri çağırma (kurye aldıktan sonra, dağıtıma çıkmadan) ──
    if (action === 'iptal') {
      if (s.status !== 'olusturuldu') return J({ ok: false, error: 'Gönderi zaten silinmiş ya da geri çağrılmış.' }, 409);
      const mode = b.mode === 'geri' ? 'geri' : 'sil';
      let r;
      if (mode === 'geri') r = await hj(env, 'POST', `/deliveryReturn/externalRecallDeliveryOrder/${enc(s.barcode)}`);
      else {
        r = await hj(env, 'POST', `/delivery/deleteDeliveryOrder/${enc(s.barcode)}`, { deleteReason: 'IPTAL' });
        if (r.http === 405) r = await hj(env, 'DELETE', `/delivery/deleteDeliveryOrder/${enc(s.barcode)}`, { deleteReason: 'IPTAL' });
      }
      const already = /zaten/i.test(errMsg(r));
      if (!isOk(r) && !already) return J({ ok: false, error: (mode === 'geri' ? 'Geri çağırma' : 'Silme') + ' başarısız: ' + errMsg(r) }, 502);
      await sb.from('hepsijet_shipments').update({ status: mode === 'geri' ? 'geri_cagrildi' : 'silindi', updated_at: new Date().toISOString() }).eq('order_no', orderNo);
      return J({ ok: true, mode });
    }

    // ── Koli sayısı / desi güncelleme (kurye almadan önce) ──
    if (action === 'guncelle') {
      if (s.status !== 'olusturuldu') return J({ ok: false, error: 'Gönderi aktif değil.' }, 409);
      const parcels = Number(b.parcels);
      const total = Number(String(b.desi ?? '').replace(',', '.'));
      if (!Number.isInteger(parcels) || parcels < 1 || parcels > 10) return J({ ok: false, error: 'Koli sayısı 1–10 arasında olmalı.' }, 400);
      if (!Number.isFinite(total) || total < 1 || total > 41) return J({ ok: false, error: 'Toplam desi 1–41 arasında olmalı.' }, 400);
      const each = Math.round((total / parcels) * 100) / 100;
      const desi = Array.from({ length: parcels }, () => Math.max(0.1, each));
      const r = await hj(env, 'POST', '/delivery-update', { deliveryUpdateType: 'TOTAL_PARCEL', customerDeliveryNo: s.barcode, totalParcelInfo: { totalParcel: parcels, desi } });
      if (!isOk(r)) return J({ ok: false, error: 'Güncellenemedi: ' + errMsg(r) }, 502);
      await sb.from('hepsijet_shipments').update({ parcels, desi: total, updated_at: new Date().toISOString() }).eq('order_no', orderNo);
      return J({ ok: true, parcels, desi: total });
    }

    return J({ ok: false, error: 'Bilinmeyen işlem.' }, 400);
  } catch (e) {
    const m = (e as Error).message || 'Hata';
    return J({ ok: false, error: /timeout|aborted/i.test(m) ? 'HepsiJET yanıt vermedi (zaman aşımı). Biraz sonra tekrar dene.' : m }, 502);
  }
}
