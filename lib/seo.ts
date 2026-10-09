/**
 * SEO, reklam/izleme ve çerez onayı ayarları (site_content: seo, ads, consent) için güvenli doğrulayıcılar
 * ve yapısal veri (JSON-LD) yardımcıları. Bu dosya saf TypeScript'tir (sunucuda da istemcide de kullanılır);
 * veritabanı okuması lib/seoServer.ts içindedir.
 */

// ── Tipler ─────────────────────────────────────────────────────────────
export type OrgInfo = { name: string; legal_name: string; logo: string; email: string; phone: string; address: string; city: string; social: string[] };
export type SitemapCfg = {
  include_products: boolean;
  include_pages: boolean;
  include_blog: boolean;
  include_images: boolean;
  exclude: string[];
  priorities: { home: number; products: number; blog: number; pages: number };
  changefreq: ChangeFreq;
};
export type RobotsCfg = { extra_disallow: string[]; extra_lines: string; block_ai_bots: boolean };
export type ChangeFreq = 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
export type Seo = {
  site_name: string;
  title_template: string;
  default_title: string;
  default_desc: string;
  og_image: string;
  favicon: string;
  twitter: string;
  locale: string;
  noindex_site: boolean;
  canonical_host: string;
  org: OrgInfo;
  sitemap: SitemapCfg;
  robots: RobotsCfg;
};
export type Ads = {
  gtm_id: string;
  ga4_id: string;
  ads_id: string;
  ads_purchase_label: string;
  meta_pixel: string;
  tiktok_pixel: string;
  clarity_id: string;
  hotjar_id: string;
  consent_required: boolean;
};
export type ConsentCfg = { on: boolean; title: string; text: string; policy_url: string; accept_label: string; reject_label: string; settings_label: string };

export const CHANGEFREQS: ChangeFreq[] = ['always', 'hourly', 'daily', 'weekly', 'monthly', 'yearly', 'never'];
export const CHANGEFREQ_TR: Record<ChangeFreq, string> = { always: 'Her zaman', hourly: 'Saatlik', daily: 'Günlük', weekly: 'Haftalık', monthly: 'Aylık', yearly: 'Yıllık', never: 'Hiç' };

/** Yapay zekâ tarayıcıları (robots.txt'te "YZ botlarını engelle" açıkken). */
export const AI_BOTS = ['GPTBot', 'ClaudeBot', 'CCBot', 'Google-Extended', 'PerplexityBot', 'Bytespider'];
/** Her zaman taranmaz: yönetim, API, kısa linkler, sepet/ödeme/hesap yolları. */
export const ALWAYS_DISALLOW = ['/admin', '/api/', '/t/', '/sepet', '/odeme', '/hesabim', '/giris', '/kayit', '/ara', '/siparis-', '/sifre-sifirla', '/sifremi-unuttum'];

// ── Küçük yardımcılar ──────────────────────────────────────────────────
const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const str = (v: unknown, max = 500): string => (typeof v === 'string' ? v.trim().slice(0, max) : typeof v === 'number' ? String(v) : '');
const bool = (v: unknown, d: boolean): boolean => (typeof v === 'boolean' ? v : v === 'true' || v === 1 ? true : v === 'false' || v === 0 ? false : d);
const num = (v: unknown, d: number): number => {
  const n = typeof v === 'string' ? Number(v.replace(',', '.')) : typeof v === 'number' ? v : NaN;
  return isFinite(n) ? Math.min(1, Math.max(0, n)) : d;
};
const strList = (v: unknown, max = 60, len = 300): string[] => (Array.isArray(v) ? v.map((x) => str(x, len)).filter(Boolean).slice(0, max) : []);

