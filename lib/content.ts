import fs from 'node:fs';
import path from 'node:path';

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
export function homeHtml(): string {
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
  return read('home.html').replace('{{KR_DATA}}', safe(data));
}

export type Product = {
  slug: string;
  name: string;
  cat: string;
  price: string;
  desc: string;
  badge?: string;
  soon?: boolean;
};

export function products(): Product[] {
  return json<Product[]>('products.json');
}

export function productHtml(): string {
  return read('product.html').replace(
    '{{PRODUCT_DATA}}',
    `<script type="application/json" id="productData">${safe(json('products.json'))}</script>`,
  );
}
