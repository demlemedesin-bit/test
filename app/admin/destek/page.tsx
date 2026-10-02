'use client';

import { useCallback, useEffect, useState } from 'react';
import { Plus, Search } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { dt, tl, type AdminOrder } from '@/lib/admin';
import { RET_STATUS, type Ret } from '@/lib/analytics';
import { useMenu } from '@/components/admin/Shell';
import { Field, Loading, Panel, TopBar, useToast } from '@/components/admin/ui';
import { Card, Tabs, Tbl } from '@/components/admin/Tbl';
import { PageHero } from '@/components/admin/PageHero';

type Ticket = { id: string; email: string; name: string; order_no: string | null; category: string; subject: string; body: string; status: string; reply: string | null; created_at: string };
const CAT: Record<string, string> = { siparis: 'Sipariş durumu', kargo: 'Kargo problemi', iade: 'İade', degisim: 'Değişim', urun: 'Ürün sorusu', odeme: 'Ödeme problemi', sikayet: 'Şikayet', genel: 'Genel bilgi' };
const ST: Record<string, string> = { acik: 'Açık', beklemede: 'Beklemede', cozuldu: 'Çözüldü' };
const TABS = [['talep', 'Talepler'], ['c360', 'Customer 360']] as const;

export default function Destek() {
  const menu = useMenu();
  const { show, node } = useToast();
  const [tab, setTab] = useState<(typeof TABS)[number][0]>('talep');
  const [ts, setTs] = useState<Ticket[] | null>(null);
  const [filter, setFilter] = useState('acik');
  const [sel, setSel] = useState<Ticket | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [q, setQ] = useState('');
  const [c, setC] = useState<null | { email: string; orders: AdminOrder[]; rets: Ret[]; tickets: Ticket[]; wish: string[]; cart: { items: { name?: string; qty?: number }[]; total: number } | null }>(null);

  const load = useCallback(async () => {
    const { data } = await supabase().from('tickets').select('*').order('created_at', { ascending: false }).limit(500);
    setTs((data ?? []) as Ticket[]);
  }, []);
  useEffect(() => { const t = setTimeout(load, 0); return () => clearTimeout(t); }, [load]);

  async function saveTicket(t: Partial<Ticket> & { id?: string }) {
    const row = { email: (t.email ?? '').trim().toLowerCase(), name: t.name ?? '', order_no: t.order_no?.trim() || null, category: t.category ?? 'genel', subject: t.subject ?? '', body: t.body ?? '', status: t.status ?? 'acik', reply: t.reply ?? null, updated_at: new Date().toISOString() };
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(row.email)) return show('Geçerli e-posta gir.', true);
    const { error } = t.id ? await supabase().from('tickets').update(row).eq('id', t.id) : await supabase().from('tickets').insert(row);
    if (error) return show(error.message, true);
    setSel(null); setIsNew(false); load(); show('Kaydedildi');
  }
  async function find() {
    const email = q.trim().toLowerCase();
    if (!email) return;
    const sb = supabase();
    const [o, r, t, ac, prof] = await Promise.all([
      sb.from('orders').select('*').eq('email', email).order('created_at', { ascending: false }),
      sb.from('returns').select('*'),
      sb.from('tickets').select('*').eq('email', email).order('created_at', { ascending: false }),
      sb.from('abandoned_carts').select('*').eq('email', email).maybeSingle(),
      sb.from('orders').select('user_id').eq('email', email).not('user_id', 'is', null).limit(1),
    ]);
    const orders = (o.data ?? []) as AdminOrder[];
    const nos = new Set(orders.map((x) => x.order_no));
    const uid = (prof.data?.[0] as { user_id?: string } | undefined)?.user_id;
    const w = uid ? await sb.from('wishlists').select('product_slug').eq('user_id', uid) : { data: [] };
    setC({ email, orders, rets: ((r.data ?? []) as Ret[]).filter((x) => nos.has(x.order_no)), tickets: (t.data ?? []) as Ticket[], wish: ((w.data ?? []) as { product_slug: string }[]).map((x) => x.product_slug),
      cart: ac.data ? { items: (ac.data as { items: { name?: string; qty?: number }[] }).items, total: Number((ac.data as { total: number }).total) } : null });
  }
  if (!ts) return (<><TopBar title="Müşteri hizmetleri" onMenu={menu} /><div className="adm-scroll"><Loading /></div></>);
  const shown = ts.filter((t) => !filter || t.status === filter);

  const form = (t: Partial<Ticket>) => <TicketForm key={t.id ?? 'new'} t={t} onSave={saveTicket} />;
  return (
    <>
      <TopBar title="Müşteri hizmetleri" sub="Talepler ve müşteri geçmişi" onMenu={menu}>
        <button className="btn" onClick={() => setIsNew(true)}><Plus size={15} /> Talep ekle</button>
      </TopBar>
      <div className="adm-scroll"><div className="adm-inner"><PageHero />
        <Tabs items={TABS} value={tab} onChange={setTab} />
        {tab === 'talep' && (
          <>
            <div className="tabs" style={{ marginBottom: 12 }}>
              {[['acik', 'Açık'], ['beklemede', 'Beklemede'], ['cozuldu', 'Çözüldü'], ['', 'Tümü']].map(([k, l]) => <button key={k} className={`tab${filter === k ? ' on' : ''}`} onClick={() => setFilter(k)}>{l} ({ts.filter((t) => !k || t.status === k).length})</button>)}
            </div>
            <Card title="Destek talepleri"><Tbl min={780} cols={[['Tarih', '110px'], ['Müşteri', 'minmax(0,1fr)'], ['Sınıf', '140px'], ['Konu', 'minmax(0,1.4fr)'], ['Durum', '90px'], ['', '70px']]}
              rows={shown.map((t) => [dt(t.created_at), t.name || t.email, CAT[t.category], t.subject, ST[t.status], <button key="b" className="btn ghost" onClick={() => setSel(t)}>Aç</button>])} empty="Talep yok" /></Card>
          </>
        )}
        {tab === 'c360' && (
          <>
            <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}><input className="inp" placeholder="Müşteri e-postası" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && find()} /><button className="btn" onClick={find}><Search size={15} /> Getir</button></div>
            {c && (
              <>
                <div className="kpis">
                  {[['Toplam harcama', tl(c.orders.filter((o) => o.status !== 'iptal').reduce((n, o) => n + Number(o.total), 0))], ['Sipariş', String(c.orders.length)], ['İptal', String(c.orders.filter((o) => o.status === 'iptal').length)], ['İade', String(c.rets.length)], ['Son sipariş', c.orders[0] ? dt(c.orders[0].created_at) : '—']].map(([l, v]) => <div className="kpi" key={l}><div className="kpi-top"><span className="kpi-label">{l}</span></div><div className="kpi-val">{v}</div></div>)}
                </div>
                <Card title="Sipariş geçmişi"><Tbl min={640} cols={[['Sipariş', '100px'], ['Tarih', '110px'], ['Tutar', '100px'], ['Durum', '130px'], ['Kupon', 'minmax(0,1fr)']]} rows={c.orders.map((o) => [o.order_no, dt(o.created_at), tl(Number(o.total)), o.status, o.coupon_code ?? '—'])} empty="Sipariş yok" /></Card>
                <div className="grid2 even">
                  <Card title="İade geçmişi"><Tbl min={0} cols={[['Sipariş', '90px'], ['Ürün', 'minmax(0,1fr)'], ['Durum', '110px']]} rows={c.rets.map((r) => [r.order_no, r.product_slug, RET_STATUS[r.status]])} empty="İade yok" /></Card>
                  <Card title="Sepet ve favoriler"><div style={{ padding: 16, fontSize: 13.5 }}>
                    <p><b>Sepet:</b> {c.cart ? c.cart.items.map((i) => `${i.qty ?? 1}× ${i.name}`).join(', ') + ` (${tl(c.cart.total)})` : 'Terk edilmiş sepet yok'}</p>
                    <p><b>Favoriler:</b> {c.wish.length ? c.wish.join(', ') : 'Yok'}</p>
                    <p style={{ color: 'var(--tx3)' }}>Son görüntülenen ürünler yalnızca müşterinin tarayıcısında tutulur.</p>
                  </div></Card>
                </div>
                <Card title="Destek talepleri"><Tbl min={0} cols={[['Tarih', '110px'], ['Sınıf', '140px'], ['Konu', 'minmax(0,1fr)'], ['Durum', '90px']]} rows={c.tickets.map((t) => [dt(t.created_at), CAT[t.category], t.subject, ST[t.status]])} empty="Talep yok" /></Card>
              </>
            )}
          </>
        )}
      </div></div>
      {(sel || isNew) && <Panel title={sel ? 'Talep' : 'Yeni talep'} onClose={() => { setSel(null); setIsNew(false); }}>{form(sel ?? {})}</Panel>}
      {node}
    </>
  );
}

