import crypto from 'node:crypto';
import type { SupabaseClient } from '@supabase/supabase-js';
import { serviceClient } from './notify';

/**
 * HepsiJET Retail entegrasyonu (yalnızca sunucu). Standart (RETAIL / HX_STD) gönderi.
 * Kullanıcı adı ve şifre yalnızca ortam değişkenlerinden okunur; tarayıcıya hiçbir şey gitmez.
 *   Test : HEPSIJET_TEST_USER, HEPSIJET_TEST_PASS
 *   Canlı: HEPSIJET_USER, HEPSIJET_PASS
 * Firma/adres/X-Dock bilgileri shop_settings içinde (is_public=false) `hepsijet_*` anahtarlarıyla tutulur.
 */

export type HjEnv = 'test' | 'prod';
export const BASE: Record<HjEnv, string> = {
  test: 'https://integration-apitest.hepsijet.com',
  prod: 'https://integration.hepsijet.com',
};
export const CARRIER_NAME = 'HepsiJet';

export type HjCfg = {
  enabled: boolean;
  env: HjEnv;
  companyName: string;
  companyCode: string;
  addressId: string;
  city: string;
  town: string;
  district: string;
  line: string;
  xdock: string;
  prefix: string;
  useProductDesi: boolean;
  defaultDesi: number;
};

export const CFG_KEYS = [
  'hepsijet_enabled', 'hepsijet_env', 'hepsijet_company_name', 'hepsijet_company_code', 'hepsijet_address_id',
  'hepsijet_city', 'hepsijet_town', 'hepsijet_district', 'hepsijet_line', 'hepsijet_xdock', 'hepsijet_prefix',
  'hepsijet_use_product_desi', 'hepsijet_default_desi',
] as const;

const envVar = (k: string) => (process.env[k] || '').trim();
export function credsFor(env: HjEnv): { user: string; pass: string } | null {
  const user = envVar(env === 'prod' ? 'HEPSIJET_USER' : 'HEPSIJET_TEST_USER');
  const pass = envVar(env === 'prod' ? 'HEPSIJET_PASS' : 'HEPSIJET_TEST_PASS');
  return user && pass ? { user, pass } : null;
}

export async function loadCfg(sb: SupabaseClient | null = serviceClient()): Promise<HjCfg | null> {
  if (!sb) return null;
  const { data, error } = await sb.from('shop_settings').select('key, value').in('key', CFG_KEYS as unknown as string[]);
  if (error) return null;
  const m = Object.fromEntries((data ?? []).map((r) => [r.key as string, String(r.value ?? '').trim()]));
  const dd = Number(String(m.hepsijet_default_desi || '1').replace(',', '.'));
  return {
    enabled: m.hepsijet_enabled === '1',
    env: m.hepsijet_env === 'prod' ? 'prod' : 'test',
    companyName: m.hepsijet_company_name || '',
    companyCode: m.hepsijet_company_code || '',
    addressId: m.hepsijet_address_id || '',
    city: m.hepsijet_city || '',
    town: m.hepsijet_town || '',
    district: m.hepsijet_district || '',
    line: m.hepsijet_line || '',
    xdock: m.hepsijet_xdock || '',
    prefix: (m.hepsijet_prefix || '').toUpperCase(),
    useProductDesi: m.hepsijet_use_product_desi === '1',
    defaultDesi: Number.isFinite(dd) && dd >= 1 && dd <= 41 ? dd : 1,
  };
}

/** Eksik ayarların insan okunur listesi (boşsa gönderi oluşturulabilir). */
export function missing(c: HjCfg): string[] {
  const x: string[] = [];
  if (!c.companyName) x.push('Firma adı (name)');
  if (!c.companyCode) x.push('Firma kısa kodu (abbreviationCode)');
  if (!c.addressId) x.push('Toplama adresi kimliği (companyAddressId)');
  if (!c.city || !c.town) x.push('Toplama adresi il/ilçe');
  if (!c.line) x.push('Toplama adresi açık adres');
  if (!c.xdock) x.push('X-Dock kodu');
  if (!/^[A-Z0-9]{3}$/.test(c.prefix)) x.push('3 haneli firma kodu (barkod ön eki)');
  if (!credsFor(c.env)) x.push(c.env === 'prod' ? 'HEPSIJET_USER / HEPSIJET_PASS (Vercel)' : 'HEPSIJET_TEST_USER / HEPSIJET_TEST_PASS (Vercel)');
  return x;
}

