import { getProducts, rest, type Color } from './catalog';
import { siteUrl } from './siteUrl';

/** Ürün beslemeleri (Google Merchant, Meta Catalog, pazaryeri) için ortak ürün listesi: aktif ve "yakında" olmayan ürünler. */
export type FeedProduct = {
  slug: string;
  name: string;
  desc: string;
  price: number;
  stock: number | null;
  inStock: boolean;
  colors: Color[];
  sizes: string[];
  category: string;
  images: string[];
  link: string;
};

type Row = {
  slug: string; name: string; category: string; price: number | string; colors: Color[] | null; sizes: string[] | null;
  soon: boolean; thumb: string | null; stock: number | null; data?: { desc?: string };
};

export const abs = (u?: string | null): string => {
  const s = (u ?? '').trim();
  if (!s) return '';
  if (/^https?:\/\//i.test(s)) return s;
  return siteUrl() + (s.startsWith('/') ? s : '/' + s);
};

export async function feedProducts(): Promise<FeedProduct[]> {
  const base = siteUrl();
  const rows = await rest<Row[]>('products?select=slug,name,category,price,colors,sizes,soon,thumb,stock,data&active=eq.true&order=sort.asc');
  if (rows && rows.length) {
    return rows
      .filter((r) => !r.soon)
      .map((r) => {
        const colors = r.colors ?? [];
        const stock = r.stock ?? null;
        const images = [r.thumb, ...colors.map((c) => c.img)].map(abs).filter((v, i, a) => v && a.indexOf(v) === i);
        return {
          slug: r.slug, name: r.name, desc: (r.data?.desc ?? '').trim(), price: Number(r.price), stock, inStock: stock === null || stock > 0,
          colors, sizes: r.sizes ?? [], category: r.category, images, link: `${base}/urun/${r.slug}`,
        };
      });
  }
  // Veritabanına ulaşılamazsa content/ dosyalarından
  return (await getProducts())
    .filter((p) => !p.soon)
    .map((p) => ({
      slug: p.slug, name: p.name, desc: p.desc, price: p.priceNum, stock: null, inStock: !p.out, colors: p.colors,
      sizes: p.sizes?.items.map((i) => i[0]) ?? [], category: p.cat,
      images: [p.thumb, ...p.colors.map((c) => c.img)].map(abs).filter((v, i, a) => v && a.indexOf(v) === i), link: `${base}/urun/${p.slug}`,
    }));
}

export const priceTry = (n: number) => n.toFixed(2) + ' TRY';

export const skuPart = (s: string) =>
  s
    .toLocaleLowerCase('tr-TR')
    .replace(/ı/g, 'i')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