function TicketForm({ t, onSave }: { t: Partial<Ticket>; onSave: (t: Partial<Ticket>) => void }) {
  const [f, setF] = useState<Partial<Ticket>>({ category: 'genel', status: 'acik', ...t });
  return (
    <>
      <Field label="E-posta"><input className="inp" value={f.email ?? ''} onChange={(e) => setF({ ...f, email: e.target.value })} /></Field>
      <Field label="Ad"><input className="inp" value={f.name ?? ''} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
      <Field label="Sipariş no"><input className="inp" value={f.order_no ?? ''} onChange={(e) => setF({ ...f, order_no: e.target.value })} /></Field>
      <Field label="Sınıf"><select className="inp" value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })}>{Object.entries(CAT).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Field>
      <Field label="Konu"><input className="inp" value={f.subject ?? ''} onChange={(e) => setF({ ...f, subject: e.target.value })} /></Field>
      <Field label="Mesaj"><textarea className="inp" rows={4} value={f.body ?? ''} onChange={(e) => setF({ ...f, body: e.target.value })} /></Field>
      <Field label="Yanıt / iç not"><textarea className="inp" rows={3} value={f.reply ?? ''} onChange={(e) => setF({ ...f, reply: e.target.value })} /></Field>
      <Field label="Durum"><select className="inp" value={f.status} onChange={(e) => setF({ ...f, status: e.target.value })}>{Object.entries(ST).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Field>
      <button className="btn" onClick={() => onSave(f)}>Kaydet</button>
    </>
  );
}