// ── Jeton (60 dk geçerli; 50 dk sonra yenilenir) ─────────────────────
const tokens = new Map<HjEnv, { token: string; exp: number }>();
const HEAD = { 'Content-Type': 'application/json', Accept: 'application/json', 'X-Origin': 'integration', 'X-Client-Id': 'hj-integration', 'X-ClientId': 'hj-integration' };

async function fetchT(url: string, init: RequestInit, ms = 20000): Promise<Response> {
  return fetch(url, { ...init, cache: 'no-store', signal: AbortSignal.timeout(ms) });
}

async function getToken(env: HjEnv, force = false): Promise<string> {
  const c = tokens.get(env);
  if (!force && c && c.exp > Date.now()) return c.token;
  const cr = credsFor(env);
  if (!cr) throw new Error('HepsiJET kimlik bilgisi (ortam değişkeni) tanımlı değil.');
  const r = await fetchT(`${BASE[env]}/auth/token`, { method: 'POST', headers: HEAD, body: JSON.stringify({ username: cr.user, password: cr.pass }) });
  const j = (await r.json().catch(() => null)) as { status?: string; data?: { token?: string }; message?: string } | null;
  const t = j?.data?.token;
  if (!r.ok || !t) throw new Error(`HepsiJET girişi başarısız (${r.status})${j?.message ? ': ' + j.message : ''}`);
  tokens.set(env, { token: t, exp: Date.now() + 50 * 60 * 1000 });
  return t;
}

export type HjRes = { http: number; ok: boolean; json: unknown; text: string; type: string; buf?: Buffer };

