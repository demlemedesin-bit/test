'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Download } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { dt, tl, type AdminOrder } from '@/lib/admin';
import { DAY, startOfDay, ymd, type Ret } from '@/lib/analytics';
import { useMenu } from '@/components/admin/Shell';
import { Loading, TopBar } from '@/components/admin/ui';
import { Card, Tbl } from '@/components/admin/Tbl';

type Pay = { order_no: string; status: string; paid_price: number | null; created_at: string };
const PAY: Record<string, string> = { havale: 'Havale / EFT', kapida: 'Kapıda ödeme', kart: 'Kredi kartı' };

export default function Muhasebe() {
  const menu = useMenu();
  const [days, setDays] = useState(30);
  const [kdv, setKdv] = useState(10);
  const [os, setOs] = useState<AdminOrder[] | null>(null);
  const [ps, setPs] = useState<Pay[]>([]);
  const [rs, setRs] = useState<Ret[]>([]);
  useEffect(() => {
    const sb = supabase();
    const from = new Date(startOfDay() - 120 * DAY).toISOString();
    Promise.all([
      sb.from('orders').select('*').gte('created_at', from).order('created_at', { ascending: false }).limit(5000),
      sb.from('payments').select('order_no,status,paid_price,created_at').gte('created_at', from).limit(5000),
      sb.from('returns').select('*').gte('created_at', from).limit(5000),
    ]).then(([o, p, r]) => { setOs((o.data ?? []) as AdminOrder[]); setPs((p.data ?? []) as Pay[]); setRs((r.data ?? []) as Ret[]); });
  }, []);

  const m = useMemo(() => {
    const from = startOfDay() - (days - 1) * DAY;
    const inR = (iso: string) => new Date(iso).getTime() >= from;
    const all = (os ?? []).filter((o) => inR(o.created_at));
    const live = all.filter((o) => o.status !== 'iptal');
    const sum = (l: AdminOrder[], k: 'total' | 'discount' | 'shipping' | 'subtotal') => l.reduce((n, o) => n + Number(o[k] ?? 0), 0);
    const ret = rs.filter((x) => x.kind === 'iade' && x.status !== 'red' && inR(x.created_at)).reduce((n, x) => n + Number(x.amount), 0);
    const byDay = new Map<string, { n: number; t: number; d: number; s: number }>();
    live.forEach((o) => { const k = ymd(new Date(o.created_at).getTime()); const c = byDay.get(k) ?? { n: 0, t: 0, d: 0, s: 0 }; c.n++; c.t += Number(o.total); c.d += Number(o.discount ?? 0); c.s += Number(o.shipping); byDay.set(k, c); });
    const byPay = new Map<string, { n: number; t: number }>();
    live.forEach((o) => { const c = byPay.get(o.payment_method) ?? { n: 0, t: 0 }; c.n++; c.t += Number(o.total); byPay.set(o.payment_method, c); });
    const pays = ps.filter((p) => inR(p.created_at));
    return {
      live, cancelled: all.filter((o) => o.status === 'iptal'), revenue: sum(live, 'total'), subtotal: sum(live, 'subtotal'), discount: sum(live, 'discount'), shipping: sum(live, 'shipping'), ret,
      byDay: [...byDay.entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1)), byPay: [...byPay.entries()],
      ok: pays.filter((p) => p.status === 'paid'), failed: pays.filter((p) => p.status === 'failed'), refunded: pays.filter((p) => p.status === 'refunded'),
      toInvoice: live.filter((o) => o.status === 'kargoda' || o.status === 'teslim_edildi'),
    };
  }, [os, ps, rs, days]);
  if (!os) return (<><TopBar title="Muhasebe" onMenu={menu} /><div className="adm-scroll"><Loading /></div></>);

  const tax = m.revenue - m.revenue / (1 + kdv / 100);
  function csv() {
    const rows = [['tarih', 'sipariş', 'ciro', 'indirim', 'kargo'], ...m.byDay.map(([d, c]) => [d, c.n, c.t, c.d, c.s])];
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob(['﻿' + rows.map((r) => r.join(';')).join('\n')], { type: 'text/csv;charset=utf-8' }));
    a.download = 'muhasebe.csv'; a.click();
  }
  const kp: [string, string][] = [['Ciro (KDV dahil)', tl(m.revenue)], ['Sipariş', String(m.live.length)], ['İade tutarı', tl(m.ret)], ['İndirim', tl(m.discount)], ['Kargo geliri', tl(m.shipping)], [`Vergi (KDV %${kdv})`, tl(tax)], ['Başarılı ödeme', String(m.ok.length)], ['Başarısız ödeme', String(m.failed.length)], ['İptal sipariş', String(m.cancelled.length)], ['Para iadesi (kart)', String(m.refunded.length)]];
  return (
    <>
      <TopBar title="Muhasebe" sub="Ciro, vergi, ödemeler, iade ve fatura durumu" onMenu={menu}>
        <select className="inp" style={{ width: 'auto' }} value={days} onChange={(e) => setDays(+e.target.value)}>{[7, 30, 90].map((d) => <option key={d} value={d}>Son {d} gün</option>)}</select>
        <label className="fld" style={{ margin: 0, width: 90 }}><input className="inp" type="number" min={0} max={30} value={kdv} onChange={(e) => setKdv(+e.target.value || 0)} title="KDV oranı %" /></label>
        <button className="btn ghost" onClick={csv}><Download size={15} /> CSV</button>
      </TopBar>
      <div className="adm-scroll"><div className="adm-inner">
        <div className="kpis">{kp.map(([l, v]) => <div className="kpi" key={l}><div className="kpi-top"><span className="kpi-label">{l}</span></div><div className="kpi-val">{v}</div></div>)}</div>
        <div className="grid2 even">
          <Card title="Ödeme yöntemleri"><Tbl min={0} cols={[['Yöntem', 'minmax(0,1fr)'], ['Sipariş', '70px'], ['Tutar', '110px']]} rows={m.byPay.map(([k, v]) => [PAY[k] ?? k, v.n, tl(v.t)])} empty="Veri yok" /></Card>
          <Card title="Fatura durumu" meta="Kargoda / teslim edilen siparişler"><Tbl min={0} cols={[['Sipariş', '100px'], ['Tarih', '110px'], ['', '100px']]} rows={m.toInvoice.slice(0, 15).map((o) => [o.order_no, dt(o.created_at), <Link key="l" href={`/admin/siparisler/fatura?no=${o.order_no}`} style={{ color: 'var(--ac)' }}>Fatura</Link>])} empty="Fatura bekleyen yok" /></Card>
        </div>
        <Card title="Günlük özet"><Tbl min={640} cols={[['Tarih', '120px'], ['Sipariş', '80px'], ['Ciro', '110px'], ['İndirim', '100px'], ['Kargo geliri', '110px']]} rows={m.byDay.map(([d, c]) => [d, c.n, tl(c.t), tl(c.d), tl(c.s)])} empty="Veri yok" /></Card>
        <p className="hint">Fatura “kesildi” bilgisi sistemde tutulmaz; fatura sayfasından çıktı alınır. e-Arşiv entegrasyonu için Entegrasyonlar bölümüne bakın.</p>
      </div></div>
    </>
  );
}
