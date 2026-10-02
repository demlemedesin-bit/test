'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Printer } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { dt, tl, type AdminOrder } from '@/lib/admin';
import { PAY } from '@/components/OrderParts';
import { useMenu } from '@/components/admin/Shell';
import { Empty, Loading, TopBar } from '@/components/admin/ui';
import './fatura.css';

type Mode = 'fatura' | 'irsaliye';
type Seller = { name: string; address: string; taxOffice: string; taxNo: string; mersis: string; phone: string; email: string };

function Doc() {
  const menu = useMenu();
  const no = useSearchParams().get('no') ?? '';
  const [order, setOrder] = useState<AdminOrder | null | 'yok'>(null);
  const [seller, setSeller] = useState<Seller>({ name: '', address: '', taxOffice: '', taxNo: '', mersis: '', phone: '', email: '' });
  const [mode, setMode] = useState<Mode>('fatura');

  useEffect(() => {
    let off = false;
    (async () => {
      const [o, s] = await Promise.all([
        no ? supabase().from('orders').select('*').eq('order_no', no).maybeSingle() : Promise.resolve({ data: null }),
        supabase().from('shop_settings').select('key,value'),
      ]);
      if (off) return;
      const m = Object.fromEntries((s.data ?? []).map((r) => [r.key as string, String(r.value ?? '').trim()]));
      setSeller({ name: m.seller_name ?? '', address: m.seller_address ?? '', taxOffice: m.seller_tax_office ?? '', taxNo: m.seller_tax_no ?? '', mersis: m.seller_mersis ?? '', phone: m.seller_phone ?? '', email: m.contact_email ?? '' });
      setOrder((o.data as AdminOrder | null) ?? 'yok');
    })();
    return () => {
      off = true;
    };
  }, [no]);

  return (
    <>
      <TopBar title="Fatura / irsaliye" sub={no} onMenu={menu} />
      <div className="adm-scroll">
        <div className="fatura-page">
          {order === null ? (
            <Loading />
          ) : order === 'yok' ? (
            <Empty title="Sipariş bulunamadı" text="Sipariş numarasını kontrol et." />
          ) : (
            <Sheet order={order} seller={seller} mode={mode} setMode={setMode} />
          )}
        </div>
      </div>
    </>
  );
}

function Sheet({ order: o, seller: s, mode, setMode }: { order: AdminOrder; seller: Seller; mode: Mode; setMode: (m: Mode) => void }) {
  const a = o.address ?? {};
  const addr = [a.address, [a.zip, a.district].filter(Boolean).join(' '), a.city].filter(Boolean).join('\n');
  const disc = Number(o.discount ?? 0);
  const sellerLines = [s.address, s.taxOffice || s.taxNo ? `V.D.: ${s.taxOffice || '—'} · V.No: ${s.taxNo || '—'}` : '', s.mersis && `Mersis: ${s.mersis}`, s.phone, s.email].filter(Boolean).join('\n');
  return (
    <>
      <div className="fatura-bar no-print">
        <div className="tabs">
          <button className={`tab${mode === 'fatura' ? ' on' : ''}`} onClick={() => setMode('fatura')}>Fatura bilgi formu</button>
          <button className={`tab${mode === 'irsaliye' ? ' on' : ''}`} onClick={() => setMode('irsaliye')}>Sevk irsaliyesi</button>
        </div>
        <span className="grow" />
        <button className="btn" onClick={() => window.print()}>
          <Printer size={15} /> Yazdır
        </button>
      </div>

      <article className="sheet">
        <div className="sh-head">
          <div>
            <h2>{mode === 'fatura' ? 'Fatura bilgi formu' : 'Sevk irsaliyesi'}</h2>
            <div style={{ marginTop: 6 }}>
              {mode === 'fatura' ? 'Belge' : 'İrsaliye'} no: <b>{o.order_no}</b>
              <br />
              Tarih: {dt(o.created_at, true)}
            </div>
          </div>
          <div className="sh-seller">
            <b>{s.name || 'Demleme'}</b>
            {sellerLines}
          </div>
        </div>

        <div className="sh-grid">
          <div className="sh-box">
            <h3>{mode === 'fatura' ? 'Fatura bilgileri (alıcı)' : 'Alıcı'}</h3>
            <b>{o.full_name}</b>
            <div style={{ whiteSpace: 'pre-line' }}>{addr}</div>
            <div>{o.phone}</div>
            <div>{o.email}</div>
          </div>
          <div className="sh-box">
            <h3>{mode === 'fatura' ? 'Sipariş' : 'Sevk bilgisi'}</h3>
            {mode === 'fatura' ? (
              <>
                <div>Ödeme: {PAY[o.payment_method] ?? o.payment_method}</div>
                {o.paid_at && <div>Ödeme tarihi: {dt(o.paid_at, true)}</div>}
                {o.coupon_code && <div>Kupon: {o.coupon_code}</div>}
              </>
            ) : (
              <>
                <div>Teslimat adresi: {[a.district, a.city].filter(Boolean).join(' / ') || '—'}</div>
                <div>Kargo: {o.tracking_carrier || '—'}</div>
                <div>Takip no: {o.tracking_no || '—'}</div>
                {o.shipped_at && <div>Sevk tarihi: {dt(o.shipped_at, true)}</div>}
              </>
            )}
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Ürün</th>
              <th className="r">Adet</th>
              {mode === 'fatura' && (
                <>
                  <th className="r">Birim fiyat</th>
                  <th className="r">Tutar</th>
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {o.items.map((i, k) => {
              const v = [i.color_name, i.size].filter(Boolean).join(' · ');
              return (
                <tr key={k}>
                  <td>
                    {i.name}
                    {v ? <span style={{ color: '#666' }}> ({v})</span> : null}
                  </td>
                  <td className="r">{i.qty}</td>
                  {mode === 'fatura' && (
                    <>
                      <td className="r">{tl(Number(i.unit_price))}</td>
                      <td className="r">{tl(Number(i.line_total))}</td>
                    </>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>

        {mode === 'fatura' ? (
          <div className="tot">
            <div><span>Ara toplam</span><span>{tl(Number(o.subtotal))}</span></div>
            <div><span>Kargo</span><span>{Number(o.shipping) === 0 ? 'Ücretsiz' : tl(Number(o.shipping))}</span></div>
            {disc > 0 && <div><span>İndirim{o.coupon_code ? ` (${o.coupon_code})` : ''}</span><span>−{tl(disc)}</span></div>}
            <div className="g"><span>Genel toplam</span><span>{tl(Number(o.total))}</span></div>
          </div>
        ) : (
          <div className="sign">
            <div>Teslim eden</div>
            <div>Teslim alan (ad soyad, imza)</div>
          </div>
        )}

        <p className="note">
          {mode === 'fatura'
            ? 'Bu form resmî e-fatura / e-arşiv fatura yerine geçmez; yalnızca sipariş bilgilerini içeren bilgi çıktısıdır.'
            : 'Bu belge resmî e-irsaliye değildir; paketle birlikte gönderilen bilgi / sevk çıktısıdır.'}
        </p>
      </article>
    </>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<Loading />}>
      <Doc />
    </Suspense>
  );
}
