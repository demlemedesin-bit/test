/**
 * Popup sistemi: ayar şeması, doğrulama, zamanlama ve sıklık mantığı.
 * Ayar: site_content key='popups' → { list: Popup[] }. Bozuk kayıtlar sessizce atlanır, hiçbir şey fırlatılmaz.
 * Hem mağaza (components/Popups.tsx) hem panel (app/admin/popuplar) kullanır.
 */

export type PopupKind = 'newsletter' | 'announcement' | 'exit' | 'countdown';
export type PopupTrigger = 'delay' | 'scroll' | 'exit' | 'click';
export type PopupPages = 'all' | 'home' | 'product' | 'cart' | 'custom';
export type PopupDevices = 'all' | 'mobile' | 'desktop';
export type PopupFreq = 'once' | 'session' | 'days';
export type PopupBg = 'cream' | 'ink' | 'accent';

export type Popup = {
  id: string;
  name: string;
  on: boolean;
  kind: PopupKind;
  title: string;
  text: string;
  image: string;
  cta_label: string;
  cta_url: string;
  coupon_code: string;
  trigger: PopupTrigger;
  delay_s: number;
  scroll_pct: number;
  pages: PopupPages;
  paths: string[];
  devices: PopupDevices;
  frequency: PopupFreq;
  days: number;
  starts_at: string;
  ends_at: string;
  countdown_to: string;
  bg: PopupBg;
  hide_after_subscribe: boolean;
  consent_text: string;
};

export const KINDS: { key: PopupKind; label: string }[] = [
  { key: 'newsletter', label: 'Bülten kaydı' },
  { key: 'announcement', label: 'Duyuru' },
  { key: 'exit', label: 'Çıkış niyeti' },
  { key: 'countdown', label: 'Geri sayım' },
];
export const TRIGGERS: { key: PopupTrigger; label: string }[] = [
  { key: 'delay', label: 'Süre dolunca' },
  { key: 'scroll', label: 'Sayfa kaydırılınca' },
  { key: 'exit', label: 'Çıkış niyetinde (masaüstü)' },
  { key: 'click', label: 'Tıklanınca (data-popup-open)' },
];
export const PAGES: { key: PopupPages; label: string }[] = [
  { key: 'all', label: 'Tüm sayfalar' },
  { key: 'home', label: 'Ana sayfa' },
  { key: 'product', label: 'Ürün sayfaları' },
  { key: 'cart', label: 'Sepet' },
  { key: 'custom', label: 'Özel yollar' },
];
export const DEVICES: { key: PopupDevices; label: string }[] = [
  { key: 'all', label: 'Tüm cihazlar' },
  { key: 'mobile', label: 'Yalnızca mobil' },
  { key: 'desktop', label: 'Yalnızca masaüstü' },
];
export const FREQS: { key: PopupFreq; label: string }[] = [
  { key: 'once', label: 'Kişi başı bir kez' },
  { key: 'session', label: 'Oturum başına bir kez' },
  { key: 'days', label: 'N günde bir' },
];
export const BGS: { key: PopupBg; label: string }[] = [
  { key: 'cream', label: 'Krem' },
  { key: 'ink', label: 'Koyu' },
  { key: 'accent', label: 'Vurgu (kırmızı)' },
];

export const DEFAULT_CONSENT = 'Kampanya ve yeni ürün e-postaları almayı kabul ediyorum. KVKK aydınlatma metnini okudum.';

export const emptyPopup = (): Popup => ({
  id: newId(),
  name: 'Yeni popup',
  on: false,
  kind: 'announcement',
  title: '',
  text: '',
  image: '',
  cta_label: '',
  cta_url: '',
  coupon_code: '',
  trigger: 'delay',
  delay_s: 8,
  scroll_pct: 40,
  pages: 'all',
  paths: [],
  devices: 'all',
  frequency: 'session',
  days: 7,
  starts_at: '',
  ends_at: '',
  countdown_to: '',
  bg: 'cream',
  hide_after_subscribe: true,
  consent_text: DEFAULT_CONSENT,
});

