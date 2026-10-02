'use client';

import { useCallback, useEffect, useState } from 'react';
import { Download } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { dt } from '@/lib/admin';
import { useMenu } from '@/components/admin/Shell';
import { Empty, Loading, TopBar } from '@/components/admin/ui';

type Sub = { email: string; source: string; created_at: string; unsubscribed: boolean };
type Alert = { id: string; email: string; product_slug: string; created_at: string; notified_at: string | null };

export default function Abonelikler() {
  const menu = useMenu();
  const [subs, setSubs] = useState<Sub[] | null>(null);
  const [al, setAl] = useState<Alert[]>([]);
  const [tab, setTab] = useState<'b' | 's'>('b');
  const [err, setErr] = useState('');
  const load = useCallback(async () => {
    const a = await supabase().from('subscribers').select('*').order('created_at', { ascending: false }).limit(2000);
    const b = await supabase().from('stock_alerts').select('*').order('created_at', { ascending: false }).limit(2000);
    if (a.error) setErr(a.error.message);
    setSubs((a.data as Sub[]) ?? []);
    setAl((b.data as Alert[]) ?? []);
  }, []);
  useEffect(() => { const x = setTimeout(load, 0); return () => clearTimeout(x); }, [load]);

  function csv() {
    const rows = tab === 'b' ? [['email', 'kaynak', 'tarih'], ...(subs ?? []).filter((s) => !s.unsubscribed).map((s) => [s.email, s.source, s.created_at])] : [['email', 'ürün', 'tarih', 'haber verildi'], ...al.map((x) => [x.email, x.product_slug, x.created_at, x.notified_at ?? ''])];
    const body = rows.map((r) => r.map((c) => '"' + String(c).replace(/"/g, '""') + '"').join(',')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob(['﻿' + body], { type: 'text/csv;charset=utf-8' }));
    a.download = (tab === 'b' ? 'bulten' : 'stok-haberi') + '.csv';
    a.click();
  }

  return (
    <>
      <TopBar title="Bülten ve stok haberi" sub="Abone listesi ve “gelince haber ver” talepleri" onMenu={menu}>
        <button className="btn ghost" onClick={csv}><Download size={15} /> CSV</button>
      </TopBar>
      <div className="adm-scroll"><div className="adm-inner">
        <div className="tabs" style={{ marginBottom: 14 }}>
          <button className={`tab${tab === 'b' ? ' on' : ''}`} onClick={() => setTab('b')}>Bülten ({subs?.length ?? 0})</button>
          <button className={`tab${tab === 's' ? ' on' : ''}`} onClick={() => setTab('s')}>Stok haberi ({al.length})</button>
        </div>
        {err && <div className="alert err">{err}</div>}
        {!subs ? <Loading /> : tab === 'b' ? (
          subs.length === 0 ? <Empty title="Henüz abone yok" text="Popup veya footer formundan gelenler burada listelenir." /> :
          <section className="card"><div className="card-b" style={{ padding: 0 }}>
            {subs.map((x) => (<div key={x.email} style={{ display: 'flex', gap: 12, padding: '10px 16px', borderBottom: '1px solid var(--bdr)', fontSize: 13.5 }}><b style={{ flex: 1 }}>{x.email}</b><span style={{ color: 'var(--tx3)' }}>{x.source}</span><span style={{ color: 'var(--tx3)' }}>{dt(x.created_at)}</span>{x.unsubscribed && <span className="badge plain">ayrıldı</span>}</div>))}
          </div></section>
        ) : al.length === 0 ? <Empty title="Talep yok" /> : (
          <section className="card"><div className="card-b" style={{ padding: 0 }}>
            {al.map((x) => (<div key={x.id} style={{ display: 'flex', gap: 12, padding: '10px 16px', borderBottom: '1px solid var(--bdr)', fontSize: 13.5 }}><b style={{ flex: 1 }}>{x.email}</b><span>{x.product_slug}</span><span style={{ color: 'var(--tx3)' }}>{dt(x.created_at)}</span>{x.notified_at && <span className="badge plain b-ac">haber verildi</span>}</div>))}
          </div></section>
        )}
      </div></div>
    </>
  );
}
