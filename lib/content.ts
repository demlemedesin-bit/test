import fs from 'node:fs';
import path from 'node:path';
import { getConfig, getProducts, rest, type SiteProduct } from './catalog';
import { getFooterPages } from './cms';
import { animCfg, fill, faqHtml, footerCols, footerLegal, getSite } from './site';
import { DRAWINGS } from './siteDefaults';
import type { Storefront } from './storefront';
import { bannersHtml, parseBanners } from './design';

const ROOT = process.cwd();
const read = (rel: string) => fs.readFileSync(path.join(ROOT, 'content', rel), 'utf-8');
const json = <T,>(rel: string) => JSON.parse(read(rel)) as T;

// <script type="application/json"> içine güvenle gömmek için
const safe = (v: unknown) => JSON.stringify(v).replace(/</g, '\\u003c');

const KONUK = '/demleme/04-konuklar/';

/** İlk `skip` görsel hemen yüklenir (ilk ekran); kalanı lazy + async decode. */
function lazyImgs(html: string, skip: number): string {
  let n = 0;
  return html.replace(/<img\b([^>]*)>/g, (m, attrs: string) => {
    n++;
    if (n <= skip || /\bloading\s*=/.test(attrs)) return m;
    return `<img loading="lazy" decoding="async"${attrs.startsWith(' ') ? '' : ' '}${attrs}>`;
  });
}

const isUrl = (c: string) => /^(https?:)?\/\//.test(c) || c.startsWith('/');

/** Ana sayfa gövdesi: handoff HTML'i + panelden gelen metin/görsel/SSS/konuk/footer verisi. */
export async function homeHtml(): Promise<string> {
  const [site, cfg, list, footerPages] = await Promise.all([getSite(), getConfig(), getProducts(), getFooterPages()]);
  // “Footer'da göster” denen sayfalar alt şerit bağlantılarına eklenir
  const legal = [...site.footer.legal, ...footerPages.filter((p) => !site.footer.legal.some((l) => l.href === p.href))];
  const aspect = json<Record<string, number>>('meta/guest-aspect.json');
  const steam = json<Record<string, unknown>>('meta/steam-spots.json');
  const tea = json<{ teas: { steam: number[][] } }>('konuklar.json').teas.steam;
  const guests = site.guests.filter((g) => g && g.name && DRAWINGS.includes(g.drawing));
  const covers = [...new Set(guests.flatMap((g) => (g.reels ?? []).map((r) => r.cover).filter(Boolean)))].sort();
  const data = {
    guests: guests.map((g) => ({
      name: g.name,
      url: g.url,
      img: `${KONUK}guests/${g.drawing}-720.webp`,
      ar: aspect[g.drawing.slice(0, 3).toUpperCase()],
      steam: steam[g.drawing] ?? null,
      stand: `${KONUK}stand-sit/${g.drawing}-stand.mp4`,
      sit: `${KONUK}stand-sit/${g.drawing}-sit.mp4`,
      reels: (g.reels ?? []).filter((r) => r.cover).map((r) => ({ c: covers.indexOf(r.cover), url: r.url, p: Number(r.progress) || 0 })),
    })),
    covers: covers.map((f) => (isUrl(f) ? f : `${KONUK}reel-covers/${f}`)),
    teas: tea,
  };
  const dm = { month: site.dm.month, photos: site.dm.photos, sehpa_base: site.dm.sehpa_base, sehpa_colors: site.dm.sehpa_colors };
  const banners = parseBanners(((await rest<{ value: unknown }[]>('site_content?select=value&key=eq.banners')) ?? [])[0]?.value);
  const html = fill(read('home.html'), site)
    .replace('{{BANNERS}}', () => bannersHtml(banners))
    .replace('{{FAQ_ITEMS}}', () => faqHtml(site.faq))
    .replace('{{FOOTER_COLS}}', () => footerCols(site.footer))
    .replace('{{FOOTER_LEGAL}}', () => footerLegal({ ...site.footer, legal }))
    .replace('{{DM_MONTH}}', () => esc(site.dm.month))
    .replace('{{DM_DATA}}', () => safe(dm))
    .replace('{{ANIM}}', () => safe(animCfg(site)))
    .replaceAll('{{FREE_FROM}}', String(Number(cfg.freeFrom) || 0))
    .replaceAll('{{contactEmail}}', esc(cfg.contactEmail));
  return lazyImgs(html.replace('{{KR_DATA}}', () => safe(data)).replace('{{SHOP_CARDS}}', () => shopCards(list)), 8);
}