export function newId(): string {
  return 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

/** Yalnızca site içi yol ("/…", "//" değil) ya da http(s) adresi; aksi halde boş. */
export function safeUrl(u: unknown): string {
  if (typeof u !== 'string') return '';
  const s = u.trim().slice(0, 500);
  if (!s) return '';
  if (s.startsWith('/') && !s.startsWith('//') && !s.includes('\\')) return s;
  if (/^https?:\/\/[^\s]+$/i.test(s)) return s;
  return '';
}

const str = (v: unknown, max: number, d = ''): string => (typeof v === 'string' ? v.slice(0, max) : d);
const num = (v: unknown, min: number, max: number, d: number): number => {
  const n = typeof v === 'number' ? v : typeof v === 'string' && v.trim() !== '' ? Number(v) : NaN;
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : d;
};
const pick = <T extends string>(v: unknown, allowed: readonly T[], d: T): T => (typeof v === 'string' && (allowed as readonly string[]).includes(v) ? (v as T) : d);
const isoOrEmpty = (v: unknown): string => {
  if (typeof v !== 'string' || !v.trim()) return '';
  return Number.isNaN(new Date(v).getTime()) ? '' : v.trim().slice(0, 40);
};

/** Tek kaydı doğrular; kullanılamaz haldeyse null. */
export function parsePopup(raw: unknown): Popup | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  const id = str(r.id, 40).trim();
  if (!id || !/^[A-Za-z0-9_-]+$/.test(id)) return null;
  const kind = pick<PopupKind>(r.kind, ['newsletter', 'announcement', 'exit', 'countdown'], 'announcement');
  const paths = (Array.isArray(r.paths) ? r.paths : [])
    .filter((x): x is string => typeof x === 'string')
    .map((x) => x.trim().slice(0, 200))
    .filter((x) => x.startsWith('/') && !x.startsWith('//'))
    .slice(0, 30);
  const p: Popup = {
    id,
    name: str(r.name, 80, 'Popup'),
    on: r.on === true,
    kind,
    title: str(r.title, 120),
    text: str(r.text, 600),
    image: safeUrl(r.image),
    cta_label: str(r.cta_label, 40),
    cta_url: safeUrl(r.cta_url),
    coupon_code: str(r.coupon_code, 40).trim(),
    trigger: pick<PopupTrigger>(r.trigger, ['delay', 'scroll', 'exit', 'click'], 'delay'),
    delay_s: num(r.delay_s, 0, 600, 8),
    scroll_pct: num(r.scroll_pct, 5, 100, 40),
    pages: pick<PopupPages>(r.pages, ['all', 'home', 'product', 'cart', 'custom'], 'all'),
    paths,
    devices: pick<PopupDevices>(r.devices, ['all', 'mobile', 'desktop'], 'all'),
    frequency: pick<PopupFreq>(r.frequency, ['once', 'session', 'days'], 'session'),
    days: Math.round(num(r.days, 1, 365, 7)),
    starts_at: isoOrEmpty(r.starts_at),
    ends_at: isoOrEmpty(r.ends_at),
    countdown_to: isoOrEmpty(r.countdown_to),
    bg: pick<PopupBg>(r.bg, ['cream', 'ink', 'accent'], 'cream'),
    hide_after_subscribe: r.hide_after_subscribe !== false,
    consent_text: str(r.consent_text, 300),
  };
  // Geri sayım türü hedef tarih olmadan anlamsız
  if (kind === 'countdown' && !p.countdown_to) return null;
  return p;
}

/** site_content.popups değerinden ({list:[…]}) geçerli popup listesi. */
export function parsePopups(v: unknown): Popup[] {
  const list = v && typeof v === 'object' ? (v as { list?: unknown }).list : null;
  if (!Array.isArray(list)) return [];
  const seen = new Set<string>();
  const out: Popup[] = [];
  for (const it of list) {
    const p = parsePopup(it);
    if (p && !seen.has(p.id)) {
      seen.add(p.id);
      out.push(p);
    }
  }
  return out;
}

