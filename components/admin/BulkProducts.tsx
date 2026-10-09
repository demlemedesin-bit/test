'use client';

import { useMemo, useRef, useState } from 'react';
import { Download, Save, Upload, ArrowLeft, Percent } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { refreshSite, tl, type AdminProduct } from '@/lib/admin';
import { TopBar } from './ui';

/** Stok yeniden açılınca "haber ver" listesindekilere e-posta ister (hata verirse sessiz kalır). */
export async function notifyRestock(slug: string): Promise<{ sent: number; skipped: number; error?: string } | null> {
  try {
    const { data } = await supabase().auth.getSession();
    const token = data.session?.access_token;
    if (!token) return null;
    const res = await fetch('/api/bildirim/stok', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ slug }) });
    return (await res.json()) as { sent: number; skipped: number; error?: string };
  } catch {
    return null;
  }
}

type Row = { price: string; stock: string; active: boolean; soon: boolean };
const rowOf = (p: AdminProduct): Row => ({ price: String(p.price), stock: p.stock == null ? '' : String(p.stock), active: p.active, soon: p.soon });

const q = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
export function productsCsv(list: AdminProduct[]): string {
  const head = ['slug', 'ad', 'kategori', 'vitrin', 'fiyat', 'stok', 'yayinda', 'yakinda'];
  const lines = list.map((p) => [p.slug, p.name, p.category, p.shop_cat, p.price, p.stock ?? '', p.active ? 1 : 0, p.soon ? 1 : 0].map(q).join(';'));
  return '﻿' + [head.map(q).join(';'), ...lines].join('\n');
}

/** Basit CSV ayrıştırıcı (; , ya da sekme; tırnaklı alan). */
export function parseCsv(text: string): string[][] {
  const t = text.replace(/^﻿/, '');
  const first = t.split('\n')[0] ?? '';
  const sep = (first.match(/;/g) ?? []).length >= (first.match(/,/g) ?? []).length ? ';' : ',';
  const out: string[][] = [];
  let row: string[] = [], cell = '', inq = false;
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (inq) {
      if (c === '"' && t[i + 1] === '"') { cell += '"'; i++; } else if (c === '"') inq = false; else cell += c;
    } else if (c === '"') inq = true;
    else if (c === sep) { row.push(cell); cell = ''; }
    else if (c === '\n' || c === '\r') { if (c === '\r' && t[i + 1] === '\n') i++; row.push(cell); cell = ''; if (row.some((x) => x.trim() !== '')) out.push(row); row = []; }
    else cell += c;
  }
  row.push(cell);
  if (row.some((x) => x.trim() !== '')) out.push(row);
  return out;
}

const truthy = (v: string) => /^(1|true|evet|yes|x)$/i.test(v.trim());