export type Product = SiteProduct;

const esc = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Ana sayfadaki mağaza şeridi kartları (ürünler veritabanından). */
export function shopCards(list: SiteProduct[]): string {
  return list
    .map((p) => {
      const c0 = p.colors[0];
      const choose = p.colors.length > 1 || p.sizes?.pick || p.soon || p.out;
      const tag = p.soon
        ? ' <span class="sh-tag">Yakında</span>'
        : p.out
          ? ' <span class="sh-tag">Tükendi</span>'
          : (p.was ? ` <span class="sh-sale">-%${p.salePct ?? ''}</span>` : '') + (p.left ? ` <span class="sh-low">Son ${p.left} adet</span>` : '');
      const priceHtml = p.was && !p.out && !p.soon ? `<s>${esc(p.was)}</s> <b class="sh-now">${esc(p.price)}</b>` : esc(p.price);
      return `            <article class="sh-card" data-cat="${esc(p.shopCat)}">
              <a class="sh-link" href="/urun/${esc(p.slug)}"><div class="sh-thumb"><img src="${esc(p.thumb)}" alt="${esc(p.name)}" loading="lazy"></div>
              <p class="sh-name">${esc(p.name)}${tag}</p></a><p class="sh-price">${priceHtml}</p>
              <button type="button" class="link link-muted add-to-cart" data-name="${esc(p.name)}" data-price="${esc(p.price)}" data-slug="${esc(p.slug)}" data-color="${esc(c0?.key ?? '')}" data-img="${esc(c0?.img ?? p.thumb)}"${choose ? ' data-choose="1"' : ''}>Sepete ekle <svg class="icon"><use href="#i-plus"/></svg></button>
            </article>`;
    })
    .join('\n');
}

export async function products(): Promise<SiteProduct[]> {
  return getProducts();
}

// ── Ürün sayfası: yorumlar, ilgili ürünler, "Yeni" rozeti, JSON-LD ───────────────

/** Onaylı yorum (anon yalnızca bu sütunları görür; e-posta asla gelmez). */
export type Review = { id: string; name: string; rating: number; title: string; body: string; verified: boolean; reply: string | null; created_at: string };

export async function getReviews(slug: string): Promise<Review[]> {
  const rows = await rest<Review[]>(
    `reviews?select=id,name,rating,title,body,verified,reply,created_at&product_slug=eq.${encodeURIComponent(slug)}&order=created_at.desc&limit=200`,
  );
  return Array.isArray(rows) ? rows.filter((r) => r && typeof r.rating === 'number' && r.rating >= 1 && r.rating <= 5) : [];
}

type Meta = { created: number; related: string[] };

/** Ürün başına ek bilgiler: eklenme tarihi ("Yeni" rozeti) ve admin'den seçilen ilgili ürünler (data.related). */
async function productMeta(): Promise<Map<string, Meta>> {
  const rows = (await rest<{ slug: string; created_at: string | null; related: unknown }[]>('products?select=slug,created_at,related:data->related&active=eq.true')) ?? [];
  return new Map(
    rows.map((r) => [
      r.slug,
      {
        created: r.created_at ? Date.parse(r.created_at) : NaN,
        related: Array.isArray(r.related) ? (r.related as unknown[]).filter((x): x is string => typeof x === 'string') : [],
      },
    ]),
  );
}

