import { getProducts, rest } from './catalog';
import { parseSlots, type SetFlags, type SetView } from './setsConst';

/** Set gösterim yerleri ayarlardan açılır (shop_settings: sets_home / sets_cart / sets_shop = '1'). Varsayılan kapalı. */
export async function setFlags(): Promise<SetFlags> {
  const r = await rest<{ key: string; value: string | number }[]>('shop_settings?select=key,value&key=in.(sets_home,sets_cart,sets_shop)');
  const m = Object.fromEntries((r ?? []).map((x) => [x.key, String(x.value) === '1']));
  return { home: !!m.sets_home, cart: !!m.sets_cart, shop: !!m.sets_shop };
}

type Row = { slug: string; name: string; subtitle: string; price: number | string; slots: unknown; img: string | null; sort: number };

/** Satıştaki setler, yuvalarındaki stoktaki ürün/renk seçenekleriyle. Bir yuvada hiç seçenek kalmadıysa set listelenmez. */
export async function getSetViews(): Promise<SetView[]> {
  const rows = await rest<Row[]>('product_sets?select=slug,name,subtitle,price,slots,img,sort&active=eq.true&order=sort.asc');
  if (!rows?.length) return [];
  const products = await getProducts();
  const by = new Map(products.map((p) => [p.slug, p]));
  const out: SetView[] = [];
  for (const r of rows) {
    const slots = parseSlots(r.slots).map((s) => ({
      label: s.label,
      qty: s.qty,
      opts: s.slugs.flatMap((sl) => {
        const p = by.get(sl);
        if (!p || p.soon || p.out) return [];
        return p.colors
          .filter((c) => !c.out)
          .map((c) => ({ slug: p.slug, color: c.key, label: p.colors.length > 1 ? `${p.name} · ${c.name}` : p.name, img: c.thumb || c.img || p.thumb, price: p.priceNum }));
      }),
    }));
    if (!slots.length || slots.some((s) => !s.opts.length)) continue;
    out.push({ slug: r.slug, name: r.name, subtitle: r.subtitle ?? '', price: Number(r.price), img: r.img, slots });
  }
  return out;
}

const hesc = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const trl = (n: number) => '₺' + n.toLocaleString('tr-TR', { maximumFractionDigits: 0 });

/** Ana sayfa "Kampanyalı setler" bölümü (statik HTML). Ayar kapalıysa ya da set yoksa boş döner. */
export async function setsHomeHtml(): Promise<string> {
  const [flags, sets] = await Promise.all([setFlags(), getSetViews()]);
  if (!flags.home || !sets.length) return '';
  const cards = sets
    .slice(0, 6)
    .map((s) => {
      const normal = s.slots.reduce((n, sl) => n + Math.min(...sl.opts.map((o) => o.price)) * sl.qty, 0);
      const pct = normal > s.price ? Math.round(((normal - s.price) / normal) * 1000) / 10 : 0;
      const imgs = s.slots.flatMap((sl) => Array.from({ length: Math.min(sl.qty, 1) }, () => sl.opts[0].img)).filter(Boolean);
      const tiles = imgs.map((u, i) => `${i ? '<i class="hs-plus">+</i>' : ''}<span class="hs-tile"><img src="${hesc(u)}" alt="" loading="lazy"></span>`).join('');
      return `<a class="hs-card" href="${flags.shop ? '/setler#' + hesc(s.slug) : '/urunler'}"><span class="hs-tiles">${tiles}${pct > 0 ? `<b class="hs-pct">-%${String(pct).replace('.', ',')}</b>` : ''}</span><span class="hs-name">${hesc(s.name)}</span><span class="hs-price">${normal > s.price ? `<s>${trl(normal)}</s>` : ''}<b>${trl(s.price)}</b></span></a>`;
    })
    .join('');
  return `<section class="hsets" id="setler"><style>
.hsets{ padding:48px clamp(20px,4vw,48px); max-width:1240px; margin:0 auto; }
.hsets h2{ font-size:clamp(34px,5vw,64px); margin:0 0 24px; color:var(--brown,#201B14); }
.hs-grid{ display:grid; grid-template-columns:repeat(auto-fill,minmax(260px,1fr)); gap:20px; }
.hs-card{ display:grid; gap:10px; background:#fff; border:1px solid rgba(23,19,15,.14); border-radius:18px; padding:14px; text-decoration:none; color:inherit; }
.hs-tiles{ position:relative; display:flex; align-items:center; justify-content:center; }
.hs-tile{ width:92px; height:92px; background:#F1E4D6; border:1px solid rgba(142,42,33,.18); border-radius:12px; display:grid; place-items:center; overflow:hidden; }
.hs-tile img{ width:100%; height:100%; object-fit:contain; mix-blend-mode:multiply; }
.hs-plus{ font-style:normal; width:24px; height:24px; margin:0 -6px; z-index:1; display:grid; place-items:center; border-radius:50%; background:#5B0F1E; color:#fff; font-size:16px; }
.hs-pct{ position:absolute; top:-6px; right:-4px; background:#8E2A21; color:#fff; font-size:12px; padding:3px 9px; border-radius:99px; }
.hs-name{ text-align:center; font-family:var(--font-display,serif); font-size:22px; }
.hs-price{ display:flex; justify-content:center; gap:10px; align-items:baseline; } .hs-price s{ opacity:.5; } .hs-price b{ color:#8E2A21; font-size:20px; }
</style><h2>Kampanyalı setler</h2><div class="hs-grid">${cards}</div>${flags.shop ? '<p style="margin-top:18px"><a href="/setler" style="text-decoration:underline">Tüm setleri gör →</a></p>' : ''}</section>`;
}
