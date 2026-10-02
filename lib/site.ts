import { rest } from './catalog';
import {
  DEFAULT_DM,
  DEFAULT_FAQ,
  DEFAULT_FOOTER,
  DEFAULT_GUESTS,
  FIELDS,
  type Demleyen,
  type Faq,
  type Field,
  type FooterData,
  type Guest,
} from './siteDefaults';

/**
 * Site içeriği (site_content tablosu). Panelde kaydedilmeyen her şey siteDefaults.ts'teki varsayılandır;
 * veritabanına ulaşılamazsa da site varsayılanlarla açılır.
 */
export type { Announce } from './announce';
export { toAnnounce } from './announce';
import type { Announce } from './announce';
import { toAnnounce as _toAnnounce } from './announce';
export type Site = { t: Record<string, string>; faq: Faq[]; footer: FooterData; dm: Demleyen; guests: Guest[]; announce: Announce };

const arr = <T,>(v: unknown, d: T[]): T[] => (Array.isArray(v) && v.length ? (v as T[]) : d);

export async function getSite(): Promise<Site> {
  const rows = (await rest<{ key: string; value: unknown }[]>('site_content?select=key,value')) ?? [];
  const m = Object.fromEntries(rows.map((r) => [r.key, r.value])) as Record<string, unknown>;
  const t: Record<string, string> = {};
  if (m.texts && typeof m.texts === 'object') for (const [k, v] of Object.entries(m.texts as Record<string, unknown>)) if (typeof v === 'string' || typeof v === 'number') t[k] = String(v);
  const f = m.footer as Partial<FooterData> | undefined;
  const dm = m.demleyen as Partial<Demleyen> | undefined;
  return {
    t,
    // SSS ve konuklar: kayıt varsa (boş liste dahil) o geçerli
    faq: Array.isArray(m.faq) ? (m.faq as Faq[]) : DEFAULT_FAQ,
    footer: { cols: arr(f?.cols, DEFAULT_FOOTER.cols), legal: Array.isArray(f?.legal) ? f.legal : DEFAULT_FOOTER.legal },
    dm: { month: dm?.month || DEFAULT_DM.month, photos: Array.isArray(dm?.photos) ? dm.photos : DEFAULT_DM.photos },
    guests: Array.isArray(m.guests) && m.guests.length ? (m.guests as Guest[]) : DEFAULT_GUESTS,
    announce: _toAnnounce(m.announce),
  };
}

const BY_ID: Record<string, Field> = Object.fromEntries(FIELDS.map((f) => [f.id, f]));

export const text = (s: Pick<Site, 't'>, id: string): string => s.t[id] ?? BY_ID[id]?.def ?? '';
export const on = (s: Pick<Site, 't'>, id: string): boolean => text(s, id) !== '0' && text(s, id) !== '';

export const esc = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Yalnızca güvenli bağlantı türleri; aksi halde '#'. */
export const safeHref = (u: string) => (/^(\/|#|https?:\/\/|mailto:|tel:)/i.test(u.trim()) ? u.trim() : '#');

export function animCfg(s: Pick<Site, 't'>): Record<string, number | boolean> {
  const o: Record<string, number | boolean> = {};
  for (const f of FIELDS) {
    if (!f.id.startsWith('anim_')) continue;
    const k = f.id.slice(5);
    if (f.kind === 'bool') o[k] = on(s, f.id);
    else {
      const n = Number(text(s, f.id));
      o[k] = isFinite(n) && n >= 0 ? n : Number(f.def);
    }
  }
  return o;
}

/** HTML şablonundaki {{t:…}} alanlarını, bölüm işaretlerini ve listeleri doldurur. */
export function fill(html: string, s: Site): string {
  return html
    .replace(/<!--S:(\w+)-->([\s\S]*?)<!--\/S:\1-->/g, (_, id: string, inner: string) => (on(s, 'show_' + id) ? inner : ''))
    .replace(/\{\{t:([a-z0-9_]+)\}\}/g, (_, id: string) => {
      const f = BY_ID[id];
      const v = text(s, id);
      if (f?.kind === 'url') return esc(safeHref(v));
      if (f?.kind === 'number') return esc(isFinite(Number(v)) ? String(Number(v)) : f.def);
      return esc(v).replace(/\n/g, '<br>');
    });
}

export function faqHtml(list: Faq[]): string {
  return list
    .filter((x) => x.q.trim())
    .map(
      (x) => `      <div class="faq-item">
        <button class="faq-q" type="button" aria-expanded="false"><span class="faq-t">${esc(x.q)}</span> <svg class="icon icon-20"><use href="#i-plus"/></svg></button>
        <div class="faq-a"><p>${esc(x.a).replace(/\n/g, '<br>')}</p></div>
      </div>`,
    )
    .join('\n');
}

const link = (l: { label: string; href: string }) => `<a href="${esc(safeHref(l.href))}">${esc(l.label)}</a>`;

export function footerCols(f: FooterData): string {
  return f.cols
    .map((c) => `      <div class="footer-col">\n        <h5>${esc(c.title)}</h5>\n        <ul>\n${c.links.map((l) => `          <li>${link(l)}</li>`).join('\n')}\n        </ul>\n      </div>`)
    .join('\n');
}
export const footerLegal = (f: FooterData) => f.legal.map(link).join('\n        ');