export function BulkEditor({ list, toast, onBack, onSaved, menu }: { list: AdminProduct[]; toast: (t: string, e?: boolean) => void; onBack: () => void; onSaved: () => void; menu: () => void }) {
  const [rows, setRows] = useState<Record<string, Row>>(() => Object.fromEntries(list.map((p) => [p.slug, rowOf(p)])));
  const [sel, setSel] = useState<string[]>([]);
  const [pct, setPct] = useState('');
  const [busy, setBusy] = useState(false);
  const [csv, setCsv] = useState<{ slug: string; patch: Partial<Row> & { name?: string; category?: string; shop_cat?: string } }[] | null>(null);
  const file = useRef<HTMLInputElement>(null);

  const changed = useMemo(() => list.filter((p) => JSON.stringify(rows[p.slug]) !== JSON.stringify(rowOf(p))), [list, rows]);
  const set = (slug: string, patch: Partial<Row>) => setRows((r) => ({ ...r, [slug]: { ...r[slug], ...patch } }));

  function applyPct(dir: 1 | -1) {
    const n = Number(pct.replace(',', '.'));
    if (!(n > 0 && n < 100)) return toast('Yüzde 1–99 arası olmalı.', true);
    if (!sel.length) return toast('Önce ürün seç.', true);
    setRows((r) => {
      const o = { ...r };
      sel.forEach((s) => { o[s] = { ...o[s], price: String(Math.round(Number(o[s].price) * (1 + (dir * n) / 100) * 100) / 100) }; });
      return o;
    });
  }

  async function saveRows(patches: { slug: string; patch: Record<string, unknown> }[], restock: string[]) {
    setBusy(true);
    for (const { slug, patch } of patches) {
      const { error } = await supabase().from('products').update(patch).eq('slug', slug);
      if (error) { setBusy(false); return toast(`${slug}: ${error.message}`, true); }
    }
    await refreshSite();
    let sent = 0;
    for (const s of restock) { const r = await notifyRestock(s); sent += r?.sent ?? 0; }
    setBusy(false);
    toast(`${patches.length} ürün güncellendi${sent ? `, ${sent} kişiye “stokta” e-postası gitti` : ''}`);
    onSaved();
  }

  async function save() {
    const patches: { slug: string; patch: Record<string, unknown> }[] = [];
    const restock: string[] = [];
    for (const p of changed) {
      const r = rows[p.slug];
      const price = Number(r.price.replace(',', '.'));
      const stock = r.stock.trim() === '' ? null : Number(r.stock);
      if (!isFinite(price) || price < 0) return toast(`${p.name}: geçersiz fiyat.`, true);
      if (stock !== null && (!Number.isInteger(stock) || stock < 0)) return toast(`${p.name}: stok boş ya da 0 veya daha büyük tam sayı olmalı.`, true);
      patches.push({ slug: p.slug, patch: { price, stock, active: r.active, soon: r.soon } });
      const wasOut = (p.stock != null && p.stock <= 0) || p.soon;
      const nowIn = (stock == null || stock > 0) && !r.soon && r.active;
      if (wasOut && nowIn) restock.push(p.slug);
    }
    await saveRows(patches, restock);
  }

  function download() {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([productsCsv(list)], { type: 'text/csv;charset=utf-8' }));
    a.download = `urunler-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  async function onFile(f: File | undefined) {
    if (!f) return;
    const rowsCsv = parseCsv(await f.text());
    if (rowsCsv.length < 2) return toast('CSV boş ya da başlık satırı yok.', true);
    const head = rowsCsv[0].map((h) => h.trim().toLowerCase().replace(/ı/g, 'i').replace(/ş/g, 's').replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ö/g, 'o').replace(/ç/g, 'c'));
    const ix = (k: string) => head.indexOf(k);
    if (ix('slug') < 0) return toast('CSV’de “slug” sütunu olmalı (önce “CSV indir” ile örnek al).', true);
    const known = new Set(list.map((p) => p.slug));
    const out: NonNullable<typeof csv> = [];
    let skipped = 0;
    for (const r of rowsCsv.slice(1)) {
      const slug = (r[ix('slug')] ?? '').trim();
      if (!known.has(slug)) { skipped++; continue; }
      const patch: NonNullable<typeof csv>[number]['patch'] = {};
      const g = (k: string) => (ix(k) >= 0 ? (r[ix(k)] ?? '').trim() : undefined);
      if (g('fiyat') !== undefined && g('fiyat') !== '') patch.price = g('fiyat')!.replace(',', '.');
      if (g('stok') !== undefined) patch.stock = g('stok')!;
      if (g('yayinda') !== undefined && g('yayinda') !== '') patch.active = truthy(g('yayinda')!);
      if (g('yakinda') !== undefined && g('yakinda') !== '') patch.soon = truthy(g('yakinda')!);
      if (g('ad')) patch.name = g('ad');
      if (g('kategori')) patch.category = g('kategori');
      if (g('vitrin') && ['sofra', 'giyim', 'aksesuar'].includes(g('vitrin')!)) patch.shop_cat = g('vitrin');
      if (Object.keys(patch).length) out.push({ slug, patch });
    }
    if (skipped) toast(`${skipped} satır tanınmayan slug nedeniyle atlandı.`, true);
    setCsv(out);
    if (file.current) file.current.value = '';
  }

  async function applyCsv() {
    if (!csv) return;
    const patches: { slug: string; patch: Record<string, unknown> }[] = [];
    const restock: string[] = [];
    for (const c of csv) {
      const p = list.find((x) => x.slug === c.slug)!;
      const patch: Record<string, unknown> = {};
      const price = c.patch.price !== undefined ? Number(c.patch.price) : p.price;
      if (c.patch.price !== undefined) { if (!isFinite(price) || price < 0) return toast(`${c.slug}: geçersiz fiyat.`, true); patch.price = price; }
      const stock = c.patch.stock !== undefined ? (c.patch.stock === '' ? null : Number(c.patch.stock)) : p.stock;
      if (c.patch.stock !== undefined) { if (stock !== null && (!Number.isInteger(stock) || (stock as number) < 0)) return toast(`${c.slug}: geçersiz stok.`, true); patch.stock = stock; }
      if (c.patch.active !== undefined) patch.active = c.patch.active;
      if (c.patch.soon !== undefined) patch.soon = c.patch.soon;
      if (c.patch.name) patch.name = c.patch.name;
      if (c.patch.category) patch.category = c.patch.category;
      if (c.patch.shop_cat) patch.shop_cat = c.patch.shop_cat;
      patches.push({ slug: c.slug, patch });
      const active = c.patch.active ?? p.active, soon = c.patch.soon ?? p.soon;
      if ((((p.stock != null && p.stock <= 0) || p.soon) && (stock == null || (stock as number) > 0) && !soon && active)) restock.push(c.slug);
    }
    await saveRows(patches, restock);
    setCsv(null);
  }

  const allSel = sel.length === list.length;
  return (
    <>
      <TopBar title="Toplu düzenleme" sub="Fiyat, stok ve yayın durumunu tek ekranda değiştir" onMenu={menu}>
        <button className="btn ghost" onClick={onBack}><ArrowLeft size={15} /> Ürünlere dön</button>
        <button className="btn" onClick={save} disabled={busy || !changed.length}><Save size={15} /> {busy ? 'Kaydediliyor…' : `Kaydet${changed.length ? ` (${changed.length})` : ''}`}</button>
      </TopBar>
      <div className="adm-scroll"><div className="adm-inner" style={{ maxWidth: 1100 }}>
        <section className="card"><div className="card-h"><h2 className="card-t">Hızlı işlemler</h2><span className="card-m">Satırları işaretle, yüzde uygula, sonra Kaydet’e bas</span></div>
          <div className="card-b" style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            <input className="inp" style={{ width: 110 }} inputMode="decimal" placeholder="% oran" value={pct} onChange={(e) => setPct(e.target.value)} />
            <button className="btn ghost" onClick={() => applyPct(1)}><Percent size={14} /> Zam yap</button>
            <button className="btn ghost" onClick={() => applyPct(-1)}><Percent size={14} /> İndirim yap</button>
            <span style={{ flex: 1 }} />
            <button className="btn ghost" onClick={download}><Download size={14} /> CSV indir</button>
            <button className="btn ghost" onClick={() => file.current?.click()}><Upload size={14} /> CSV yükle</button>
            <input ref={file} type="file" accept=".csv,text/csv" hidden onChange={(e) => onFile(e.target.files?.[0])} />
          </div>
        </section>
        {csv && (
          <div className="alert ok" style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            <span><b>{csv.length}</b> ürün CSV’den güncellenecek.</span>
            <button className="btn" onClick={applyCsv} disabled={busy || !csv.length}>Uygula</button>
            <button className="btn ghost" onClick={() => setCsv(null)}>Vazgeç</button>
          </div>
        )}
        <section className="card"><div className="card-b" style={{ padding: 0, overflowX: 'auto' }}>
          <table className="bk">
            <thead><tr><th><input type="checkbox" checked={allSel} onChange={(e) => setSel(e.target.checked ? list.map((p) => p.slug) : [])} aria-label="Hepsini seç" /></th><th>Ürün</th><th>Fiyat (₺)</th><th>Stok</th><th>Yayında</th><th>Yakında</th></tr></thead>
            <tbody>
              {list.map((p) => {
                const r = rows[p.slug];
                const dirty = JSON.stringify(r) !== JSON.stringify(rowOf(p));
                return (
                  <tr key={p.slug} className={dirty ? 'dirty' : ''}>
                    <td><input type="checkbox" checked={sel.includes(p.slug)} onChange={(e) => setSel((s) => (e.target.checked ? [...s, p.slug] : s.filter((x) => x !== p.slug)))} aria-label={p.name} /></td>
                    <td><div className="bk-n"><img src={p.thumb || p.colors?.[0]?.img} alt="" /><span><b>{p.name}</b><small>{tl(Number(p.price))} · /urun/{p.slug}</small></span></div></td>
                    <td><input className="inp" inputMode="decimal" value={r.price} onChange={(e) => set(p.slug, { price: e.target.value })} /></td>
                    <td><input className="inp" inputMode="numeric" placeholder="Sınırsız" value={r.stock} onChange={(e) => set(p.slug, { stock: e.target.value })} /></td>
                    <td><button type="button" className={`bk-sw${r.active ? ' on' : ''}`} aria-pressed={r.active} onClick={() => set(p.slug, { active: !r.active })}><i /></button></td>
                    <td><button type="button" className={`bk-sw${r.soon ? ' on' : ''}`} aria-pressed={r.soon} onClick={() => set(p.slug, { soon: !r.soon })}><i /></button></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div></section>
        <p className="cell-muted">Stoğu 0’dan yukarı çıkardığında “stoğa girince haber ver” listesindekilere e-posta otomatik gider (e-posta servisi bağlıysa).</p>
      </div></div>
    </>
  );
}