/** Yetkili istek; 401'de jetonu yenileyip bir kez daha dener. binary=true ise gövde Buffer olarak da döner. */
export async function hj(env: HjEnv, method: 'GET' | 'POST' | 'DELETE', path: string, body?: unknown, binary = false): Promise<HjRes> {
  const run = async (force: boolean) => {
    const token = await getToken(env, force);
    const r = await fetchT(`${BASE[env]}${path}`, {
      method,
      headers: { ...HEAD, 'X-Auth-Token': token },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const type = r.headers.get('content-type') || '';
    const buf = Buffer.from(await r.arrayBuffer());
    const isText = !/(pdf|image|octet)/i.test(type);
    const text = isText ? buf.toString('utf8') : '';
    let json: unknown = null;
    if (isText) {
      try {
        json = JSON.parse(text);
      } catch {
        /* düz metin */
      }
    }
    return { http: r.status, ok: r.ok, json, text, type, buf: binary || !isText ? buf : undefined } as HjRes;
  };
  let res = await run(false);
  if (res.http === 401) res = await run(true);
  return res;
}

/** Yanıttan okunur hata mesajı. */
export function errMsg(r: HjRes): string {
  const j = r.json as Record<string, unknown> | null;
  const parts: string[] = [];
  if (j && typeof j === 'object') {
    for (const k of ['message', 'error', 'errorMessage', 'description']) if (typeof j[k] === 'string' && j[k]) parts.push(j[k] as string);
    const e = j.errors ?? j.errorList;
    if (Array.isArray(e)) for (const x of e) parts.push(typeof x === 'string' ? x : JSON.stringify(x));
  }
  if (!parts.length && r.text) parts.push(r.text.slice(0, 300));
  return (parts.join(' · ') || `HTTP ${r.http}`).slice(0, 400);
}

/** HTTP başarılı ve gövde açıkça FAIL/ERROR demiyorsa başarı say. */
export function isOk(r: HjRes): boolean {
  if (!r.ok) return false;
  const j = r.json as { status?: unknown } | null;
  if (j && typeof j === 'object' && typeof j.status === 'string') return /^(ok|success)$/i.test(j.status);
  return true;
}

// ── Yardımcılar ──────────────────────────────────────────────────────
export function phoneTR(p: string): string | null {
  let d = (p || '').replace(/\D/g, '');
  if (d.startsWith('0090')) d = d.slice(4);
  else if (d.startsWith('90') && d.length === 12) d = d.slice(2);
  if (d.length === 10 && d[0] === '5') d = '0' + d;
  return /^05\d{9}$/.test(d) ? d : null;
}

const upTR = (s: string) => s.trim().toLocaleUpperCase('tr-TR');
const todayTR = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Istanbul' }).format(new Date());
const round2 = (n: number) => Math.round(n * 100) / 100;

export function barcodeFor(prefix: string, orderNo: string): string {
  return prefix + orderNo.replace(/[^A-Za-z0-9]/g, '').toUpperCase();
}

export type OrderRec = {
  order_no: string;
  status: string;
  payment_method: string;
  full_name: string;
  phone: string;
  email: string;
  address: { city?: string; district?: string; address?: string; zip?: string } | null;
  items: { slug?: string; name: string; color?: string | null; color_name?: string | null; size?: string | null; qty: number }[];
};

export type Built = { payload: Record<string, unknown>; barcode: string; desi: number; parcels: number };

/** Siparişten Standart gönderi gövdesi üretir; sorun varsa Türkçe hata fırlatır. */
export function buildPayload(c: HjCfg, o: OrderRec, productDesi: Map<string, number>, opt: { desi?: number; parcels?: number } = {}): Built {
  if (o.payment_method === 'kapida') throw new Error('Kapıda ödemeli sipariş HepsiJET ile gönderilemez (kapıda ödeme desteklenmiyor).');
  const a = o.address ?? {};
  const city = (a.city || '').trim();
  const town = (a.district || '').trim();
  const line = [(a.address || '').trim(), a.zip ? String(a.zip).trim() : ''].filter(Boolean).join(' ');
  if (!city || !town) throw new Error('Siparişte il/ilçe eksik.');
  if (line.length < 5) throw new Error('Siparişte açık adres eksik.');
  const phone = phoneTR(o.phone);
  if (!phone) throw new Error('Telefon numarası geçerli bir cep telefonu değil (05xx xxx xx xx olmalı).');
  const parts = (o.full_name || '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) throw new Error('Alıcı adı eksik.');
  const firstName = parts.length > 1 ? parts.slice(0, -1).join(' ') : parts[0];
  const lastName = parts.length > 1 ? parts[parts.length - 1] : parts[0];
  const items = Array.isArray(o.items) ? o.items.filter((i) => i && i.qty > 0) : [];
  if (!items.length) throw new Error('Siparişte ürün yok.');

  const parcels = Math.max(1, Math.min(10, Math.round(opt.parcels ?? 1)));
  const qtyTotal = items.reduce((s, i) => s + i.qty, 0);
  let total: number;
  if (opt.desi !== undefined) total = opt.desi;
  else if (c.useProductDesi && items.every((i) => i.slug && productDesi.has(i.slug))) total = items.reduce((s, i) => s + (productDesi.get(i.slug as string) as number) * i.qty, 0);
  else total = c.defaultDesi;
  total = round2(total);
  if (!(total > 0)) throw new Error('Desi geçersiz.');
  if (total > 41) throw new Error(`Toplam desi ${total}: 41'i aşan (XL) gönderi bu entegrasyonda desteklenmiyor. Desiyi kontrol et.`);
  if (total < 1) total = 1;

  const barcode = barcodeFor(c.prefix, o.order_no);
  if (barcode.length > 19) throw new Error('Barkod 19 karakteri aşıyor.');

  const content = items.map((i) => {
    const unit = c.useProductDesi && i.slug && productDesi.has(i.slug) && opt.desi === undefined ? (productDesi.get(i.slug) as number) : round2(total / qtyTotal);
    return {
      sku: [i.slug || 'urun', i.color, i.size].filter(Boolean).join('-').slice(0, 60),
      description: [i.name, i.color_name, i.size].filter(Boolean).join(' ').slice(0, 120),
      desi: Math.max(0.1, round2(unit)),
      quantity: i.qty,
      indivisibleQuantity: false,
    };
  });

  const payload = {
    company: { name: c.companyName, abbreviationCode: c.companyCode },
    delivery: {
      customerDeliveryNo: barcode,
      customerOrderId: o.order_no.slice(0, 25),
      deliveryDateOriginal: todayTR(),
      totalParcels: String(parcels),
      desi: String(total),
      deliverySlotOriginal: '0',
      deliveryType: 'RETAIL',
      product: { productCode: 'HX_STD' },
      senderAddress: {
        companyAddressId: c.addressId,
        country: { name: 'Türkiye' },
        city: { name: upTR(c.city) },
        town: { name: upTR(c.town) },
        district: { name: c.district },
        addressLine1: c.line,
      },
      receiver: { companyCustomerId: crypto.randomUUID(), firstName, lastName, phone1: phone, phone2: '', email: o.email || '' },
      recipientAddress: {
        companyAddressId: crypto.randomUUID(),
        country: { name: 'Türkiye' },
        city: { name: upTR(city) },
        town: { name: upTR(town) },
        district: { name: '' },
        addressLine1: line,
      },
      recipientPerson: o.full_name.trim(),
      recipientPersonPhone1: phone,
    },
    currentXDock: { abbreviationCode: c.xdock },
    deliveryContent: content,
  };
  return { payload, barcode, desi: total, parcels };
}

/** Ürün desi değerleri (products.data.desi). */
export async function productDesis(sb: SupabaseClient, slugs: string[]): Promise<Map<string, number>> {
  const m = new Map<string, number>();
  if (!slugs.length) return m;
  const { data } = await sb.from('products').select('slug, data').in('slug', slugs);
  for (const p of data ?? []) {
    const d = Number(String(((p.data ?? {}) as { desi?: unknown }).desi ?? '').replace(',', '.'));
    if (Number.isFinite(d) && d > 0) m.set(p.slug as string, d);
  }
  return m;
}

// ── Yanıt ayrıştırma (yanıt şekli belgede örneklenmediği için esnek) ──
function* strings(v: unknown, depth = 0): Generator<string> {
  if (depth > 8 || v == null) return;
  if (typeof v === 'string') yield v;
  else if (Array.isArray(v)) for (const x of v) yield* strings(x, depth + 1);
  else if (typeof v === 'object') for (const x of Object.values(v as object)) yield* strings(x, depth + 1);
}

/** Yanıtta (ya da düz metinde) ZPL etiket(ler)i bulur. */
export function findZpl(r: HjRes): string[] {
  const out: string[] = [];
  const cand = r.json !== null ? [...strings(r.json)] : [r.text];
  for (const s of cand) if (s.includes('^XA')) out.push(s);
  return out;
}

/** PDF/PNG/JPEG: ikili gövde ya da JSON içinde base64. */
export function findFile(r: HjRes): { buf: Buffer; mime: string } | null {
  if (r.buf && /pdf|image/i.test(r.type)) return { buf: r.buf, mime: r.type.split(';')[0] };
  for (let s of strings(r.json)) {
    s = s.replace(/^data:[^,]*,/, '').trim();
    if (s.startsWith('JVBERi')) return { buf: Buffer.from(s, 'base64'), mime: 'application/pdf' };
    if (s.startsWith('iVBOR')) return { buf: Buffer.from(s, 'base64'), mime: 'image/png' };
    if (s.startsWith('/9j/')) return { buf: Buffer.from(s, 'base64'), mime: 'image/jpeg' };
  }
  return null;
}

export type Ev = { status: string; date: string; note: string };
const SKEYS = ['transactionName', 'statusName', 'statusCode', 'currentStatus', 'deliveryStatus', 'status', 'state', 'transaction'];
const DKEYS = /date|time|at$/i;

/** getDeliveryTracking yanıtından hareket listesi ve son durum çıkarır. */
export function parseTracking(j: unknown): { events: Ev[]; last: string } {
  const evs: Ev[] = [];
  const walk = (v: unknown, d = 0) => {
    if (d > 8 || v == null) return;
    if (Array.isArray(v)) return v.forEach((x) => walk(x, d + 1));
    if (typeof v !== 'object') return;
    const o = v as Record<string, unknown>;
    const sk = SKEYS.find((k) => typeof o[k] === 'string' && o[k] && !/^ok$/i.test(o[k] as string));
    if (sk) {
      const dk = Object.keys(o).find((k) => DKEYS.test(k) && (typeof o[k] === 'string' || typeof o[k] === 'number'));
      const nk = ['description', 'note', 'message', 'locationName', 'xdockName'].find((k) => typeof o[k] === 'string' && o[k]);
      evs.push({ status: String(o[sk]), date: dk ? String(o[dk]) : '', note: nk ? String(o[nk]) : '' });
    }
    for (const x of Object.values(o)) walk(x, d + 1);
  };
  walk(j);
  const ts = (e: Ev) => (e.date && !isNaN(Date.parse(e.date)) ? Date.parse(e.date) : NaN);
  const sorted = evs.every((e) => !isNaN(ts(e))) ? [...evs].sort((a, b) => ts(a) - ts(b)) : evs;
  return { events: sorted.slice(-40), last: sorted.length ? sorted[sorted.length - 1].status : '' };
}
