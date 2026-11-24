'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { dt, tl, type AdminOrder, type AdminProduct } from '@/lib/admin';
import { CARRIER_NAMES } from '@/lib/carriers';
import { RET_STATUS, type Ret } from '@/lib/analytics';
import { useMenu } from '@/components/admin/Shell';
import { Loading, TopBar, useToast } from '@/components/admin/ui';
import { Card, Tabs, Tbl } from '@/components/admin/Tbl';
import { PageHero } from '@/components/admin/PageHero';
import { DepoHazir } from '@/components/admin/DepoHazir';

type O = AdminOrder & { packed_at?: string | null };
const TABS = [['hazir', 'Hazırlanacak'], ['paket', 'Paketlenen / kargoya verilecek'], ['topla', 'Hazırlık özeti'], ['stok', 'Stok ve barkod'], ['iade', 'İade gelen / hasarlı']] as const;

const label = (o: O) => {
  const a = window.open('', '_blank', 'width=420,height=560');
  if (!a) return;
  const ad = o.address as unknown as { city?: string; district?: string; address?: string };
  const e = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
  a.document.write(`<title>${e(o.order_no)}</title><body style="font:14px system-ui;padding:18px"><h2 style="margin:0">${e(o.order_no)}</h2><hr><b>${e(o.full_name)}</b><br>${e(o.phone)}<br>${e(ad?.address ?? '')}<br>${e(ad?.district ?? '')} / ${e(ad?.city ?? '')}<hr>${o.items.map((i) => `${i.qty}× ${e(i.name)}${i.color_name ? ' · ' + e(i.color_name) : ''}${i.size ? ' · ' + e(i.size) : ''}`).join('<br>')}${o.payment_method === 'kapida' ? `<hr><b>KAPIDA ÖDEME: ${tl(Number(o.total))}</b>` : ''}</body>`);
  a.document.close(); a.print();
};