/** Yalnızca http(s) adresleri; aksi halde boş. */
export const safeUrl = (u: unknown): string => {
  const s = str(u, 600);
  return /^https?:\/\/[^\s<>"']+$/i.test(s) ? s : '';
};
/** Site içi yol ("/…") ya da http(s) adres; aksi halde boş. */
export const safePathOrUrl = (u: unknown): string => {
  const s = str(u, 600);
  return (/^\/(?![/\\])[^\s<>"']*$/.test(s) || /^https?:\/\/[^\s<>"']+$/i.test(s)) ? s : '';
};
/** Sitemap/robots için yol: "/" ile başlar, boşluksuz. */
export const cleanPath = (p: unknown): string => {
  const s = str(p, 200);
  return /^\/[^\s<>"']*$/.test(s) ? s : '';
};

// ── Kimlik biçimleri (bozuk değer = kapalı) ────────────────────────────
export type IdKind = 'ga4_id' | 'gtm_id' | 'ads_id' | 'ads_purchase_label' | 'meta_pixel' | 'tiktok_pixel' | 'clarity_id' | 'hotjar_id';
export const ID_RULES: Record<IdKind, { re: RegExp; label: string; example: string }> = {
  ga4_id: { re: /^G-[A-Z0-9]{4,20}$/, label: 'Google Analytics 4 ölçüm kodu', example: 'G-ABC123XYZ9' },
  gtm_id: { re: /^GTM-[A-Z0-9]{4,10}$/, label: 'Google Tag Manager kapsayıcı kodu', example: 'GTM-ABCD123' },
  ads_id: { re: /^AW-\d{6,12}$/, label: 'Google Ads dönüşüm kimliği', example: 'AW-123456789' },
  ads_purchase_label: { re: /^[A-Za-z0-9_-]{6,40}$/, label: 'Google Ads satın alma etiketi', example: 'AbC-d_EfGhIjKlMn' },
  meta_pixel: { re: /^\d{5,20}$/, label: 'Meta (Facebook) Pixel kodu', example: '123456789012345' },
  tiktok_pixel: { re: /^[A-Z0-9]{8,32}$/, label: 'TikTok Pixel kodu', example: 'C1A2B3C4D5E6F7G8H9' },
  clarity_id: { re: /^[a-z0-9]{6,16}$/, label: 'Microsoft Clarity proje kodu', example: 'k1a2b3c4d5' },
  hotjar_id: { re: /^\d{5,10}$/, label: 'Hotjar site kodu', example: '1234567' },
};
export const validId = (kind: IdKind, v: string): boolean => ID_RULES[kind].re.test(v.trim());
const id = (kind: IdKind, v: unknown): string => {
  const s = str(v, 60);
  return validId(kind, s) ? s : '';
};

// ── Okuma / doğrulama ─────────────────────────────────────────────────
export const DEFAULT_SEO: Seo = {
  site_name: 'Demleme',
  title_template: '',
  default_title: '',
  default_desc: '',
  og_image: '',
  favicon: '',
  twitter: '',
  locale: 'tr_TR',
  noindex_site: false,
  canonical_host: '',
  org: { name: '', legal_name: '', logo: '', email: '', phone: '', address: '', city: '', social: [] },
  sitemap: {
    include_products: true,
    include_pages: true,
    include_blog: true,
    include_images: false,
    exclude: [],
    priorities: { home: 1, products: 0.7, blog: 0.5, pages: 0.4 },
    changefreq: 'weekly',
  },
  robots: { extra_disallow: [], extra_lines: '', block_ai_bots: false },
};

/** Başlık şablonu: "%s" içermiyorsa geçersiz sayılır (boş = şablon yok). */
export const cleanTemplate = (v: unknown): string => {
  const s = str(v, 120);
  return s.includes('%s') ? s : '';
};

export function parseSeo(raw: unknown): Seo {
  const d = DEFAULT_SEO;
  const r = isObj(raw) ? raw : {};
  const o = isObj(r.org) ? r.org : {};
  const sm = isObj(r.sitemap) ? r.sitemap : {};
  const pr = isObj(sm.priorities) ? sm.priorities : {};
  const rb = isObj(r.robots) ? r.robots : {};
  const cf = str(sm.changefreq, 10) as ChangeFreq;
  const host = str(r.canonical_host, 200).replace(/^https?:\/\//i, '').replace(/\/.*$/, '');
  const tw = str(r.twitter, 60).replace(/^https?:\/\/(www\.)?(x|twitter)\.com\//i, '').replace(/^@/, '');
  return {
    site_name: str(r.site_name, 80) || d.site_name,
    title_template: cleanTemplate(r.title_template),
    default_title: str(r.default_title, 200),
    default_desc: str(r.default_desc, 400),
    og_image: safePathOrUrl(r.og_image),
    favicon: safePathOrUrl(r.favicon),
    twitter: /^[A-Za-z0-9_]{1,15}$/.test(tw) ? tw : '',
    locale: /^[a-z]{2}_[A-Z]{2}$/.test(str(r.locale, 10)) ? str(r.locale, 10) : d.locale,
    noindex_site: bool(r.noindex_site, false),
    canonical_host: /^[a-z0-9.-]+\.[a-z]{2,}(:\d+)?$/i.test(host) ? host.toLowerCase() : '',
    org: {
      name: str(o.name, 120),
      legal_name: str(o.legal_name, 160),
      logo: safePathOrUrl(o.logo),
      email: /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(str(o.email, 120)) ? str(o.email, 120) : '',
      phone: /^[+\d][\d\s()+-]{6,24}$/.test(str(o.phone, 30)) ? str(o.phone, 30) : '',
      address: str(o.address, 300),
      city: str(o.city, 80),
      social: strList(o.social, 12, 300).map(safeUrl).filter(Boolean),
    },
    sitemap: {
      include_products: bool(sm.include_products, d.sitemap.include_products),
      include_pages: bool(sm.include_pages, d.sitemap.include_pages),
      include_blog: bool(sm.include_blog, d.sitemap.include_blog),
      include_images: bool(sm.include_images, d.sitemap.include_images),
      exclude: strList(sm.exclude, 200, 200).map(cleanPath).filter(Boolean),
      priorities: {
        home: num(pr.home, d.sitemap.priorities.home),
        products: num(pr.products, d.sitemap.priorities.products),
        blog: num(pr.blog, d.sitemap.priorities.blog),
        pages: num(pr.pages, d.sitemap.priorities.pages),
      },
      changefreq: CHANGEFREQS.includes(cf) ? cf : d.sitemap.changefreq,
    },
    robots: {
      extra_disallow: strList(rb.extra_disallow, 100, 200).map(cleanPath).filter(Boolean),
      extra_lines: typeof rb.extra_lines === 'string' ? rb.extra_lines.replace(/[\r]/g, '').slice(0, 2000) : '',
      block_ai_bots: bool(rb.block_ai_bots, false),
    },
  };
}

export const DEFAULT_ADS: Ads = { gtm_id: '', ga4_id: '', ads_id: '', ads_purchase_label: '', meta_pixel: '', tiktok_pixel: '', clarity_id: '', hotjar_id: '', consent_required: true };

/**
 * ads satırı; boş alanlar için eski texts.ga_id / texts.pixel_id'ye düşülür.
 * `ads` satırı hiç yoksa (eski kurulum) onay şartı aranmaz: mevcut GA/Pixel davranışı değişmesin.
 */
export function parseAds(raw: unknown, legacy?: { ga_id?: string; pixel_id?: string }): Ads {
  const hasRow = isObj(raw);
  const r = hasRow ? raw : {};
  return {
    gtm_id: id('gtm_id', r.gtm_id),
    ga4_id: id('ga4_id', r.ga4_id) || id('ga4_id', legacy?.ga_id),
    ads_id: id('ads_id', r.ads_id),
    ads_purchase_label: id('ads_purchase_label', r.ads_purchase_label),
    meta_pixel: id('meta_pixel', r.meta_pixel) || id('meta_pixel', legacy?.pixel_id),
    tiktok_pixel: id('tiktok_pixel', r.tiktok_pixel),
    clarity_id: id('clarity_id', r.clarity_id),
    hotjar_id: id('hotjar_id', r.hotjar_id),
    consent_required: bool(r.consent_required, hasRow),
  };
}

export const DEFAULT_CONSENT: ConsentCfg = {
  on: false,
  title: 'Çerezler',
  text: 'Siteyi geliştirmek ve reklamlarımızın işe yarayıp yaramadığını ölçmek için çerez kullanıyoruz. Tercihini istediğin zaman değiştirebilirsin.',
  policy_url: '/gizlilik-politikasi',
  accept_label: 'Kabul et',
  reject_label: 'Reddet',
  settings_label: 'Ayarlar',
};
export function parseConsent(raw: unknown): ConsentCfg {
  const d = DEFAULT_CONSENT;
  const r = isObj(raw) ? raw : {};
  return {
    on: bool(r.on, d.on),
    title: str(r.title, 80) || d.title,
    text: str(r.text, 600) || d.text,
    policy_url: safePathOrUrl(r.policy_url) || d.policy_url,
    accept_label: str(r.accept_label, 30) || d.accept_label,
    reject_label: str(r.reject_label, 30) || d.reject_label,
    settings_label: str(r.settings_label, 30) || d.settings_label,
  };
}

/** Panelde "aktif" izleme kimlikleri (kısaca özet). */
export const adsActive = (a: Ads): boolean => !!(a.gtm_id || a.ga4_id || a.ads_id || a.meta_pixel || a.tiktok_pixel || a.clarity_id || a.hotjar_id);

// ── Başlık yardımcıları ────────────────────────────────────────────────
/** Şablonu bir başlığa uygular. Şablon yoksa varsayılan "<başlık> · <site adı>". */
export const applyTemplate = (seo: Pick<Seo, 'title_template' | 'site_name'>, t: string): string =>
  (seo.title_template || `%s · ${seo.site_name}`).replace('%s', t);

/** Sitenin kök adresi: canonical_host tanımlıysa o (https), değilse verilen adres (siteUrl()). */
export const baseUrl = (seo: Pick<Seo, 'canonical_host'>, fallback: string): string => (seo.canonical_host ? `https://${seo.canonical_host}` : fallback.replace(/\/+$/, ''));

// ── Yapısal veri (JSON-LD) ─────────────────────────────────────────────
type Ld = Record<string, unknown>;
const abs = (base: string, u: string) => (u.startsWith('/') ? base + u : u);

export function organizationLd(seo: Seo, base: string): Ld {
  const o = seo.org;
  const name = o.name || seo.site_name;
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': `${base}/#organization`,
    name,
    ...(o.legal_name ? { legalName: o.legal_name } : {}),
    url: base,
    ...(o.logo ? { logo: abs(base, o.logo) } : {}),
    ...(o.email ? { email: o.email } : {}),
    ...(o.phone ? { telephone: o.phone } : {}),
    ...(o.address || o.city ? { address: { '@type': 'PostalAddress', ...(o.address ? { streetAddress: o.address } : {}), ...(o.city ? { addressLocality: o.city } : {}), addressCountry: 'TR' } } : {}),
    ...(o.social.length ? { sameAs: o.social } : {}),
  };
}

export function websiteLd(seo: Seo, base: string): Ld {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    '@id': `${base}/#website`,
    name: seo.site_name,
    url: base,
    inLanguage: 'tr-TR',
    publisher: { '@id': `${base}/#organization` },
    potentialAction: { '@type': 'SearchAction', target: { '@type': 'EntryPoint', urlTemplate: `${base}/ara?q={search_term_string}` }, 'query-input': 'required name=search_term_string' },
  };
}

export function breadcrumbLd(base: string, items: { name: string; path: string }[]): Ld {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((x, i) => ({ '@type': 'ListItem', position: i + 1, name: x.name, item: abs(base, x.path) })),
  };
}

export function articleLd(
  seo: Seo,
  base: string,
  p: { slug: string; title: string; description?: string; cover?: string | null; published?: string | null; modified?: string | null },
): Ld {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    mainEntityOfPage: { '@type': 'WebPage', '@id': `${base}/blog/${p.slug}` },
    headline: p.title.slice(0, 110),
    ...(p.description ? { description: p.description } : {}),
    ...(p.cover ? { image: [abs(base, p.cover)] } : {}),
    ...(p.published ? { datePublished: p.published } : {}),
    ...(p.modified || p.published ? { dateModified: p.modified || p.published } : {}),
    inLanguage: 'tr-TR',
    author: { '@type': 'Organization', name: seo.org.name || seo.site_name },
    publisher: { '@type': 'Organization', name: seo.org.name || seo.site_name, ...(seo.org.logo ? { logo: { '@type': 'ImageObject', url: abs(base, seo.org.logo) } } : {}) },
  };
}

export function faqLd(list: { q: string; a: string }[]): Ld | null {
  const items = list.filter((x) => x.q.trim() && x.a.trim());
  if (!items.length) return null;
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((x) => ({ '@type': 'Question', name: x.q.trim(), acceptedAnswer: { '@type': 'Answer', text: x.a.trim() } })),
  };
}

// ── robots.txt metni (hem robots.ts hem panel önizlemesi) ──────────────
export type RobotsPlan = { rules: { userAgent: string | string[]; allow?: string | string[]; disallow?: string | string[] }[]; sitemap: string };
export function robotsPlan(seo: Seo, base: string): RobotsPlan {
  const sitemap = `${base}/sitemap.xml`;
  if (seo.noindex_site) return { rules: [{ userAgent: '*', disallow: '/' }], sitemap };
  const rules: RobotsPlan['rules'] = [{ userAgent: '*', allow: '/', disallow: [...ALWAYS_DISALLOW, ...seo.robots.extra_disallow] }];
  if (seo.robots.block_ai_bots) rules.push({ userAgent: AI_BOTS, disallow: '/' });
  rules.push(...parseExtraRules(seo.robots.extra_lines));
  return { rules, sitemap };
}

/**
 * "Ek satırlar": yalnızca User-agent / Allow / Disallow grupları desteklenir (Next robots dosyası başka satır yazamaz).
 * Örn: "User-agent: AhrefsBot\nDisallow: /"
 */
export function parseExtraRules(text: string): RobotsPlan['rules'] {
  const out: RobotsPlan['rules'] = [];
  let cur: { ua: string[]; allow: string[]; dis: string[]; open: boolean } | null = null;
  const flush = () => {
    if (cur && cur.ua.length && (cur.allow.length || cur.dis.length)) out.push({ userAgent: cur.ua, ...(cur.allow.length ? { allow: cur.allow } : {}), ...(cur.dis.length ? { disallow: cur.dis } : {}) });
    cur = null;
  };
  for (const line of text.split('\n')) {
    const m = /^\s*(user-agent|allow|disallow)\s*:\s*(\S*)\s*$/i.exec(line);
    if (!m) continue;
    const k = m[1].toLowerCase();
    const v = m[2];
    if (k === 'user-agent') {
      if (!/^[A-Za-z0-9*_.-]{1,60}$/.test(v)) continue;
      if (!cur || !cur.open) {
        flush();
        cur = { ua: [], allow: [], dis: [], open: true };
      }
      cur.ua.push(v);
    } else if (cur && (v === '' || cleanPath(v))) {
      cur.open = false;
      if (v) (k === 'allow' ? cur.allow : cur.dis).push(v);
    }
  }
  flush();
  return out;
}
export function robotsText(seo: Seo, base: string): string {
  const p = robotsPlan(seo, base);
  const out: string[] = [];
  for (const r of p.rules) {
    for (const ua of ([] as string[]).concat(r.userAgent)) out.push(`User-Agent: ${ua}`);
    for (const a of ([] as string[]).concat(r.allow ?? [])) out.push(`Allow: ${a}`);
    for (const d of ([] as string[]).concat(r.disallow ?? [])) out.push(`Disallow: ${d}`);
    out.push('');
  }
  out.push(`Sitemap: ${p.sitemap}`);
  return out.join('\n');
}
