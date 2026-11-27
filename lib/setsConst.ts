/** Set ürünleri: istemci ve sunucu ortak tipleri (catalog.ts'i içe aktarmaz). */
export type SetSlot = { label: string; slugs: string[]; qty: number };
export type SetDef = { slug: string; name: string; subtitle: string; price: number; slots: SetSlot[]; img?: string | null; sort: number };
export type SetOpt = { slug: string; color: string; label: string; img: string; price: number };
export type SetSlotView = { label: string; qty: number; opts: SetOpt[] };
export type SetView = { slug: string; name: string; subtitle: string; price: number; img?: string | null; slots: SetSlotView[] };

export const SET_FLAGS = ['sets_home', 'sets_cart', 'sets_shop'] as const;
export type SetFlags = { home: boolean; cart: boolean; shop: boolean };

export const parseSlots = (v: unknown): SetSlot[] =>
  Array.isArray(v)
    ? v
        .map((x) => {
          const o = x as { label?: unknown; slugs?: unknown; qty?: unknown };
          const slugs = Array.isArray(o.slugs) ? o.slugs.filter((s): s is string => typeof s === 'string' && s !== '') : [];
          const qty = Math.min(9, Math.max(1, Math.floor(Number(o.qty) || 1)));
          return { label: typeof o.label === 'string' ? o.label : '', slugs, qty };
        })
        .filter((s) => s.slugs.length > 0)
    : [];

/** Bir setin sepetteki normal toplamı (her yuva için en ucuz seçenekle) ve tasarruf. */
export function setSaving(v: Pick<SetView, 'price' | 'slots'>): { normal: number; save: number; pct: number } {
  const normal = v.slots.reduce((n, s) => n + (s.opts.length ? Math.min(...s.opts.map((o) => o.price)) * s.qty : 0), 0);
  const save = Math.max(0, normal - v.price);
  return { normal, save, pct: normal > 0 ? Math.round((save / normal) * 1000) / 10 : 0 };
}