export default function Depo() {
  const menu = useMenu();
  const { show, node } = useToast();
  const [os, setOs] = useState<O[] | null>(null);
  const [ps, setPs] = useState<AdminProduct[]>([]);
  const [rs, setRs] = useState<Ret[]>([]);
  const [tab, setTab] = useState<(typeof TABS)[number][0]>('hazir');
  const [track, setTrack] = useState<Record<string, { c: string; n: string }>>({});
  const load = useCallback(async () => {
    const sb = supabase();
    const [o, p, r] = await Promise.all([
      sb.from('orders').select('*').in('status', ['hazirlaniyor', 'odeme_bekleniyor']).order('created_at').limit(500),
      sb.from('products').select('*').order('sort'),
      sb.from('returns').select('*').in('status', ['onaylandi', 'teslim_alindi', 'hasarli']).order('created_at', { ascending: false }),
    ]);
    setOs((o.data ?? []) as O[]); setPs((p.data ?? []) as AdminProduct[]); setRs((r.data ?? []) as Ret[]);
  }, []);
  useEffect(() => { const t = setTimeout(load, 0); return () => clearTimeout(t); }, [load]);

  const prep = useMemo(() => (os ?? []).filter((o) => o.status === 'hazirlaniyor' && !o.packed_at), [os]);
  const packed = useMemo(() => (os ?? []).filter((o) => o.status === 'hazirlaniyor' && o.packed_at), [os]);
  const pick = useMemo(() => {
    const m = new Map<string, { name: string; opt: string; qty: number; slug: string }>();
    prep.forEach((o) => o.items.forEach((i) => { const sg = (i as { slug?: string }).slug ?? ''; const k = `${sg}|${i.color_name ?? ''}|${i.size ?? ''}`; const c = m.get(k) ?? { name: i.name, opt: [i.color_name, i.size].filter(Boolean).join(' · '), qty: 0, slug: sg }; c.qty += i.qty; m.set(k, c); }));
    return [...m.values()].sort((a, b) => a.name.localeCompare(b.name, 'tr'));
  }, [prep]);

  const groups = useMemo(() => {
    const m = new Map<string, { name: string; qty: number; rows: { opt: string; qty: number }[] }>();
    pick.forEach((x) => { const g = m.get(x.slug || x.name) ?? { name: x.name, qty: 0, rows: [] }; g.qty += x.qty; g.rows.push({ opt: x.opt || 'Tek seçenek', qty: x.qty }); m.set(x.slug || x.name, g); });
    return [...m.values()].sort((a, b) => b.qty - a.qty);
  }, [pick]);
  function printPrep() {
    const a = window.open('', '_blank', 'width=720,height=900');
    if (!a) return;
    const e = (v: string) => v.replace(/&/g, '&amp;').replace(/</g, '&lt;');
    const total = groups.reduce((n, g) => n + g.qty, 0);
    a.document.write(`<title>Hazırlık özeti</title><body style="font:14px system-ui;padding:24px"><h2 style="margin:0 0 4px">Hazırlık özeti</h2><div style="color:#666;margin-bottom:14px">${prep.length} sipariş · ${total} adet · ${new Date().toLocaleDateString('tr-TR')}</div>${groups.map((g) => `<div style="margin:0 0 14px;break-inside:avoid"><div style="display:flex;justify-content:space-between;border-bottom:2px solid #000;font-weight:700;padding:4px 0"><span>${e(g.name)}</span><span>${g.qty} adet</span></div>${g.rows.map((r) => `<div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid #ddd"><span>☐ ${e(r.opt)}</span><b>${r.qty}</b></div>`).join('')}</div>`).join('')}</body>`);
    a.document.close(); a.print();
  }

  async function pack(o: O) {
    const { error } = await supabase().from('orders').update({ packed_at: new Date().toISOString() }).eq('id', o.id);
    if (error) show(error.message, true); else load();
  }
  async function ship(o: O) {
    const t = track[o.id];
    if (!t?.n?.trim()) return show('Takip numarası gir.', true);
    const { error } = await supabase().from('orders').update({ status: 'kargoda', tracking_carrier: t.c || CARRIER_NAMES[0], tracking_no: t.n.trim() }).eq('id', o.id);
    if (error) show(error.message, true); else { show('Kargoya verildi'); load(); }
  }
  async function retStatus(id: string, status: string) {
    const { error } = await supabase().from('returns').update({ status, updated_at: new Date().toISOString() }).eq('id', id);
    if (error) show(error.message, true); else load();
  }
  if (!os) return (<><TopBar title="Depo" onMenu={menu} /><div className="adm-scroll"><Loading /></div></>);
  const crit = ps.filter((p) => p.active && p.stock != null && p.stock <= (((p.data as { crit?: number }).crit) ?? 5));
  const noBar = ps.filter((p) => p.active && !((p.data as { barcode?: string }).barcode ?? '').trim());

  return (
    <>
      <TopBar title="Depo" sub="Hazırlama, paketleme, kargo ve iade teslim" onMenu={menu} />
      <div className="adm-scroll"><div className="adm-inner"><PageHero />
        <div className="kpis">
          {[['Hazırlanacak', prep.length], ['Paketlenen', packed.length], ['Ödeme bekleyen', (os ?? []).filter((o) => o.status === 'odeme_bekleniyor').length], ['Gelen iade', rs.length]].map(([l, v]) => <div className="kpi" key={String(l)}><div className="kpi-top"><span className="kpi-label">{l}</span></div><div className="kpi-val">{v}</div></div>)}
        </div>
        <Tabs items={TABS} value={tab} onChange={setTab} />
        {tab === 'hazir' && <DepoHazir orders={prep} products={ps} onChanged={load} show={show} onPack={pack} onAddrLabel={label} />}
        {tab === 'paket' && <Card title="Kargoya verilecek" meta="Takip numarasını gir, kargoya ver"><Tbl min={900} cols={[['Sipariş', '90px'], ['Müşteri', 'minmax(0,1fr)'], ['Kargo', '150px'], ['Takip no', '170px'], ['', '110px']]}
          rows={packed.map((o) => [o.order_no, o.full_name,
            <select key="c" className="inp" value={track[o.id]?.c ?? CARRIER_NAMES[0]} onChange={(e) => setTrack((t) => ({ ...t, [o.id]: { c: e.target.value, n: t[o.id]?.n ?? '' } }))}>{CARRIER_NAMES.map((c) => <option key={c}>{c}</option>)}</select>,
            <input key="n" className="inp" value={track[o.id]?.n ?? ''} onChange={(e) => setTrack((t) => ({ ...t, [o.id]: { c: t[o.id]?.c ?? CARRIER_NAMES[0], n: e.target.value } }))} />,
            <button key="s" className="btn" onClick={() => ship(o)}>Kargoya ver</button>])} empty="Paketlenmiş sipariş yok" /></Card>}
        {tab === 'topla' && (
          <>
            <div className="kpis">{[['Sipariş', prep.length], ['Toplam adet', groups.reduce((n, g) => n + g.qty, 0)], ['Ürün çeşidi', groups.length]].map(([l, v]) => <div className="kpi" key={String(l)}><div className="kpi-top"><span className="kpi-label">{l}</span></div><div className="kpi-val">{v}</div></div>)}</div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', margin: '0 0 8px' }}><button className="btn ghost" onClick={printPrep} disabled={!groups.length}>Yazdır</button></div>
            {groups.length === 0 ? <Card title="Hazırlık özeti"><Tbl min={0} cols={[['Ürün', '1fr']]} rows={[]} empty="Hazırlanacak ürün yok" /></Card> : groups.map((g) => (
              <Card key={g.name} title={g.name} meta={`${g.qty} adet`}><Tbl min={0} cols={[['Varyasyon', 'minmax(0,1fr)'], ['Adet', '70px']]} rows={g.rows.map((r) => [r.opt, <b key="q">{r.qty}</b>])} empty="" /></Card>
            ))}
          </>
        )}
        {tab === 'stok' && (
          <>
            <Card title="Varyasyon stokları" meta="Ürün ve renk bazında"><Tbl min={0} cols={[['Ürün', 'minmax(0,1.2fr)'], ['Varyasyon', 'minmax(0,1fr)'], ['Stok', '80px']]}
              rows={ps.filter((p) => p.active).flatMap((p): React.ReactNode[][] => {
                const cs = (p.colors ?? []).filter((c) => typeof c.stock === 'number');
                if (!cs.length) return [[p.name, '—', p.stock ?? '∞']];
                return cs.map((c, k) => [k === 0 ? p.name : '', c.name, <b key={c.key} style={{ color: (c.stock as number) <= 0 ? 'var(--red, #d33)' : undefined }}>{c.stock}</b>]);
              })} empty="Ürün yok" /></Card>
            <Card title="Kritik stok" meta={`${crit.length} ürün`}><Tbl min={0} cols={[['Ürün', 'minmax(0,1fr)'], ['Stok', '80px']]} rows={crit.map((p) => [p.name, p.stock])} empty="Kritik stok yok" /></Card>
            <Card title="Barkodu girilmemiş" meta={`${noBar.length} ürün`}><Tbl min={0} cols={[['Ürün', 'minmax(0,1fr)'], ['', '90px']]} rows={noBar.map((p) => [p.name, <a key="a" style={{ color: 'var(--ac)' }} href={`/admin/urunler?edit=${p.slug}`}>Düzenle</a>])} empty="Hepsi tamam" /></Card>
          </>
        )}
        {tab === 'iade' && <Card title="İade gelen ve hasarlı ürünler"><Tbl min={700} cols={[['Sipariş', '100px'], ['Ürün', 'minmax(0,1fr)'], ['Adet', '60px'], ['Tarih', '110px'], ['Durum', '170px']]}
          rows={rs.map((r) => [r.order_no, r.product_slug, r.qty, dt(r.created_at), <select key="s" className="inp" value={r.status} onChange={(e) => retStatus(r.id, e.target.value)}>{Object.entries(RET_STATUS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>])} empty="Bekleyen iade yok" /></Card>}
      </div></div>
      {node}
    </>
  );
}