function pickRelated(list: SiteProduct[], cur: SiteProduct, meta: Map<string, Meta>, sf: Storefront, together: string[] = []): SiteProduct[] {
  const by = new Map(list.map((p) => [p.slug, p]));
  const manual: SiteProduct[] = [];
  if (sf.related_mode === 'together') for (const s of together) { const p = by.get(s); if (p && p.slug !== cur.slug && !p.soon && !manual.includes(p)) manual.push(p); }
  for (const s of meta.get(cur.slug)?.related ?? []) {
    const p = by.get(s);
    if (p && p.slug !== cur.slug && !manual.includes(p)) manual.push(p);
  }
  if (sf.related_mode === 'manual') return manual.slice(0, sf.related_count);
  // otomatik: önce aynı kategori, sonra diğer satıştaki ürünler; tükenenler sona
  const rank = (p: SiteProduct) => (p.out ? 4 : 0) + (p.shopCat === cur.shopCat ? 0 : 2) + (p.cat === cur.cat ? 0 : 1);
  const auto = list
    .map((p, i) => ({ p, i }))
    .filter(({ p }) => p.slug !== cur.slug && !p.soon && !manual.includes(p))
    .sort((a, b) => rank(a.p) - rank(b.p) || a.i - b.i)
    .map(({ p }) => p);
  return [...manual, ...auto].slice(0, sf.related_count);
}

function relatedHtml(items: SiteProduct[], title: string): string {
  if (!items.length) return '';
  const cards = items
    .map((x) => {
      const img = x.colors[0]?.img || x.thumb;
      return `<a href="/urun/${esc(x.slug)}" data-rec="related"><div class="th">${img ? `<img src="${esc(img)}" alt="" loading="lazy">` : ''}</div><p>${esc(x.name)}</p><span>${x.was && !x.out ? `<s style="opacity:.55">${esc(x.was)}</s> ` : ''}${esc(x.price)}${x.out ? ' · Tükendi' : ''}</span></a>`;
    })
    .join('');
  return `<section class="more px-related"><div class="more-h"><h2>${esc(title)}</h2><a href="/urunler">Tüm ürünler →</a></div><div class="more-row">${cards}</div></section>`;
}

const stars = (n: number) => `<span class="px-stars" role="img" aria-label="5 üzerinden ${n} yıldız">${'★'.repeat(n)}<i>${'★'.repeat(5 - n)}</i></span>`;
const avgOf = (r: Review[]) => r.reduce((a, x) => a + x.rating, 0) / r.length;
const trNum = (n: number) => n.toFixed(1).replace('.', ',');
const dateTr = (iso: string) => {
  const t = Date.parse(iso);
  return isNaN(t) ? '' : new Date(t).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Europe/Istanbul' });
};

function reviewItem(r: Review): string {
  return `<li class="px-item"><div class="px-item-top">${stars(r.rating)}<span class="px-item-name">${esc(r.name)}</span>${r.verified ? '<span class="px-verified">Doğrulanmış alıcı</span>' : ''}<time class="px-item-date" datetime="${esc(r.created_at)}">${esc(dateTr(r.created_at))}</time></div>${r.title ? `<p class="px-item-title">${esc(r.title)}</p>` : ''}${r.body ? `<p class="px-item-body">${esc(r.body)}</p>` : ''}${r.reply ? `<p class="px-reply"><b>Demleme yanıtı</b><span>${esc(r.reply)}</span></p>` : ''}</li>`;
}

function reviewsHtml(reviews: Review[]): string {
  const head = '<div class="px-rev-h"><h2>Yorumlar</h2></div><div id="pxReviewForm"></div>';
  if (!reviews.length) return `<section class="px-rev" id="yorumlar">${head}<p class="px-rev-empty">Bu ürüne henüz yorum yazılmadı. İlk yorumu sen yaz.</p></section>`;
  const dist = [5, 4, 3, 2, 1]
    .map((n) => {
      const c = reviews.filter((r) => r.rating === n).length;
      return `<li><span>${n}★</span><span class="px-dist-bar"><span style="width:${Math.round((c / reviews.length) * 100)}%"></span></span><em>${c}</em></li>`;
    })
    .join('');
  const avg = avgOf(reviews);
  const first = reviews.slice(0, 6).map(reviewItem).join('');
  const rest = reviews.slice(6);
  const more = rest.length ? `<details class="px-more-rev"><summary>${rest.length} yorum daha göster</summary><ul class="px-list">${rest.map(reviewItem).join('')}</ul></details>` : '';
  return `<section class="px-rev" id="yorumlar">${head}<div class="px-rev-grid"><div class="px-sum"><div class="px-sum-avg"><b>${trNum(avg)}</b><span>/ 5 · ${reviews.length} yorum</span></div>${stars(Math.round(avg))}<ul class="px-dist">${dist}</ul></div><div><ul class="px-list">${first}</ul>${more}</div></div></section>`;
}

