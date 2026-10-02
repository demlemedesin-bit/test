'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Banknote, ClipboardCopy, Download, Mail, Search, UserCheck, UserRound, Users } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { dt, tl, type Customer } from '@/lib/admin';
import { STATUS } from '@/components/OrderParts';
import { useMenu } from '@/components/admin/Shell';
import { Empty, Field, Kpi, Loading, Panel, STATUS_TONE, TopBar, useToast } from '@/components/admin/ui';

type Seg = 'vip' | 'sadik' | 'yeni' | 'pasif' | 'siparissiz' | 'standart';
type Meta = { email: string; tags: string[]; note: string };
type OrderLite = { order_no: string; created_at: string; status: string; total: number };

const SEGS: Record<Seg, { label: string; tone: string }> = {
  vip: { label: 'VIP', tone: 'b-amber' },
  sadik: { label: 'Sadık', tone: 'b-green' },
  yeni: { label: 'Yeni', tone: 'b-blue' },
  pasif: { label: 'Pasif', tone: 'b-gray' },
  siparissiz: { label: 'Üye, siparişsiz', tone: 'b-ac' },
  standart: { label: 'Standart', tone: 'b-gray' },
};
const SEG_TABS: [Seg | 'hepsi', string][] = [
  ['hepsi', 'Tümü'],
  ['vip', 'VIP'],
  ['sadik', 'Sadık'],
  ['yeni', 'Yeni'],
  ['pasif', 'Pasif'],
  ['siparissiz', 'Üye, siparişsiz'],
];
const DAY = 864e5;
const GRID = '28px minmax(0,1.5fr) minmax(0,1.3fr) 130px 70px 100px 110px';

function segmentOf(c: Customer, now: number): Seg {
  const n = Number(c.orders);
  if (n === 0) return 'siparissiz';
  if (n >= 3 || Number(c.spent) >= 3000) return 'vip';
  const last = c.last_order_at ? new Date(c.last_order_at).getTime() : 0;
  if (now - last > 90 * DAY) return 'pasif';
  if (n === 2) return 'sadik';
  if (n === 1 && now - last <= 30 * DAY) return 'yeni';
  return 'standart';
}

