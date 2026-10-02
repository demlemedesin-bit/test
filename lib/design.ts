/** Sayfa tasarımı: ana sayfa banner'ları (site_content 'banners') ve özel betikler ('scripts'). Sunucu ve istemcide kullanılabilir. */
export type Banner = { id: string; name: string; on: boolean; image: string; mobile_image: string; title: string; text: string; cta_label: string; url: string; starts_at: string; ends_at: string; align: 'left' | 'center' | 'right' };
export type Scripts = { head: string; body_end: string; need_consent: boolean };

const s = (v: unknown, max = 600) => (typeof v === 'string' ? v.slice(0, max) : '');
export const emptyBanner = (): Banner => ({ id: 'b' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5), name: 'Yeni banner', on: false, image: '', mobile_image: '', title: '', text: '', cta_label: '', url: '', starts_at: '', ends_at: '', align: 'left' });

export function parseBanners(v: unknown): Banner[] {
  if (!Array.isArray(v)) return [];
  return v.filter((x) => x && typeof x === 'object').slice(0, 12).map((x: Record<string, unknown>) => ({
    id: s(x.id, 40) || 'b' + Math.random().toString(36).slice(2, 8), name: s(x.name, 80), on: x.on === true, image: s(x.image, 500), mobile_image: s(x.mobile_image, 500),
    title: s(x.title, 120), text: s(x.text, 300), cta_label: s(x.cta_label, 40), url: s(x.url, 500), starts_at: s(x.starts_at, 40), ends_at: s(x.ends_at, 40),
    align: x.align === 'center' || x.align === 'right' ? x.align : 'left',
  }));
}
export function parseScripts(v: unknown): Scripts {
  const o = v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
  return { head: s(o.head, 20000), body_end: s(o.body_end, 20000), need_consent: o.need_consent !== false };
}

const esc = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const href = (u: string) => (/^(\/|#|https?:\/\/|mailto:|tel:)/i.test(u.trim()) ? u.trim() : '#');
export const bannerLive = (b: Banner, now = Date.now()) =>
  b.on && !!b.image && (!b.starts_at || new Date(b.starts_at).getTime() <= now) && (!b.ends_at || new Date(b.ends_at).getTime() > now);

/** Sunucuda çizilen banner şeridi (birden fazlaysa kaydırmalı). */
export function bannersHtml(list: Banner[]): string {
  const live = list.filter((b) => bannerLive(b));
  if (!live.length) return '';
  const slides = live
    .map((b) => {
      const pic = `<picture>${b.mobile_image ? `<source media="(max-width:640px)" srcset="${esc(b.mobile_image)}">` : ''}<img src="${esc(b.image)}" alt="${esc(b.title || b.name)}" loading="lazy"></picture>`;
      const copy = b.title || b.text || b.cta_label
        ? `<div class="bn-copy bn-${b.align}">${b.title ? `<h2>${esc(b.title)}</h2>` : ''}${b.text ? `<p>${esc(b.text)}</p>` : ''}${b.cta_label ? `<span class="bn-cta">${esc(b.cta_label)}</span>` : ''}</div>`
        : '';
      const inner = pic + copy;
      return `<div class="bn-slide">${b.url ? `<a href="${esc(href(b.url))}">${inner}</a>` : inner}</div>`;
    })
    .join('');
  return `<style>.bn{display:flex;overflow-x:auto;scroll-snap-type:x mandatory;gap:0;max-width:1400px;margin:0 auto;scrollbar-width:none}.bn::-webkit-scrollbar{display:none}.bn-slide{flex:0 0 100%;scroll-snap-align:start;position:relative}.bn-slide a{display:block;color:inherit;text-decoration:none}.bn-slide img{display:block;width:100%;height:auto}.bn-copy{position:absolute;inset:0;display:flex;flex-direction:column;justify-content:center;gap:8px;padding:0 6%;max-width:60%;color:#fff;text-shadow:0 1px 8px rgba(0,0,0,.35)}.bn-center{margin:0 auto;align-items:center;text-align:center;left:0;right:0}.bn-right{margin-left:auto;align-items:flex-end;text-align:right}.bn-copy h2{margin:0;font-size:clamp(20px,3.4vw,40px)}.bn-copy p{margin:0;font-size:clamp(13px,1.6vw,18px)}.bn-cta{display:inline-block;background:#fff;color:#14161b;padding:8px 18px;border-radius:99px;font-size:14px;font-weight:600;text-shadow:none;width:fit-content}@media(max-width:640px){.bn-copy{max-width:100%;padding:0 5%}}</style><section class="bn" aria-label="Kampanyalar">${slides}</section>`;
}

/** datetime-local (yerel saat) ↔ ISO (UTC). Sunucu farklı saat diliminde çalıştığı için kayıt ISO tutulur. */
export const toIso = (v: string) => { if (!v) return ''; const t = new Date(v).getTime(); return isFinite(t) ? new Date(t).toISOString() : ''; };
export const toLocalInput = (iso: string) => { if (!iso) return ''; const d = new Date(iso); if (!isFinite(d.getTime())) return ''; const p = (n: number) => String(n).padStart(2, '0'); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`; };
