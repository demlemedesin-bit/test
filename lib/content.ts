import fs from 'node:fs';
import path from 'node:path';
import { getProducts, type SiteProduct } from './catalog';

const ROOT = process.cwd();
const read = (rel: string) => fs.readFileSync(path.join(ROOT, 'content', rel), 'utf-8');
const json = <T,>(rel: string) => JSON.parse(read(rel)) as T;

// <script type="application/json"> içine güvenle gömmek için
const safe = (v: unknown) => JSON.stringify(v).replace(/</g, '\\u003c');

const KONUK = '/demleme/04-konuklar/';

type Reel = { cover: string; url: string; progress: number };
type KonukFile = {
  teas: { steam: number[][] };
  guests: { name: string; url: string; drawing: string; reels: Reel[] }[];
};

/** Ana sayfa gövdesi. Konuk verisi content/konuklar.json'dan gelir (düzenlenecek yer orası). */
export async function homeHtml(): Promise<string> {
  const c = json<KonukFile>('konuklar.json');
  const aspect = json<Record<string, number>>('meta/guest-aspect.json');
  const steam = json<Record<string, unknown>>('meta/steam-spots.json');
  const covers = [...new Set(c.guests.flatMap((g) => g.reels.map((r) => r.cover)))].sort();
  const data = {
    guests: c.guests.map((g) => ({
      name: g.name,
      url: g.url,
      img: `${KONUK}guests/${g.drawing}-720.webp`,
      ar: aspect[g.drawing.slice(0, 3).toUpperCase()],
      steam: steam[g.drawing] ?? null,
      stand: `${KONUK}stand-sit/${g.drawing}-stand.mp4`,
      sit: `${KONUK}stand-sit/${g.drawing}-sit.mp4`,
      reels: g.reels.map((r) => ({ c: covers.indexOf(r.cover), url: r.url, p: r.progress })),
    })),
    covers: covers.map((f) => `${KONUK}reel-covers/${f}`),
    teas: c.teas.steam,
  };
  const list = await getProducts();
  return read('home.html').replace('{{KR_DATA}}', safe(data)).replace('{{SHOP_CARDS}}', shopCards(list));
}

export type Product = SiteProduct;

const esc = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Ana sayfadaki mağaza şeridi kartları (ürünler veritabanından). */
export function shopCards(list: SiteProduct[]): string {
  return list
    .map((p) => {
      const c0 = p.colors[0];
      const choose = p.colors.length > 1 || p.sizes?.pick || p.soon || p.out;
      const tag = p.soon ? ' <span class="sh-tag">Yakında</span>' : p.out ? ' <span class="sh-tag">Tükendi</span>' : '';
      return `            <article class="sh-card" data-cat="${esc(p.shopCat)}">
              <a class="sh-link" href="/urun/${esc(p.slug)}"><div class="sh-thumb"><img src="${esc(p.thumb)}" alt="${esc(p.name)}" loading="lazy"></div>
              <p class="sh-name">${esc(p.name)}${tag}</p></a><p class="sh-price">${esc(p.price)}</p>
              <button type="button" class="link link-muted add-to-cart" data-name="${esc(p.name)}" data-price="${esc(p.price)}" data-slug="${esc(p.slug)}" data-color="${esc(c0?.key ?? '')}" data-img="${esc(c0?.img ?? p.thumb)}"${choose ? ' data-choose="1"' : ''}>Sepete ekle <svg class="icon"><use href="#i-plus"/></svg></button>
            </article>`;
    })
    .join('\n');
}

export async function products(): Promise<SiteProduct[]> {
  return getProducts();
}

export async function productHtml(list?: SiteProduct[]): Promise<string> {
  const all = list ?? (await getProducts());
  return read('product.html').replace(
    '{{PRODUCT_DATA}}',
    `<script type="application/json" id="productData">${safe(all)}</script>`,
  );
}
