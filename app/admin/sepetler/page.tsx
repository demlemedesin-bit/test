'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Bell, Download, Search, ShoppingCart, Trash2, Wallet, Mail } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { dt, tl } from '@/lib/admin';
import { useMenu } from '@/components/admin/Shell';
import { Card } from '@/components/admin/Insights';
import { Donut, HBars } from '@/components/admin/Charts';
import { Confirm, Empty, Kpi, Loading, Panel, TopBar, useToast } from '@/components/admin/ui';
import { PageHero } from '@/components/admin/PageHero';

type Item = { slug: string; name: string; qty: number; color?: string | null; size?: string | null; price: number };
type Cart = {
  email: string;
  user_id: string | null;
  items: Item[];
  total: number;
  created_at: string;
  updated_at: string;
  reminded_at: string | null;
  remind_count: number;
};

const HOUR = 36e5;
const GRID = 'minmax(0,1.5fr) minmax(0,1.4fr) 100px 130px 120px 110px';

function exportCsv(rows: Cart[]) {
  const q = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const head = ['E-posta', 'Ürünler', 'Toplam', 'Oluşturulma', 'Son güncelleme', 'Hatırlatma sayısı', 'Son hatırlatma'];
  const lines = rows.map((c) =>
    [
      c.email,
      c.items.map((i) => `${i.qty}x ${i.name}${i.color ? ' ' + i.color : ''}${i.size ? ' ' + i.size : ''}`).join(' | '),
      c.total,
      dt(c.created_at, true),
      dt(c.updated_at, true),
      c.remind_count,
      c.reminded_at ? dt(c.reminded_at, true) : '',
    ].map(q).join(';'),
  );
  const blob = new Blob(['﻿' + [head.map(q).join(';'), ...lines].join('\n')], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `terk-edilen-sepetler-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
}

export default function Carts() {
  const menu = useMenu();
  const { show, node } = useToast();
  const [list, setList] = useState<Cart[] | null>(null);
  const [now, setNow] = useState(0);
  const [err, setErr] = useState('');
  const [q, setQ] = useState('');
  const [tab, setTab] = useState<'terk' | 'aktif' | 'hepsi'>('terk');
  const [open, setOpen] = useState<Cart | null>(null);
  const [del, setDel] = useState<Cart | null>(null);
  const [busy, setBusy] = useState(false);
  const first = useRef(false);

  const load = useCallback(async () => {
    const { data, error } = await supabase().from('abandoned_carts').select('*').order('updated_at', { ascending: false });
    if (error) return setErr('Sepetler yüklenemedi. Sayfayı yenile.');
    setErr('');
    setNow(Date.now());
    const rows = (data ?? []) as Cart[];
    setList(rows);
    if (!first.current) { first.current = true; if (rows.length && !rows.some((c) => Date.now() - new Date(c.updated_at).getTime() > HOUR)) setTab('hepsi'); }
  }, []);
  useEffect(() => {
    const t = setTimeout(load, 0);
    return () => clearTimeout(t);
  }, [load]);

  const isAb = useCallback((c: Cart) => now - new Date(c.updated_at).getTime() > HOUR, [now]);

  const shown = useMemo(() => {
    const k = q.trim().toLocaleLowerCase('tr-TR');
    return (list ?? []).filter(
      (c) =>
        (tab === 'hepsi' || (tab === 'terk' ? isAb(c) : !isAb(c))) &&
        (!k || c.email.toLocaleLowerCase('tr-TR').includes(k) || c.items.some((i) => i.name.toLocaleLowerCase('tr-TR').includes(k))),
    );
  }, [list, q, tab, isAb]);

  const abandoned = (list ?? []).filter(isAb);
  const potential = abandoned.reduce((n, c) => n + Number(c.total), 0);

  async function remind(c: Cart) {
    setBusy(true);
    try {
      const { data } = await supabase().auth.getSession();
      const token = data.session?.access_token;
      if (!token) throw new Error('Oturum bulunamadı. Tekrar giriş yap.');
      const res = await fetch('/api/bildirim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ event: 'cart_reminder', email: c.email }),
      });
      const j = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string; skipped?: boolean };
      if (!res.ok || !j.ok) throw new Error(j.error || 'Hatırlatma gönderilemedi.');
      if (j.skipped) throw new Error(`E-posta gönderilmedi${j.error ? ': ' + j.error : ' (bildirim kapalı ya da e-posta servisi bağlı değil)'}. Vercel’de RESEND_API_KEY ve MAIL_FROM tanımlı olmalı.`);
      const at = new Date().toISOString();
      const { error } = await supabase().from('abandoned_carts').update({ reminded_at: at, remind_count: c.remind_count + 1 }).eq('email', c.email);
      if (error) show('Gönderildi ama kayıt güncellenemedi.', true);
      else show('Hatırlatma e-postası gönderildi');
      setOpen((o) => (o && o.email === c.email ? { ...o, reminded_at: at, remind_count: c.remind_count + 1 } : o));
      load();
    } catch (e) {
      show(e instanceof Error ? e.message : 'Hatırlatma gönderilemedi.', true);
    }
    setBusy(false);
  }

  async function remove() {
    if (!del) return;
    setBusy(true);
    const { error } = await supabase().from('abandoned_carts').delete().eq('email', del.email);
    setBusy(false);
    const gone = del.email;
    setDel(null);
    if (error) return show('Silinemedi: ' + error.message, true);
    setOpen((o) => (o && o.email === gone ? null : o));
    show('Sepet silindi');
    load();
  }

  const count = (t: 'terk' | 'aktif' | 'hepsi') => (list ?? []).filter((c) => t === 'hepsi' || (t === 'terk' ? isAb(c) : !isAb(c))).length;

  return (
    <>
      <TopBar title="Terk edilen sepetler" sub={list ? `${abandoned.length} terk edilmiş` : ''} onMenu={menu}>
        <button className="btn ghost" disabled={!shown.length} onClick={() => exportCsv(shown)}>
          <Download size={15} /> CSV
        </button>
      </TopBar>
      <div className="adm-scroll">
        <div className="adm-inner"><PageHero />
          {err && <div className="alert err">{err}</div>}
          {list && (
            <div className="kpis">
              <Kpi label="Terk edilen sepet" value={String(abandoned.length)} sub="1 saatten uzun süredir hareketsiz" tone="amber" icon={<ShoppingCart size={17} />} />
              <Kpi label="Potansiyel ciro" value={tl(potential)} sub="terk edilen sepetlerin toplamı" tone="green" icon={<Wallet size={17} />} />
              <Kpi label="Hatırlatılan" value={String(abandoned.filter((c) => c.remind_count > 0).length)} sub="en az bir kez e-posta gönderildi" tone="blue" icon={<Bell size={17} />} />
            </div>
          )}
          {list && list.length > 0 && (() => {
            const age = (c: Cart) => (now - new Date(c.updated_at).getTime()) / HOUR;
            const pm = new Map<string, number>();
            abandoned.forEach((c) => c.items.forEach((i) => pm.set(i.name, (pm.get(i.name) ?? 0) + i.qty)));
            const top = [...pm].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([label, value]) => ({ label, value }));
            return (
              <div className="grid2 even">
                <Card title="Sepet yaşı" meta={`${list.length} sepet`}>
                  <Donut size={138} center={{ big: String(abandoned.length), small: 'terk' }} segs={[
                    { label: 'Aktif (1 sa. içinde)', value: list.filter((c) => age(c) <= 1).length, color: 'var(--green)' },
                    { label: '1–24 saat', value: list.filter((c) => age(c) > 1 && age(c) <= 24).length, color: 'var(--amber)' },
                    { label: '1–3 gün', value: list.filter((c) => age(c) > 24 && age(c) <= 72).length, color: 'var(--blue)' },
                    { label: '3 günden eski', value: list.filter((c) => age(c) > 72).length, color: 'var(--red)' },
                  ]} />
                </Card>
                <Card title="Terk edilen ürünler" meta="adet">
                  {top.length ? <HBars rows={top} /> : <p className="muted">Terk edilen ürün yok.</p>}
                </Card>
              </div>
            );
          })()}
          <div className="toolbar">
            <div className="search">
              <Search size={15} />
              <input className="inp" placeholder="E-posta veya ürün ara…" value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
            <div className="tabs">
              {([['terk', 'Terk edilen'], ['aktif', 'Aktif sepet'], ['hepsi', 'Tümü']] as const).map(([k, l]) => (
                <button key={k} className={`tab${tab === k ? ' on' : ''}`} onClick={() => setTab(k)}>{l} {list && <i>{count(k)}</i>}</button>
              ))}
            </div>
          </div>
          <div className="card">
            {!list ? (
              <Loading />
            ) : shown.length === 0 ? (
              <Empty title={list.length ? 'Eşleşen sepet yok' : 'Terk edilen sepet yok'} text="Ödeme sayfasında e-postasını yazıp siparişi tamamlamayanların sepetleri burada listelenir. Sepet 1 saat işlemsiz kalırsa “terk edilen” sayılır; yeni sepetler “Aktif sepet” sekmesindedir." icon={<ShoppingCart size={30} strokeWidth={1.5} />} />
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <div className="tbl">
                  <div className="tr hd" style={{ gridTemplateColumns: GRID }}>
                    <span>Müşteri</span><span>Ürünler</span><span>Tutar</span><span>Son hareket</span><span>Hatırlatma</span><span />
                  </div>
                  {shown.map((c) => (
                    <div className="tr click" key={c.email} style={{ gridTemplateColumns: GRID }} onClick={() => setOpen(c)}>
                      <span className="cell-clip">
                        <b className="cell-strong">{c.email}</b>{' '}
                        <span className={`badge plain ${isAb(c) ? 'b-amber' : 'b-green'}`}>{isAb(c) ? 'Terk edildi' : 'Aktif sepet'}</span>
                      </span>
                      <span className="cell-clip cell-muted hide-m">{c.items.map((i) => `${i.qty}× ${i.name}`).join(', ')}</span>
                      <span className="num">{tl(Number(c.total))}</span>
                      <span className="cell-muted hide-m">{dt(c.updated_at, true)}</span>
                      <span className="cell-muted hide-m">{c.remind_count > 0 ? `${c.remind_count}× · ${dt(c.reminded_at)}` : '—'}</span>
                      <span style={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }} onClick={(e) => e.stopPropagation()}>
                        <button className="icon-btn" title="E-posta ile hatırlat" disabled={busy} onClick={() => remind(c)}><Bell size={15} /></button>
                        <button className="icon-btn" title="Sil" onClick={() => setDel(c)}><Trash2 size={15} /></button>
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {open && (
        <Panel
          title={<span style={{ fontSize: 15 }}>{open.email}</span>}
          onClose={() => setOpen(null)}
          footer={
            <>
              <button className="btn ghost" onClick={() => setDel(open)}><Trash2 size={15} /> Sil</button>
              <a className="btn ghost" href={`mailto:${open.email}`}><Mail size={15} /> E-posta yaz</a>
              <button className="btn" disabled={busy} onClick={() => remind(open)}><Bell size={15} /> {busy ? 'Gönderiliyor…' : 'Hatırlat'}</button>
            </>
          }
        >
          <dl className="kv" style={{ marginBottom: 18 }}>
            <dt>Durum</dt><dd><span className={`badge plain ${isAb(open) ? 'b-amber' : 'b-green'}`}>{isAb(open) ? 'Terk edildi' : 'Aktif sepet'}</span></dd>
            <dt>Üyelik</dt><dd>{open.user_id ? 'Üye' : 'Misafir'}</dd>
            <dt>Oluşturulma</dt><dd>{dt(open.created_at, true)}</dd>
            <dt>Son hareket</dt><dd>{dt(open.updated_at, true)}</dd>
            <dt>Hatırlatma</dt><dd>{open.remind_count > 0 ? `${open.remind_count} kez · son: ${dt(open.reminded_at, true)}` : 'Hiç gönderilmedi'}</dd>
          </dl>
          <div className="tbl">
            {open.items.map((i, k) => (
              <div className="tr" key={k} style={{ gridTemplateColumns: 'minmax(0,1fr) auto', padding: '10px 0' }}>
                <span className="cell-clip">
                  <b className="cell-strong">{i.qty} × {i.name}</b>
                  <br />
                  <span className="cell-muted">{[i.color, i.size].filter(Boolean).join(' · ') || '—'} · {tl(Number(i.price))}</span>
                </span>
                <span className="num">{tl(Number(i.price) * i.qty)}</span>
              </div>
            ))}
            <div className="tr" style={{ gridTemplateColumns: 'minmax(0,1fr) auto', padding: '12px 0' }}>
              <b>Toplam</b>
              <b className="num">{tl(Number(open.total))}</b>
            </div>
          </div>
        </Panel>
      )}

      {del && <Confirm title="Sepet silinsin mi?" text={`${del.email} adresine ait sepet kaydı silinecek.`} confirmText="Sil" onConfirm={remove} onCancel={() => setDel(null)} busy={busy} />}
      {node}
    </>
  );
}
