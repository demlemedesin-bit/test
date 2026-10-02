'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Search, Users } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { dt, tl, type Customer } from '@/lib/admin';
import { useMenu } from '@/components/admin/Shell';
import { Empty, Kpi, Loading, TopBar } from '@/components/admin/ui';
import { UserCheck, UserRound, Banknote } from 'lucide-react';

export default function Customers() {
  const menu = useMenu();
  const [list, setList] = useState<Customer[] | null>(null);
  const [err, setErr] = useState('');
  const [q, setQ] = useState('');
  const [tab, setTab] = useState<'hepsi' | 'uye' | 'misafir'>('hepsi');

  const load = useCallback(async () => {
    const { data, error } = await supabase().rpc('admin_customers');
    if (error) return setErr('Müşteriler yüklenemedi. Sayfayı yenile.');
    setErr('');
    setList((data ?? []) as Customer[]);
  }, []);
  useEffect(() => {
    const t = setTimeout(load, 0);
    return () => clearTimeout(t);
  }, [load]);

  const shown = useMemo(() => {
    const k = q.trim().toLocaleLowerCase('tr-TR');
    return (list ?? []).filter(
      (c) => (tab === 'hepsi' || (tab === 'uye' ? c.registered : !c.registered)) && (!k || [c.name, c.email, c.phone ?? ''].some((v) => v.toLocaleLowerCase('tr-TR').includes(k))),
    );
  }, [list, q, tab]);

  const members = list?.filter((c) => c.registered).length ?? 0;
  const total = list?.reduce((n, c) => n + Number(c.spent), 0) ?? 0;

  return (
    <>
      <TopBar title="Müşteriler" sub={list ? `${list.length} kişi` : ''} onMenu={menu} />
      <div className="adm-scroll">
        <div className="adm-inner">
          {err && <div className="alert err">{err}</div>}
          {list && (
            <div className="kpis">
              <Kpi label="Toplam müşteri" value={String(list.length)} tone="ac" icon={<Users size={17} />} />
              <Kpi label="Üye" value={String(members)} sub="hesabı olanlar" tone="green" icon={<UserCheck size={17} />} />
              <Kpi label="Misafir" value={String(list.length - members)} sub="üyeliksiz sipariş verenler" tone="blue" icon={<UserRound size={17} />} />
              <Kpi label="Toplam harcama" value={tl(total)} sub="iptaller hariç" tone="amber" icon={<Banknote size={17} />} />
            </div>
          )}
          <div className="toolbar">
            <div className="search">
              <Search size={15} />
              <input className="inp" placeholder="Ad, e-posta, telefon…" value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
            <div className="tabs">
              {([['hepsi', 'Tümü'], ['uye', 'Üyeler'], ['misafir', 'Misafirler']] as const).map(([k, l]) => (
                <button key={k} className={`tab${tab === k ? ' on' : ''}`} onClick={() => setTab(k)}>{l}</button>
              ))}
            </div>
          </div>
          <div className="card">
            {!list ? (
              <Loading />
            ) : shown.length === 0 ? (
              <Empty title={list.length ? 'Eşleşen müşteri yok' : 'Henüz müşteri yok'} text="Üye olanlar ve sipariş verenler burada listelenir." icon={<Users size={30} strokeWidth={1.5} />} />
            ) : (
              <div className="tbl">
                <div className="tr hd cols-cust"><span>Müşteri</span><span>E-posta</span><span>Telefon</span><span>Sipariş</span><span>Harcama</span><span>Son sipariş</span><span /></div>
                {shown.map((c) => (
                  <div className="tr cols-cust" key={c.email}>
                    <span className="cell-clip">
                      <b className="cell-strong">{c.name || '—'}</b>{' '}
                      {c.role === 'admin' ? <span className="badge b-ac plain">Yönetici</span> : c.registered ? <span className="badge b-green plain">Üye</span> : <span className="badge b-gray plain">Misafir</span>}
                    </span>
                    <span className="cell-clip cell-muted hide-m">{c.email}</span>
                    <span className="cell-muted hide-m">{c.phone || '—'}</span>
                    <span className="num hide-m">{c.orders}</span>
                    <span className="num">{tl(Number(c.spent))}</span>
                    <span className="cell-muted hide-m">{dt(c.last_order_at)}</span>
                    <span style={{ textAlign: 'right' }}>
                      {c.orders > 0 && <Link className="link-btn" href={`/admin/siparisler?q=${encodeURIComponent(c.email)}`}>Siparişler</Link>}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
