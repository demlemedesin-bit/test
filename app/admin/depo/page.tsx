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

type O = AdminOrder & { packed_at?: string | null };
const TABS = [['hazir', 'Hazırlanacak'], ['paket', 'Paketlenen / kargoya verilecek'], ['topla', 'Ürün toplama'], ['stok', 'Stok ve barkod'], ['iade', 'İade gelen / hasarlı']] as const;

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
  const items = (o: O) => o.items.map((i) => `${i.qty}× ${i.name}${i.color_name ? ' · ' + i.color_name : ''}${i.size ? ' · ' + i.size : ''}`).join(', ');
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
        {tab === 'hazir' && <Card title="Hazırlanacak siparişler" meta="Eskiden yeniye"><Tbl min={820} cols={[['Sipariş', '90px'], ['Tarih', '110px'], ['Müşteri', 'minmax(0,1fr)'], ['Ürünler', 'minmax(0,2fr)'], ['', '170px']]}
          rows={prep.map((o) => [o.order_no, dt(o.created_at, true), o.full_name, items(o), <span key="a" style={{ display: 'flex', gap: 6 }}><button className="btn ghost" onClick={() => label(o)}>Etiket</button><button className="btn" onClick={() => pack(o)}>Paketlendi</button></span>])} empty="Hazırlanacak sipariş yok" /></Card>}
        {tab === 'paket' && <Card title="Kargoya verilecek" meta="Takip numarasını gir, kargoya ver"><Tbl min={900} cols={[['Sipariş', '90px'], ['Müşteri', 'minmax(0,1fr)'], ['Kargo', '150px'], ['Takip no', '170px'], ['', '110px']]}
          rows={packed.map((o) => [o.order_no, o.full_name,
            <select key="c" className="inp" value={track[o.id]?.c ?? CARRIER_NAMES[0]} onChange={(e) => setTrack((t) => ({ ...t, [o.id]: { c: e.target.value, n: t[o.id]?.n ?? '' } }))}>{CARRIER_NAMES.map((c) => <option key={c}>{c}</option>)}</select>,
            <input key="n" className="inp" value={track[o.id]?.n ?? ''} onChange={(e) => setTrack((t) => ({ ...t, [o.id]: { c: t[o.id]?.c ?? CARRIER_NAMES[0], n: e.target.value } }))} />,
            <button key="s" className="btn" onClick={() => ship(o)}>Kargoya ver</button>])} empty="Paketlenmiş sipariş yok" /></Card>}
        {tab === 'topla' && <Card title="Toplama listesi" meta={`${prep.length} sipariş`}><Tbl min={0} cols={[['Ürün', 'minmax(0,1.4fr)'], ['Seçenek', 'minmax(0,1fr)'], ['Adet', '70px']]} rows={pick.map((x) => [x.name, x.opt || '—', <b key="q">{x.qty}</b>])} empty="Toplanacak ürün yok" /></Card>}
        {tab === 'stok' && (
          <>
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
