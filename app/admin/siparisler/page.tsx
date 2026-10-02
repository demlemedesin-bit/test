'use client';

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ChevronRight, Download, Printer, Search, ShoppingBag, Truck } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { dt, tl, type AdminOrder } from '@/lib/admin';
import { PAY, STATUS } from '@/components/OrderParts';
import { useMenu } from '@/components/admin/Shell';
import { Confirm, Empty, Field, Loading, Panel, STATUS_TONE, TopBar, useToast } from '@/components/admin/ui';

const TABS: [string, string][] = [
  ['hepsi', 'Tümü'],
  ['odeme_bekleniyor', 'Ödeme bekleyen'],
  ['hazirlaniyor', 'Hazırlanıyor'],
  ['kargoda', 'Kargoda'],
  ['teslim_edildi', 'Teslim edildi'],
  ['iptal', 'İptal'],
];
const FLOW = ['odeme_bekleniyor', 'hazirlaniyor', 'kargoda', 'teslim_edildi'];
const CARRIERS = ['Yurtiçi Kargo', 'Aras Kargo', 'MNG Kargo', 'PTT Kargo', 'Sürat Kargo', 'UPS', 'Diğer'];

function csv(rows: AdminOrder[]) {
  const q = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const head = ['Sipariş no', 'Tarih', 'Ad soyad', 'E-posta', 'Telefon', 'İl', 'İlçe', 'Adres', 'Ürünler', 'Ara toplam', 'Kargo', 'Toplam', 'Ödeme', 'Durum', 'Kargo firması', 'Takip no'];
  const lines = rows.map((o) =>
    [o.order_no, dt(o.created_at, true), o.full_name, o.email, o.phone, o.address?.city, o.address?.district, o.address?.address, o.items.map((i) => `${i.qty}x ${i.name}${i.color_name ? ' ' + i.color_name : ''}${i.size ? ' ' + i.size : ''}`).join(' | '), o.subtotal, o.shipping, o.total, PAY[o.payment_method], STATUS[o.status], o.tracking_carrier, o.tracking_no].map(q).join(';'),
  );
  const blob = new Blob(['﻿' + [head.map(q).join(';'), ...lines].join('\n')], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `siparisler-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
}

function Detail({ order, onClose, onChanged, toast }: { order: AdminOrder; onClose: () => void; onChanged: () => void; toast: (t: string, e?: boolean) => void }) {
  const [carrier, setCarrier] = useState(order.tracking_carrier ?? '');
  const [trackNo, setTrackNo] = useState(order.tracking_no ?? '');
  const [note, setNote] = useState(order.admin_note ?? '');
  const [busy, setBusy] = useState(false);
  const [ask, setAsk] = useState<null | 'iptal'>(null);

  async function save(patch: Record<string, unknown>, ok: string) {
    setBusy(true);
    const { error } = await supabase().from('orders').update(patch).eq('id', order.id);
    setBusy(false);
    setAsk(null);
    if (error) {
      toast(error.message.includes('yeniden açılamaz') ? 'İptal edilen sipariş yeniden açılamaz.' : 'Kaydedilemedi. Tekrar dene.', true);
      return;
    }
    toast(ok);
    onChanged();
  }

  const meta = { tracking_carrier: carrier.trim() || null, tracking_no: trackNo.trim() || null, admin_note: note.trim() || null };
  const idx = FLOW.indexOf(order.status);
  const a = order.address ?? {};
  const cancelled = order.status === 'iptal';

  return (
    <Panel
      onClose={onClose}
      title={
        <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span className="mono" style={{ fontSize: 16 }}>{order.order_no}</span>
          <span className={`badge ${STATUS_TONE[order.status]}`}>{STATUS[order.status]}</span>
        </span>
      }
      footer={
        <>
          <button className="btn ghost" onClick={() => window.print()}>
            <Printer size={15} /> Yazdır
          </button>
          <button className="btn" disabled={busy} onClick={() => save(meta, 'Bilgiler kaydedildi')}>
            Notu ve kargo bilgisini kaydet
          </button>
        </>
      }
    >
      {!cancelled && (
        <div className="sec no-print">
          <div className="steps">
            {FLOW.map((f, i) => (
              <div key={f} className={`step${i < idx ? ' done' : i === idx ? ' cur' : ''}`}>
                <i />
                {STATUS[f]}
              </div>
            ))}
          </div>
        </div>
      )}

      {!cancelled && (
        <div className="sec no-print">
          <p className="sec-t">İşlem</p>
          <div className="actions">
            {order.status === 'odeme_bekleniyor' && (
              <button className="btn" disabled={busy} onClick={() => save({ status: 'hazirlaniyor', ...meta }, 'Ödeme alındı olarak işaretlendi')}>
                Ödeme alındı
              </button>
            )}
            {(order.status === 'hazirlaniyor' || order.status === 'odeme_bekleniyor') && (
              <button className="btn ghost" disabled={busy} onClick={() => save({ status: 'kargoda', ...meta }, 'Kargoya verildi')}>
                <Truck size={15} /> Kargoya ver
              </button>
            )}
            {order.status === 'kargoda' && (
              <button className="btn" disabled={busy} onClick={() => save({ status: 'teslim_edildi', ...meta }, 'Teslim edildi')}>
                Teslim edildi
              </button>
            )}
            <button className="btn danger" disabled={busy} onClick={() => setAsk('iptal')}>
              Siparişi iptal et
            </button>
          </div>
        </div>
      )}

      <div className="sec">
        <p className="sec-t">Müşteri</p>
        <dl className="kv">
          <dt>Ad soyad</dt>
          <dd>{order.full_name} {order.user_id ? <span className="badge b-green plain" style={{ marginLeft: 6 }}>Üye</span> : <span className="badge b-gray plain" style={{ marginLeft: 6 }}>Misafir</span>}</dd>
          <dt>E-posta</dt>
          <dd><a href={`mailto:${order.email}`} style={{ color: 'var(--ac)' }}>{order.email}</a></dd>
          <dt>Telefon</dt>
          <dd><a href={`tel:${order.phone}`}>{order.phone}</a></dd>
          <dt>Teslimat</dt>
          <dd>
            {a.address}
            <br />
            {[a.district, a.city].filter(Boolean).join(' / ')} {a.zip}
            {a.title ? <span className="cell-muted"> · {a.title}</span> : null}
          </dd>
          <dt>Tarih</dt>
          <dd>{dt(order.created_at, true)}</dd>
          {order.paid_at && (<><dt>Ödeme</dt><dd>{dt(order.paid_at, true)}</dd></>)}
          {order.shipped_at && (<><dt>Kargolandı</dt><dd>{dt(order.shipped_at, true)}</dd></>)}
        </dl>
        {order.note && (
          <div className="alert warn" style={{ marginTop: 12, marginBottom: 0 }}>
            <b>Müşteri notu:</b> {order.note}
          </div>
        )}
      </div>

      <div className="sec">
        <p className="sec-t">Ürünler</p>
        <ul className="items">
          {order.items.map((i, k) => (
            <li key={k}>
              <span>
                {i.qty} × {i.name}
                <span className="cell-muted"> {[i.color_name, i.size].filter(Boolean).length ? `(${[i.color_name, i.size].filter(Boolean).join(' · ')})` : ''}</span>
              </span>
              <b className="num">{tl(Number(i.line_total))}</b>
            </li>
          ))}
        </ul>
        <div style={{ marginTop: 10 }}>
          <div className="sumr"><span>Ara toplam</span><span>{tl(Number(order.subtotal))}</span></div>
          <div className="sumr"><span>Kargo</span><span>{Number(order.shipping) === 0 ? 'Ücretsiz' : tl(Number(order.shipping))}</span></div>
          <div className="sumr tot"><span>Toplam · {PAY[order.payment_method]}</span><span>{tl(Number(order.total))}</span></div>
        </div>
      </div>

      <div className="sec no-print">
        <p className="sec-t">Kargo takibi</p>
        <div className="row2">
          <Field label="Kargo firması">
            <select className="inp" value={carrier} onChange={(e) => setCarrier(e.target.value)} disabled={cancelled}>
              <option value="">Seç…</option>
              {CARRIERS.map((c) => (<option key={c}>{c}</option>))}
            </select>
          </Field>
          <Field label="Takip numarası">
            <input className="inp" value={trackNo} onChange={(e) => setTrackNo(e.target.value)} disabled={cancelled} />
          </Field>
        </div>
        <Field label="Yönetici notu (müşteri görmez)">
          <textarea className="inp" value={note} onChange={(e) => setNote(e.target.value)} />
        </Field>
      </div>

      {ask === 'iptal' && (
        <Confirm
          title="Sipariş iptal edilsin mi?"
          text={`${order.order_no} iptal edilir, stoklu ürünler stoğa geri eklenir. Bu işlem geri alınamaz.`}
          confirmText="Evet, iptal et"
          busy={busy}
          onCancel={() => setAsk(null)}
          onConfirm={() => save({ status: 'iptal', ...meta }, 'Sipariş iptal edildi')}
        />
      )}
    </Panel>
  );
}

function Orders() {
  const menu = useMenu();
  const router = useRouter();
  const sp = useSearchParams();
  const [orders, setOrders] = useState<AdminOrder[] | null>(null);
  const [err, setErr] = useState('');
  const [tab, setTab] = useState(sp.get('durum') || 'hepsi');
  const [q, setQ] = useState(sp.get('q') || '');
  const [openId, setOpenId] = useState<string | null>(null);
  const { show, node } = useToast();

  const load = useCallback(async () => {
    const { data, error } = await supabase().from('orders').select('*').order('created_at', { ascending: false }).limit(1000);
    if (error) {
      setErr('Siparişler yüklenemedi. Sayfayı yenile.');
      return;
    }
    setErr('');
    setOrders((data ?? []) as AdminOrder[]);
  }, []);
  useEffect(() => {
    const t = setTimeout(load, 0);
    return () => clearTimeout(t);
  }, [load]);

  const no = sp.get('no');
  useEffect(() => {
    if (no && orders) {
      const o = orders.find((x) => x.order_no === no);
      if (o) {
        const t = setTimeout(() => setOpenId(o.id), 0);
        return () => clearTimeout(t);
      }
    }
  }, [no, orders]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { hepsi: orders?.length ?? 0 };
    (orders ?? []).forEach((o) => (c[o.status] = (c[o.status] ?? 0) + 1));
    return c;
  }, [orders]);

  const list = useMemo(() => {
    const k = q.trim().toLocaleLowerCase('tr-TR');
    return (orders ?? []).filter((o) => (tab === 'hepsi' || o.status === tab) && (!k || [o.order_no, o.full_name, o.email, o.phone].some((v) => (v ?? '').toLocaleLowerCase('tr-TR').includes(k))));
  }, [orders, tab, q]);

  const open = orders?.find((o) => o.id === openId) ?? null;
  const changed = () => {
    load();
    window.dispatchEvent(new Event('admin-orders-changed'));
  };

  return (
    <>
      <TopBar title="Siparişler" sub={orders ? `${orders.length} kayıt` : ''} onMenu={menu}>
        <button className="btn ghost sm" onClick={() => csv(list)} disabled={!list.length}>
          <Download size={14} /> CSV
        </button>
      </TopBar>
      <div className="adm-scroll">
        <div className="adm-inner">
          {err && <div className="alert err">{err}</div>}
          <div className="toolbar">
            <div className="search">
              <Search size={15} />
              <input className="inp" placeholder="Sipariş no, ad, e-posta, telefon…" value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
            <div className="tabs">
              {TABS.map(([k, l]) => (
                <button key={k} className={`tab${tab === k ? ' on' : ''}`} onClick={() => setTab(k)}>
                  {l} <i>{counts[k] ?? 0}</i>
                </button>
              ))}
            </div>
          </div>
          <div className="card">
            {!orders ? (
              <Loading />
            ) : list.length === 0 ? (
              <Empty title={orders.length ? 'Eşleşen sipariş yok' : 'Henüz sipariş yok'} text={orders.length ? 'Filtreyi ya da aramayı değiştir.' : 'Mağazadan ilk sipariş geldiğinde burada görünür.'} icon={<ShoppingBag size={30} strokeWidth={1.5} />} />
            ) : (
              <div className="tbl">
                <div className="tr hd cols-orders">
                  <span>No</span><span>Tarih</span><span>Müşteri</span><span>Ürün</span><span>Toplam</span><span>Ödeme</span><span>Durum</span><span />
                </div>
                {list.map((o) => (
                  <div key={o.id} className="tr click cols-orders" onClick={() => setOpenId(o.id)} role="button" tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && setOpenId(o.id)}>
                    <span className="mono">{o.order_no}</span>
                    <span className="cell-muted hide-m">{dt(o.created_at)}</span>
                    <span className="cell-clip"><b className="cell-strong">{o.full_name}</b><span className="cell-muted hide-m"> · {o.address?.city}</span></span>
                    <span className="cell-muted hide-m">{o.items.reduce((n, i) => n + i.qty, 0)} adet</span>
                    <span className="num">{tl(Number(o.total))}</span>
                    <span className="cell-muted hide-m">{PAY[o.payment_method]}</span>
                    <span><span className={`badge ${STATUS_TONE[o.status]}`}>{STATUS[o.status]}</span></span>
                    <ChevronRight size={16} color="var(--tx3)" className="hide-m" />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
      {open && (
        <Detail
          key={open.id + open.updated_at}
          order={open}
          toast={show}
          onChanged={changed}
          onClose={() => {
            setOpenId(null);
            if (no) router.replace('/admin/siparisler');
          }}
        />
      )}
      {node}
    </>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<Loading />}>
      <Orders />
    </Suspense>
  );
}
