'use client';

import { useCallback, useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { dt, tl, type AdminOrder } from '@/lib/admin';
import { RET_REASON, RET_STATUS, type Ret } from '@/lib/analytics';
import { useMenu } from '@/components/admin/Shell';
import { Field, Loading, Panel, TopBar, useToast } from '@/components/admin/ui';
import { Card, Tbl } from '@/components/admin/Tbl';
import { PageHero } from '@/components/admin/PageHero';

export default function Iadeler() {
  const menu = useMenu();
  const { show, node } = useToast();
  const [rows, setRows] = useState<Ret[] | null>(null);
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ order_no: '', idx: 0, qty: 1, kind: 'iade', reason: 'beden', status: 'talep', note: '' });
  const [order, setOrder] = useState<AdminOrder | null>(null);
  const load = useCallback(async () => {
    const { data } = await supabase().from('returns').select('*').order('created_at', { ascending: false }).limit(500);
    setRows(((data ?? []) as Ret[]).map((x) => ({ ...x, amount: +x.amount })));
  }, []);
  useEffect(() => { const t = setTimeout(load, 0); return () => clearTimeout(t); }, [load]);

  async function find() {
    const { data } = await supabase().from('orders').select('*').eq('order_no', f.order_no.trim().toUpperCase()).maybeSingle();
    setOrder((data as AdminOrder) ?? null);
    if (!data) show('Sipariş bulunamadı.', true);
  }
  async function add() {
    const it = order?.items[f.idx];
    if (!order || !it) return show('Önce siparişi bul ve ürünü seç.', true);
    const qty = Math.max(1, Math.min(f.qty, it.qty));
    const { error } = await supabase().from('returns').insert({ order_no: order.order_no, product_slug: it.slug ?? '', qty, amount: Number(it.unit_price) * qty, kind: f.kind, reason: f.reason, status: f.status, note: f.note || null });
    if (error) return show(error.message, true);
    setOpen(false); setOrder(null); load(); show('Kaydedildi');
  }
  async function setStatus(id: string, status: string) {
    const { error } = await supabase().from('returns').update({ status, updated_at: new Date().toISOString() }).eq('id', id);
    if (error) show(error.message, true); else load();
  }
  if (!rows) return (<><TopBar title="İade ve değişim" onMenu={menu} /><div className="adm-scroll"><Loading /></div></>);
  return (
    <>
      <TopBar title="İade ve değişim" sub="Müşteri talepleri (🛍), hasarlı ürünler, durum takibi" onMenu={menu}>
        <button className="btn" onClick={() => setOpen(true)}><Plus size={15} /> Kayıt ekle</button>
      </TopBar>
      <div className="adm-scroll"><div className="adm-inner"><PageHero />
        <Card title={`${rows.length} kayıt`}>
          <Tbl min={900} cols={[['Sipariş', '100px'], ['Ürün', 'minmax(0,1fr)'], ['Tür', '70px'], ['Adet', '50px'], ['Tutar', '90px'], ['Sebep', '140px'], ['Müşteri notu', 'minmax(0,1fr)'], ['Tarih', '100px'], ['Durum', '150px']]}
            rows={rows.map((r) => [r.order_no, r.product_slug || '—', r.kind === 'iade' ? 'İade' : 'Değişim', r.qty, tl(r.amount), RET_REASON[r.reason] ?? r.reason, <span key="n" title={r.customer_note ?? ''}>{r.source === 'musteri' ? '🛍 ' : ''}{r.late ? '⏰ 14 gün geçti · ' : ''}{r.customer_note || r.note || '—'}</span>, dt(r.created_at),
              <select key="s" className="inp" value={r.status} onChange={(e) => setStatus(r.id, e.target.value)}>{Object.entries(RET_STATUS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>])} empty="İade kaydı yok" />
        </Card>
      </div></div>
      {open && (
        <Panel title="İade / değişim kaydı" onClose={() => setOpen(false)} footer={<button className="btn" onClick={add}>Kaydet</button>}>
          <Field label="Sipariş no"><div style={{ display: 'flex', gap: 8 }}><input className="inp" value={f.order_no} onChange={(e) => setF({ ...f, order_no: e.target.value })} placeholder="DM-1001" /><button className="btn ghost" onClick={find}>Bul</button></div></Field>
          {order && (
            <>
              <Field label="Ürün"><select className="inp" value={f.idx} onChange={(e) => setF({ ...f, idx: +e.target.value })}>{order.items.map((i, k) => <option key={k} value={k}>{i.qty}× {i.name} ({tl(Number(i.unit_price))})</option>)}</select></Field>
              <Field label="Adet"><input className="inp" type="number" min={1} value={f.qty} onChange={(e) => setF({ ...f, qty: +e.target.value || 1 })} /></Field>
            </>
          )}
          <Field label="Tür"><select className="inp" value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value })}><option value="iade">İade</option><option value="degisim">Değişim</option></select></Field>
          <Field label="Sebep"><select className="inp" value={f.reason} onChange={(e) => setF({ ...f, reason: e.target.value })}>{Object.entries(RET_REASON).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Field>
          <Field label="Durum"><select className="inp" value={f.status} onChange={(e) => setF({ ...f, status: e.target.value })}>{Object.entries(RET_STATUS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Field>
          <Field label="Not"><textarea className="inp" rows={2} value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} /></Field>
        </Panel>
      )}
      {node}
    </>
  );
}
