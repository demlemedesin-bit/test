'use client';

import { useEffect, useMemo, useState } from 'react';
import { Save } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { refreshSite, tl, type AdminProduct } from '@/lib/admin';
import { useMenu } from '@/components/admin/Shell';
import { Loading, TopBar, useToast } from '@/components/admin/ui';
import { toIso, toLocalInput } from '@/lib/design';
import { Card, Tbl } from '@/components/admin/Tbl';

type Sale = { price?: number | string; starts_at?: string; ends_at?: string };
const saleOf = (p: AdminProduct) => ((p.data as { sale?: Sale }).sale ?? {}) as Sale;
const state = (p: AdminProduct) => {
  const s = saleOf(p); const sp = Number(s.price); if (!s.price || !(sp < p.price)) return '—';
  const now = Date.now();
  if (s.starts_at && new Date(s.starts_at).getTime() > now) return 'Zamanlandı';
  if (s.ends_at && new Date(s.ends_at).getTime() <= now) return 'Bitti';
  return 'Aktif';
};

export default function Sureli() {
  const menu = useMenu();
  const { show, node } = useToast();
  const [ps, setPs] = useState<AdminProduct[] | null>(null);
  const [draft, setDraft] = useState<Record<string, Sale>>({});
  const [bulk, setBulk] = useState({ pct: '', starts_at: '', ends_at: '' });
  const [busy, setBusy] = useState(false);
  const load = () => supabase().from('products').select('*').order('sort').then(({ data }) => { setPs((data ?? []) as AdminProduct[]); setDraft({}); });
  useEffect(() => { load(); }, []);
  const get = (p: AdminProduct): Sale => draft[p.slug] ?? saleOf(p);
  const set = (p: AdminProduct, patch: Sale) => setDraft((d) => ({ ...d, [p.slug]: { ...get(p), ...patch } }));
  const dirty = useMemo(() => Object.keys(draft), [draft]);

  function applyBulk() {
    const pct = Number(bulk.pct);
    if (!(pct > 0 && pct < 100)) return show('İndirim yüzdesi 1–99 olmalı.', true);
    const d: Record<string, Sale> = { ...draft };
    (ps ?? []).filter((p) => p.active && !p.soon).forEach((p) => { d[p.slug] = { price: Math.round(p.price * (1 - pct / 100)), starts_at: bulk.starts_at, ends_at: bulk.ends_at }; });
    setDraft(d);
  }
  async function save() {
    if (!ps) return;
    setBusy(true);
    let fail = '';
    for (const slug of dirty) {
      const p = ps.find((x) => x.slug === slug)!;
      const s = draft[slug];
      const price = s.price === '' || s.price == null ? null : Number(s.price);
      const data = { ...(p.data as object), sale: price == null ? undefined : { price, starts_at: s.starts_at || '', ends_at: s.ends_at || '' } };
      if (price != null && (!(price >= 0) || price >= p.price)) { fail = `${p.name}: kampanya fiyatı normal fiyattan düşük olmalı.`; break; }
      const { error } = await supabase().from('products').update({ data }).eq('slug', slug);
      if (error) { fail = error.message; break; }
    }
    if (!fail) await refreshSite();
    setBusy(false);
    show(fail || 'Kaydedildi, kampanya fiyatları yayında', !!fail);
    if (!fail) load();
  }
  if (!ps) return (<><TopBar title="Süreli kampanya" onMenu={menu} /><div className="adm-scroll"><Loading /></div></>);

  return (
    <>
      <TopBar title="Süreli kampanya" sub="Ürüne zamanlı indirimli fiyat: başlangıç/bitişte kendiliğinden devreye girer ve çıkar" onMenu={menu}>
        <button className="btn" onClick={save} disabled={busy || !dirty.length}><Save size={15} /> {busy ? 'Kaydediliyor…' : `Kaydet${dirty.length ? ` (${dirty.length})` : ''}`}</button>
      </TopBar>
      <div className="adm-scroll"><div className="adm-inner">
        <Card title="Toplu kampanya" meta="Aktif tüm ürünlere yüzde indirim uygular (kaydetmeden önce satırlardan düzeltebilirsin)">
          <div style={{ padding: 16, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'end' }}>
            <label className="fld" style={{ width: 120 }}><span className="lbl">İndirim %</span><input className="inp" type="number" value={bulk.pct} onChange={(e) => setBulk({ ...bulk, pct: e.target.value })} /></label>
            <label className="fld"><span className="lbl">Başlangıç</span><input className="inp" type="datetime-local" value={toLocalInput(bulk.starts_at)} onChange={(e) => setBulk({ ...bulk, starts_at: toIso(e.target.value) })} /></label>
            <label className="fld"><span className="lbl">Bitiş</span><input className="inp" type="datetime-local" value={toLocalInput(bulk.ends_at)} onChange={(e) => setBulk({ ...bulk, ends_at: toIso(e.target.value) })} /></label>
            <button className="btn ghost" onClick={applyBulk}>Uygula</button>
          </div>
        </Card>
        <Card title="Ürünler" meta="Kampanya fiyatını boşaltırsan kampanya kalkar">
          <Tbl min={900} cols={[['Ürün', 'minmax(0,1.3fr)'], ['Fiyat', '80px'], ['Kampanya fiyatı', '120px'], ['Başlangıç', '190px'], ['Bitiş', '190px'], ['Durum', '90px']]}
            rows={ps.map((p) => { const s = get(p); return [
              <span key="n" style={{ fontWeight: draft[p.slug] ? 700 : 400 }}>{p.name}</span>, tl(p.price),
              <input key="p" className="inp" type="number" value={s.price ?? ''} onChange={(e) => set(p, { price: e.target.value })} />,
              <input key="a" className="inp" type="datetime-local" value={toLocalInput(s.starts_at ?? '')} onChange={(e) => set(p, { starts_at: toIso(e.target.value) })} />,
              <input key="b" className="inp" type="datetime-local" value={toLocalInput(s.ends_at ?? '')} onChange={(e) => set(p, { ends_at: toIso(e.target.value) })} />,
              state(p)]; })} />
        </Card>
      </div></div>
      {node}
    </>
  );
}
