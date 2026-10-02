'use client';

import { useEffect, useMemo, useState } from 'react';
import { Save, Timer, CalendarClock, CircleSlash, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { refreshSite, tl, type AdminProduct } from '@/lib/admin';
import { useMenu } from '@/components/admin/Shell';
import { Kpi, Loading, TopBar, useToast } from '@/components/admin/ui';
import { toIso, toLocalInput } from '@/lib/design';
import { Card, Tbl } from '@/components/admin/Tbl';
import { SalePreview } from '@/components/admin/Preview';

type Sale = { price?: number | string; starts_at?: string; ends_at?: string };
const saleOf = (p: AdminProduct) => ((p.data as { sale?: Sale }).sale ?? {}) as Sale;

type St = 'Yok' | 'Aktif' | 'Zamanlandı' | 'Bitti' | 'Hatalı';
function stateOf(price: number, s: Sale, now: number): St {
  if (s.price === undefined || s.price === '' || s.price === null) return 'Yok';
  const sp = Number(s.price);
  if (!isFinite(sp) || sp < 0 || sp >= price) return 'Hatalı';
  const a = s.starts_at ? Date.parse(s.starts_at) : NaN;
  const b = s.ends_at ? Date.parse(s.ends_at) : NaN;
  if (isFinite(a) && isFinite(b) && b <= a) return 'Hatalı';
  if (isFinite(a) && a > now) return 'Zamanlandı';
  if (isFinite(b) && b <= now) return 'Bitti';
  return 'Aktif';
}
const TONE: Record<St, string> = { Yok: 'b-gray', Aktif: 'b-green', Zamanlandı: 'b-amber', Bitti: 'b-gray', Hatalı: 'b-red' };
function left(s: Sale, now: number): string {
  const b = s.ends_at ? Date.parse(s.ends_at) : NaN;
  if (!isFinite(b)) return s.price ? 'süresiz' : '—';
  const ms = b - now;
  if (ms <= 0) return 'bitti';
  const h = Math.floor(ms / 36e5);
  return h >= 48 ? `${Math.floor(h / 24)} gün` : `${h} sa ${Math.floor((ms % 36e5) / 6e4)} dk`;
}

export default function Sureli() {
  const menu = useMenu();
  const { show, node } = useToast();
  const [ps, setPs] = useState<AdminProduct[] | null>(null);
  const [draft, setDraft] = useState<Record<string, Sale>>({});
  const [bulk, setBulk] = useState({ pct: '', starts_at: '', ends_at: '' });
  const [busy, setBusy] = useState(false);
  const [sel, setSel] = useState<string>('');
  const [now, setNow] = useState(() => Date.now());
  const load = () => supabase().from('products').select('*').order('sort').then(({ data }) => { setPs((data ?? []) as AdminProduct[]); setDraft({}); setNow(Date.now()); });
  useEffect(() => { const t = setTimeout(load, 0); const i = setInterval(() => setNow(Date.now()), 30000); return () => { clearTimeout(t); clearInterval(i); }; }, []);
  const get = (p: AdminProduct): Sale => draft[p.slug] ?? saleOf(p);
  const set = (p: AdminProduct, patch: Sale) => setDraft((d) => ({ ...d, [p.slug]: { ...get(p), ...patch } }));
  const dirty = useMemo(() => Object.keys(draft), [draft]);
  const counts = useMemo(() => {
    const c: Record<St, number> = { Yok: 0, Aktif: 0, Zamanlandı: 0, Bitti: 0, Hatalı: 0 };
    (ps ?? []).forEach((p) => { c[stateOf(Number(p.price), get(p), now)]++; });
    return c;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ps, draft, now]);

  function applyBulk() {
    const pct = Number(bulk.pct);
    if (!(pct > 0 && pct < 100)) return show('İndirim yüzdesi 1–99 olmalı.', true);
    if (bulk.starts_at && bulk.ends_at && Date.parse(bulk.ends_at) <= Date.parse(bulk.starts_at)) return show('Bitiş, başlangıçtan sonra olmalı.', true);
    const d: Record<string, Sale> = { ...draft };
    (ps ?? []).filter((p) => p.active && !p.soon).forEach((p) => { d[p.slug] = { price: Math.round(Number(p.price) * (1 - pct / 100) * 100) / 100, starts_at: bulk.starts_at, ends_at: bulk.ends_at }; });
    setDraft(d);
    show('Satırlara uygulandı; kontrol edip “Kaydet”e bas.');
  }
  async function save() {
    if (!ps) return;
    for (const slug of dirty) {
      const p = ps.find((x) => x.slug === slug)!;
      if (stateOf(Number(p.price), draft[slug], now) === 'Hatalı') return show(`${p.name}: kampanya fiyatı normal fiyattan düşük, bitiş de başlangıçtan sonra olmalı.`, true);
    }
    setBusy(true);
    let fail = '';
    for (const slug of dirty) {
      const p = ps.find((x) => x.slug === slug)!;
      const s = draft[slug];
      const empty = s.price === '' || s.price == null;
      const data = { ...(p.data as Record<string, unknown>) };
      if (empty) delete data.sale;
      else data.sale = { price: Number(s.price), starts_at: s.starts_at || '', ends_at: s.ends_at || '' };
      const { error } = await supabase().from('products').update({ data }).eq('slug', slug);
      if (error) { fail = `${p.name}: ${error.message}`; break; }
    }
    if (!fail) await refreshSite();
    setBusy(false);
    show(fail || 'Kaydedildi, kampanya fiyatları sitede yayında', !!fail);
    if (!fail) load();
  }
  if (!ps) return (<><TopBar title="Süreli kampanya" onMenu={menu} /><div className="adm-scroll"><Loading /></div></>);
  const cur = ps.find((p) => p.slug === sel) ?? ps[0];
  const cs = cur ? get(cur) : {};
  const cst = cur ? stateOf(Number(cur.price), cs, now) : 'Yok';
  const cprice = Number(cs.price);
  const crit = Number((cur?.data as { crit?: number } | undefined)?.crit) > 0 ? Number((cur?.data as { crit?: number }).crit) : 5;

  return (
    <>
      <TopBar title="Süreli kampanya" sub="Başlangıç ve bitişte kendiliğinden devreye girer, çıkar" onMenu={menu}>
        <button className="btn" onClick={save} disabled={busy || !dirty.length}><Save size={15} /> {busy ? 'Kaydediliyor…' : `Kaydet${dirty.length ? ` (${dirty.length})` : ''}`}</button>
      </TopBar>
      <div className="adm-scroll"><div className="adm-inner">
        <div className="kpis">
          <Kpi label="Aktif kampanya" value={String(counts.Aktif)} sub="şu an sitede indirimli" tone="green" icon={<Timer size={17} />} />
          <Kpi label="Zamanlanmış" value={String(counts.Zamanlandı)} sub="başlangıcı bekliyor" tone="amber" icon={<CalendarClock size={17} />} />
          <Kpi label="Biten" value={String(counts.Bitti)} sub="süresi dolmuş, temizlenebilir" tone="blue" icon={<CircleSlash size={17} />} />
          <Kpi label="Hatalı" value={String(counts.Hatalı)} sub="fiyat veya tarih geçersiz" tone="red" icon={<X size={17} />} />
        </div>
        <Card title="Toplu kampanya" meta="Satıştaki tüm ürünlere yüzde indirim uygular; kaydetmeden önce satırlardan düzeltebilirsin">
          <div style={{ padding: 16, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'end' }}>
            <label className="fld" style={{ width: 120 }}><span className="lbl">İndirim %</span><input className="inp" type="number" min={1} max={99} value={bulk.pct} onChange={(e) => setBulk({ ...bulk, pct: e.target.value })} /></label>
            <label className="fld"><span className="lbl">Başlangıç</span><input className="inp" type="datetime-local" value={toLocalInput(bulk.starts_at)} onChange={(e) => setBulk({ ...bulk, starts_at: toIso(e.target.value) })} /></label>
            <label className="fld"><span className="lbl">Bitiş</span><input className="inp" type="datetime-local" value={toLocalInput(bulk.ends_at)} onChange={(e) => setBulk({ ...bulk, ends_at: toIso(e.target.value) })} /></label>
            <button className="btn ghost" onClick={applyBulk}>Uygula</button>
            <button className="btn ghost" onClick={() => { const d: Record<string, Sale> = { ...draft }; ps.filter((p) => stateOf(Number(p.price), get(p), now) === 'Bitti').forEach((p) => { d[p.slug] = { price: '' }; }); setDraft(d); show('Biten kampanyalar temizlenmek üzere işaretlendi; “Kaydet”e bas.'); }}>Bitenleri temizle</button>
          </div>
        </Card>
        {cur && (
          <Card title={`Sitede nasıl görünür: ${cur.name}`} meta="Tablodan bir satıra tıkla">
            <div style={{ padding: 16 }}>
              <SalePreview name={cur.name} base={Number(cur.price)} price={isFinite(cprice) ? cprice : Number(cur.price)} pct={isFinite(cprice) && Number(cur.price) > 0 ? Math.round(((Number(cur.price) - cprice) / Number(cur.price)) * 100) : 0} ends={cs.ends_at} left={cur.stock != null && cur.stock > 0 && cur.stock <= crit ? cur.stock : undefined} state={cst} />
            </div>
          </Card>
        )}
        <Card title="Ürünler" meta="Kampanya fiyatını boşaltırsan kampanya kalkar. Sipariş tutarı her zaman veritabanında yeniden hesaplanır.">
          <Tbl min={1050} cols={[['Ürün', 'minmax(0,1.3fr)'], ['Fiyat', '80px'], ['Kampanya fiyatı', '120px'], ['İndirim', '70px'], ['Başlangıç', '190px'], ['Bitiş', '190px'], ['Kalan', '90px'], ['Durum', '100px']]}
            rows={ps.map((p) => { const s = get(p); const st = stateOf(Number(p.price), s, now); const pc = Number(s.price); return [
              <button key="n" type="button" onClick={() => setSel(p.slug)} style={{ background: 'none', border: 0, color: p.slug === cur?.slug ? 'var(--ac)' : 'inherit', fontWeight: draft[p.slug] || p.slug === cur?.slug ? 700 : 400, textAlign: 'left', padding: 0, cursor: 'pointer' }}>{p.name}</button>, tl(Number(p.price)),
              <input key="p" className="inp" type="number" min={0} value={s.price ?? ''} onChange={(e) => set(p, { price: e.target.value })} />,
              s.price !== '' && s.price != null && isFinite(pc) && pc < Number(p.price) ? <b key="pc" style={{ color: 'var(--green)' }}>%{Math.round(((Number(p.price) - pc) / Number(p.price)) * 100)}</b> : '—',
              <input key="a" className="inp" type="datetime-local" value={toLocalInput(s.starts_at ?? '')} onChange={(e) => set(p, { starts_at: toIso(e.target.value) })} />,
              <input key="b" className="inp" type="datetime-local" value={toLocalInput(s.ends_at ?? '')} onChange={(e) => set(p, { ends_at: toIso(e.target.value) })} />,
              st === 'Aktif' || st === 'Zamanlandı' ? left(s, now) : '—',
              <span key="s" className={`badge ${TONE[st]}`}>{st}</span>]; })} />
        </Card>
      </div></div>
      {node}
    </>
  );
}