/** Ürün sayfasının Product JSON-LD verisi (script içine güvenle gömülür: "<" kaçışlı). */
export function productJsonLd(p: SiteProduct, reviews: Review[], origin: string): string {
  const abs = (u: string) => (/^https?:\/\//i.test(u) ? u : `${origin}${u.startsWith('/') ? '' : '/'}${u}`);
  const images = [...new Set([...p.colors.flatMap((c) => [c.img || '', ...(c.imgs ?? [])]), p.thumb, ...(p.gallery ?? [])].filter(Boolean))].slice(0, 8).map(abs);
  const ld: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: p.name,
    ...(images.length ? { image: images } : {}),
    description: p.seoDesc || p.desc || p.name,
    sku: p.slug,
    brand: { '@type': 'Brand', name: 'Demleme' },
    offers: {
      '@type': 'Offer',
      price: p.priceNum.toFixed(2),
      priceCurrency: 'TRY',
      ...(p.was && p.saleEnds ? { priceValidUntil: p.saleEnds.slice(0, 10) } : {}),
      availability: p.out || p.soon ? 'https://schema.org/OutOfStock' : 'https://schema.org/InStock',
      url: `${origin}/urun/${p.slug}`,
    },
  };
  if (reviews.length) {
    ld.aggregateRating = { '@type': 'AggregateRating', ratingValue: Number(avgOf(reviews).toFixed(1)), reviewCount: reviews.length, bestRating: 5, worstRating: 1 };
    ld.review = reviews.slice(0, 5).map((r) => ({
      '@type': 'Review',
      author: { '@type': 'Person', name: r.name },
      datePublished: r.created_at.slice(0, 10),
      reviewRating: { '@type': 'Rating', ratingValue: r.rating, bestRating: 5, worstRating: 1 },
      ...(r.body ? { reviewBody: r.body } : {}),
      ...(r.title ? { name: r.title } : {}),
    }));
  }
  return safe(ld);
}

export async function productHtml(list: SiteProduct[] | undefined, slug: string, sf: Storefront, reviews: Review[]): Promise<string> {
  const [base, site, meta] = await Promise.all([list ? Promise.resolve(list) : getProducts(), getSite(), productMeta()]);
  // "Yeni" rozeti: kendi rozeti olmayan ve son new_days gün içinde eklenen ürünler
  const since = sf.badges.new_days > 0 ? Date.now() - sf.badges.new_days * 864e5 : Infinity;
  const all = base.map((p) => ((meta.get(p.slug)?.created ?? NaN) >= since && !p.badge ? { ...p, badge: 'Yeni' } : p));
  const cur = all.find((p) => p.slug === slug);
  const together = sf.related_on && cur && sf.related_mode === 'together' ? ((await rest<string[]>(`rpc/co_purchased?p_slug=${encodeURIComponent(slug)}&p_limit=8`)) ?? []) : [];
  const related = sf.related_on && cur ? relatedHtml(pickRelated(all, cur, meta, sf, together), sf.related_title) : '';
  return lazyImgs(fill(read('product.html'), site)
    .replace('{{REVIEWS}}', () => (sf.reviews_on ? reviewsHtml(reviews) : ''))
    .replace('{{RELATED}}', () => related)
    .replace('{{PRODUCT_DATA}}', () => `<script type="application/json" id="productData">${safe(all)}</script>`), 3);
}