function exportCsv(rows: Customer[], meta: Map<string, Meta>, segOf: (c: Customer) => Seg) {
  const q = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const head = ['Ad soyad', 'E-posta', 'Telefon', 'Üyelik', 'Segment', 'Sipariş', 'Harcama', 'Son sipariş', 'Etiketler', 'Not'];
  const lines = rows.map((c) => {
    const m = meta.get(c.email.toLowerCase());
    return [c.name, c.email, c.phone, c.registered ? 'Üye' : 'Misafir', SEGS[segOf(c)].label, c.orders, c.spent, dt(c.last_order_at), (m?.tags ?? []).join(', '), m?.note ?? ''].map(q).join(';');
  });
  const blob = new Blob(['﻿' + [head.map(q).join(';'), ...lines].join('\n')], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `musteriler-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
}

function Detail({ c, seg, meta, onClose, onSaved, toast }: { c: Customer; seg: Seg; meta?: Meta; onClose: () => void; onSaved: (m: Meta) => void; toast: (t: string, e?: boolean) => void }) {
  const [tags, setTags] = useState((meta?.tags ?? []).join(', '));
  const [note, setNote] = useState(meta?.note ?? '');
  const [busy, setBusy] = useState(false);
  const [orders, setOrders] = useState<OrderLite[] | null>(null);
  const email = c.email.toLowerCase();

  useEffect(() => {
    let off = false;
    supabase()
      .from('orders')
      .select('order_no,created_at,status,total')
      .eq('email', email)
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        if (!off) setOrders((data ?? []) as OrderLite[]);
      });
    return () => {
      off = true;
    };
  }, [email]);

  async function save() {
    const list = Array.from(new Set(tags.split(',').map((t) => t.trim()).filter(Boolean)));
    setBusy(true);
    const { error } = await supabase().from('customer_meta').upsert({ email, tags: list, note: note.trim(), updated_at: new Date().toISOString() }, { onConflict: 'email' });
    setBusy(false);
    if (error) return toast('Kaydedilemedi. Tekrar dene.', true);
    toast('Etiket ve not kaydedildi');
    onSaved({ email, tags: list, note: note.trim() });
  }

  return (
    <Panel
      onClose={onClose}
      title={
        <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span>{c.name || c.email}</span>
          <span className={`badge ${SEGS[seg].tone}`}>{SEGS[seg].label}</span>
        </span>
      }
      footer={
        <>
          <a className="btn ghost" href={`mailto:${c.email}`}><Mail size={15} /> E-posta gönder</a>
          <button className="btn" disabled={busy} onClick={save}>{busy ? 'Kaydediliyor…' : 'Etiket ve notu kaydet'}</button>
        </>
      }
    >
      <dl className="kv" style={{ marginBottom: 20 }}>
        <dt>E-posta</dt><dd className="cell-clip">{c.email}</dd>
        <dt>Telefon</dt><dd>{c.phone || '—'}</dd>
        <dt>Üyelik</dt><dd>{c.role === 'admin' ? 'Yönetici' : c.registered ? `Üye · ${dt(c.joined_at)}` : 'Misafir'}</dd>
        <dt>Sipariş sayısı</dt><dd>{c.orders}</dd>
        <dt>Toplam harcama</dt><dd><b>{tl(Number(c.spent))}</b> <span className="cell-muted">(iptaller hariç)</span></dd>
        <dt>Son sipariş</dt><dd>{dt(c.last_order_at)}</dd>
      </dl>

      <div className="stack">
        <Field label="Etiketler" hint="Virgülle ayır. Örn: toptan, influencer">
          <input className="inp" value={tags} onChange={(e) => setTags(e.target.value)} placeholder="etiket1, etiket2" />
        </Field>
        <Field label="Not">
          <textarea className="inp" rows={4} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Bu müşteriyle ilgili iç not…" />
        </Field>
      </div>

      <h3 style={{ fontSize: 14, fontWeight: 700, margin: '22px 0 8px' }}>Sipariş geçmişi</h3>
      {!orders ? (
        <Loading />
      ) : orders.length === 0 ? (
        <span className="cell-muted">Bu e-postayla verilmiş sipariş yok.</span>
      ) : (
        <div className="tbl">
          {orders.map((o) => (
            <div className="tr" key={o.order_no} style={{ gridTemplateColumns: '84px minmax(0,1fr) 100px 80px', padding: '10px 0' }}>
              <Link className="link-btn mono" href={`/admin/siparisler?q=${encodeURIComponent(o.order_no)}`}>{o.order_no}</Link>
              <span className="cell-muted">{dt(o.created_at)}</span>
              <span><span className={`badge plain ${STATUS_TONE[o.status] ?? 'b-gray'}`}>{STATUS[o.status] ?? o.status}</span></span>
              <span className="num">{tl(Number(o.total))}</span>
            </div>
          ))}
        </div>
      )}
    </Panel>
  );
}

export default function Customers() {
  const menu = useMenu();
  const { show, node } = useToast();
  const [list, setList] = useState<Customer[] | null>(null);
  const [metas, setMetas] = useState<Map<string, Meta>>(new Map());
  const [now, setNow] = useState(0);
  const [err, setErr] = useState('');
  const [q, setQ] = useState('');
  const [tab, setTab] = useState<Seg | 'hepsi'>('hepsi');
  const [mem, setMem] = useState<'hepsi' | 'uye' | 'misafir'>('hepsi');
  const [open, setOpen] = useState<string | null>(null);
  const [sel, setSel] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    const sb = supabase();
    const [r, m] = await Promise.all([sb.rpc('admin_customers'), sb.from('customer_meta').select('email,tags,note')]);
    if (r.error) return setErr('Müşteriler yüklenemedi. Sayfayı yenile.');
    setErr('');
    setNow(Date.now());
    setList((r.data ?? []) as Customer[]);
    setMetas(new Map(((m.data ?? []) as Meta[]).map((x) => [x.email.toLowerCase(), x])));
  }, []);
  useEffect(() => {
    const t = setTimeout(load, 0);
    return () => clearTimeout(t);
  }, [load]);

  const segOf = useCallback((c: Customer) => segmentOf(c, now), [now]);

  const shown = useMemo(() => {
    const k = q.trim().toLocaleLowerCase('tr-TR');
    return (list ?? []).filter((c) => {
      if (tab !== 'hepsi' && segOf(c) !== tab) return false;
      if (mem !== 'hepsi' && (mem === 'uye') !== c.registered) return false;
      if (!k) return true;
      const tags = metas.get(c.email.toLowerCase())?.tags ?? [];
      return [c.name, c.email, c.phone ?? '', ...tags].some((v) => v.toLocaleLowerCase('tr-TR').includes(k));
    });
  }, [list, q, tab, mem, metas, segOf]);

  const counts = useMemo(() => {
    const m: Record<string, number> = { hepsi: list?.length ?? 0 };
    (list ?? []).forEach((c) => {
      const s = segOf(c);
      m[s] = (m[s] ?? 0) + 1;
    });
    return m;
  }, [list, segOf]);

  const members = list?.filter((c) => c.registered).length ?? 0;
  const total = list?.reduce((n, c) => n + Number(c.spent), 0) ?? 0;
  const allSel = shown.length > 0 && shown.every((c) => sel.has(c.email));
  const openC = open ? list?.find((c) => c.email === open) : undefined;

  const toggleSel = (e: string) =>
    setSel((s) => {
      const n = new Set(s);
      if (n.has(e)) n.delete(e);
      else n.add(e);
      return n;
    });
  const toggleAll = () => setSel(allSel ? new Set() : new Set(shown.map((c) => c.email)));

  async function copyEmails() {
    const mails = (list ?? []).filter((c) => sel.has(c.email)).map((c) => c.email);
    try {
      await navigator.clipboard.writeText(mails.join(', '));
      show(`${mails.length} e-posta adresi kopyalandı`);
    } catch {
      show('Panoya kopyalanamadı.', true);
    }
  }

  return (
    <>
      <TopBar title="Müşteriler" sub={list ? `${list.length} kişi` : ''} onMenu={menu}>
        <button className="btn ghost" disabled={!shown.length} onClick={() => exportCsv(shown, metas, segOf)}>
          <Download size={15} /> CSV
        </button>
      </TopBar>
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
              <input className="inp" placeholder="Ad, e-posta, telefon, etiket…" value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
            <select className="inp" style={{ width: 'auto' }} value={mem} onChange={(e) => setMem(e.target.value as typeof mem)} aria-label="Üyelik">
              <option value="hepsi">Üye ve misafir</option>
              <option value="uye">Yalnızca üyeler</option>
              <option value="misafir">Yalnızca misafirler</option>
            </select>
            {sel.size > 0 && (
              <button className="btn ghost" onClick={copyEmails}>
                <ClipboardCopy size={15} /> E-posta listesini kopyala ({sel.size})
              </button>
            )}
          </div>
          <div className="tabs" style={{ marginBottom: 14 }}>
            {SEG_TABS.map(([k, l]) => (
              <button key={k} className={`tab${tab === k ? ' on' : ''}`} onClick={() => setTab(k)}>{l} {list && <i>{counts[k] ?? 0}</i>}</button>
            ))}
          </div>
          <div className="card">
            {!list ? (
              <Loading />
            ) : shown.length === 0 ? (
              <Empty title={list.length ? 'Eşleşen müşteri yok' : 'Henüz müşteri yok'} text="Üye olanlar ve sipariş verenler burada listelenir." icon={<Users size={30} strokeWidth={1.5} />} />
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <div className="tbl">
                  <div className="tr hd" style={{ gridTemplateColumns: GRID }}>
                    <span><input type="checkbox" checked={allSel} onChange={toggleAll} aria-label="Tümünü seç" /></span>
                    <span>Müşteri</span><span>Etiketler</span><span>Segment</span><span>Sipariş</span><span>Harcama</span><span>Son sipariş</span>
                  </div>
                  {shown.map((c) => {
                    const s = segOf(c);
                    const tags = metas.get(c.email.toLowerCase())?.tags ?? [];
                    return (
                      <div className="tr click" key={c.email} style={{ gridTemplateColumns: GRID }} onClick={() => setOpen(c.email)}>
                        <span onClick={(e) => e.stopPropagation()}>
                          <input type="checkbox" checked={sel.has(c.email)} onChange={() => toggleSel(c.email)} aria-label={`${c.email} seç`} />
                        </span>
                        <span className="cell-clip">
                          <b className="cell-strong">{c.name || '—'}</b>{' '}
                          {c.role === 'admin' ? <span className="badge b-ac plain">Yönetici</span> : c.registered ? <span className="badge b-green plain">Üye</span> : <span className="badge b-gray plain">Misafir</span>}
                          <br />
                          <span className="cell-muted">{c.email}</span>
                        </span>
                        <span className="cell-clip hide-m">{tags.length ? tags.map((t) => <span key={t} className="badge b-gray plain" style={{ marginRight: 4 }}>{t}</span>) : <span className="cell-muted">—</span>}</span>
                        <span><span className={`badge plain ${SEGS[s].tone}`}>{SEGS[s].label}</span></span>
                        <span className="num hide-m">{c.orders}</span>
                        <span className="num">{tl(Number(c.spent))}</span>
                        <span className="cell-muted hide-m">{dt(c.last_order_at)}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {openC && (
        <Detail
          key={openC.email}
          c={openC}
          seg={segOf(openC)}
          meta={metas.get(openC.email.toLowerCase())}
          onClose={() => setOpen(null)}
          onSaved={(m) => setMetas((prev) => new Map(prev).set(m.email, m))}
          toast={show}
        />
      )}
      {node}
    </>
  );
}
