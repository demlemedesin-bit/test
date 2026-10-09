import { cache } from 'react';
import { rest } from './catalog';
import { parseAds, parseConsent, parseSeo, type Ads, type ConsentCfg, type Seo } from './seo';

/** Sunucuda SEO / reklam / onay ayarları (site_content: seo, ads, consent). 60 sn önbellekli, panel kaydında yenilenir. */
export type SeoBundle = { seo: Seo; ads: Ads; consent: ConsentCfg; legacy: { title: string; desc: string; ogTitle: string; ogDesc: string; ogImage: string } };

export const getSeoBundle = cache(async (): Promise<SeoBundle> => {
  const rows = (await rest<{ key: string; value: unknown }[]>('site_content?select=key,value&key=in.(seo,ads,consent,texts)')) ?? [];
  const m = Object.fromEntries(rows.map((r) => [r.key, r.value])) as Record<string, unknown>;
  const t = (m.texts && typeof m.texts === 'object' ? m.texts : {}) as Record<string, unknown>;
  const s = (k: string) => (typeof t[k] === 'string' || typeof t[k] === 'number' ? String(t[k]).trim() : '');
  return {
    seo: parseSeo(m.seo),
    ads: parseAds(m.ads, { ga_id: s('ga_id'), pixel_id: s('pixel_id') }),
    consent: parseConsent(m.consent),
    legacy: { title: s('seo_title'), desc: s('seo_desc'), ogTitle: s('seo_og_title'), ogDesc: s('seo_og_desc'), ogImage: s('seo_og_image') },
  };
});