/** Panel için: bozuk kayıtları atmadan, eksik alanları tamamlayarak okur (düzenlenebilsin). */
export function parsePopupsLoose(v: unknown): Popup[] {
  const list = v && typeof v === 'object' ? (v as { list?: unknown }).list : null;
  if (!Array.isArray(list)) return [];
  const out: Popup[] = [];
  for (const it of list) {
    const base = it && typeof it === 'object' ? (it as Record<string, unknown>) : {};
    const p = parsePopup({ id: newId(), ...base, countdown_to: base.countdown_to || (base.kind === 'countdown' ? new Date(Date.now() + 7 * 864e5).toISOString() : '') });
    if (p) out.push(p);
  }
  return out;
}

// ── Sayfa / cihaz / zaman kuralları ─────────────────────────────────
const NEVER = /^\/(admin|odeme|siparis-tamamlandi|hesabim|sifre-sifirla)(\/|$)/;

/** Bu yolda bu popup türü hiç gösterilebilir mi? (checkout'u bölmeyiz; sepette yalnızca geri sayım.) */
export function allowedOnPath(kind: PopupKind, path: string): boolean {
  if (NEVER.test(path)) return false;
  if (/^\/sepet(\/|$)/.test(path)) return kind === 'countdown';
  return true;
}

export function pageMatches(p: Pick<Popup, 'pages' | 'paths'>, path: string): boolean {
  const clean = path.split('?')[0].split('#')[0].replace(/\/+$/, '') || '/';
  switch (p.pages) {
    case 'all':
      return true;
    case 'home':
      return clean === '/';
    case 'product':
      return clean.startsWith('/urun/');
    case 'cart':
      return clean === '/sepet';
    case 'custom':
      return p.paths.some((x) => {
        const t = x.replace(/\/+$/, '') || '/';
        if (t.endsWith('*')) return clean.startsWith(t.slice(0, -1));
        return clean === t;
      });
  }
}

export function deviceMatches(p: Pick<Popup, 'devices'>, mobile: boolean): boolean {
  return p.devices === 'all' || (p.devices === 'mobile' ? mobile : !mobile);
}

export function inSchedule(p: Pick<Popup, 'starts_at' | 'ends_at' | 'kind' | 'countdown_to'>, now: number): boolean {
  if (p.starts_at && new Date(p.starts_at).getTime() > now) return false;
  if (p.ends_at && new Date(p.ends_at).getTime() < now) return false;
  if (p.kind === 'countdown' && new Date(p.countdown_to).getTime() <= now) return false;
  return true;
}

// ── Sıklık (localStorage 'dm-popups' { id: ts }, oturum için sessionStorage) ──
const LS = 'dm-popups';
const SS = 'dm-popups-s';
const SUB = 'dm-subscribed';

function readMap(store: 'local' | 'session', key: string): Record<string, number> {
  try {
    const s = store === 'local' ? window.localStorage : window.sessionStorage;
    const o = JSON.parse(s.getItem(key) || '{}') as unknown;
    if (o && typeof o === 'object' && !Array.isArray(o)) {
      const out: Record<string, number> = {};
      for (const [k, v] of Object.entries(o as Record<string, unknown>)) if (typeof v === 'number') out[k] = v;
      return out;
    }
  } catch {
    /* depolama kapalı olabilir */
  }
  return {};
}

function writeMap(store: 'local' | 'session', key: string, m: Record<string, number>) {
  try {
    (store === 'local' ? window.localStorage : window.sessionStorage).setItem(key, JSON.stringify(m));
  } catch {
    /* sessizce geç */
  }
}

export const readSeen = () => readMap('local', LS);
export const readSessionSeen = () => readMap('session', SS);

export function markSeen(id: string, now = Date.now()) {
  writeMap('local', LS, { ...readSeen(), [id]: now });
  writeMap('session', SS, { ...readSessionSeen(), [id]: now });
}

export function frequencyOk(p: Pick<Popup, 'id' | 'frequency' | 'days'>, now = Date.now()): boolean {
  const ts = readSeen()[p.id];
  if (p.frequency === 'once') return ts === undefined;
  if (p.frequency === 'session') return readSessionSeen()[p.id] === undefined;
  return ts === undefined || now - ts >= p.days * 864e5;
}

export function isSubscribed(): boolean {
  try {
    return window.localStorage.getItem(SUB) === '1';
  } catch {
    return false;
  }
}
export function markSubscribed() {
  try {
    window.localStorage.setItem(SUB, '1');
  } catch {
    /* sessizce geç */
  }
}

/** Analitik: window.dmTrack varsa çağırır, yoksa sessiz. */
export function trackPopup(id: string, action: 'view' | 'close' | 'cta' | 'subscribe' | 'copy') {
  try {
    (window as unknown as { dmTrack?: (t: string, e: object) => void }).dmTrack?.('popup', { id, action });
  } catch {
    /* sessizce geç */
  }
}

/** Hazır şablonlar (panelde "Şablondan ekle"). */
export const POPUP_TEMPLATES: { key: string; label: string; make: () => Popup }[] = [
  {
    key: 'welcome',
    label: '%10 hoş geldin kuponu (bülten)',
    make: () => ({
      ...emptyPopup(),
      name: '%10 hoş geldin kuponu',
      kind: 'newsletter',
      title: 'İlk siparişinde %10 indirim',
      text: 'Bültenimize katıl; yeni ürünlerden ve kampanyalardan ilk sen haberdar ol. Kupon kodun kayıttan sonra burada görünür.',
      cta_label: 'Kaydol',
      coupon_code: 'HOSGELDIN10',
      trigger: 'delay',
      delay_s: 10,
      pages: 'all',
      frequency: 'days',
      days: 14,
      bg: 'cream',
    }),
  },
  {
    key: 'exit',
    label: 'Çıkış niyeti: gitmeden önce',
    make: () => ({
      ...emptyPopup(),
      name: 'Gitmeden önce',
      kind: 'exit',
      title: 'Gitmeden önce…',
      text: 'Sepetini bırakma; bu kuponla ilk siparişinde indirim kazan.',
      cta_label: 'Mağazaya dön',
      cta_url: '/#magaza',
      coupon_code: 'GERIGEL10',
      trigger: 'exit',
      delay_s: 12,
      pages: 'all',
      devices: 'all',
      frequency: 'days',
      days: 7,
      bg: 'ink',
    }),
  },
  {
    key: 'shipping',
    label: 'Kargo bedava duyurusu',
    make: () => ({
      ...emptyPopup(),
      name: 'Kargo bedava duyurusu',
      kind: 'announcement',
      title: 'Bu hafta kargo bedava',
      text: 'Sepet tutarı ne olursa olsun tüm siparişlerde kargo bizden.',
      cta_label: 'Alışverişe başla',
      cta_url: '/#magaza',
      trigger: 'delay',
      delay_s: 6,
      pages: 'home',
      frequency: 'session',
      bg: 'accent',
    }),
  },
  {
    key: 'countdown',
    label: 'Geri sayım kampanyası',
    make: () => ({
      ...emptyPopup(),
      name: 'Geri sayım kampanyası',
      kind: 'countdown',
      title: 'Kampanya bitmek üzere',
      text: 'Seçili ürünlerde indirim süresi dolmadan yakala.',
      cta_label: 'İndirimi gör',
      cta_url: '/#magaza',
      countdown_to: new Date(Date.now() + 3 * 864e5).toISOString(),
      trigger: 'delay',
      delay_s: 5,
      pages: 'all',
      frequency: 'session',
      bg: 'ink',
    }),
  },
];
