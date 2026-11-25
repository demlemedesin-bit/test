'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Printer } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { dt, invoiceRows, tl, type AdminOrder } from '@/lib/admin';
import { PAY } from '@/components/OrderParts';
import { useMenu } from '@/components/admin/Shell';
import { Empty, Loading, TopBar } from '@/components/admin/ui';
import './fatura.css';

type Mode = 'form' | 'fatura' | 'irsaliye' | 'etiket';
type Prod = { slug: string; thumb?: string | null; colors?: { key: string; name?: string; thumb?: string; img?: string }[] | null; data?: { vat?: number } | null };
type Seller = { name: string; address: string; taxOffice: string; taxNo: string; mersis: string; phone: string; email: string };

function Doc() {
  const menu = useMenu();
  const sp = useSearchParams();
  const no = sp.get('no') ?? '';
  const nos = (sp.get('nos') ?? '').split(',').map((x) => x.trim()).filter(Boolean).slice(0, 200);
  const nosKey = nos.join(',');
  const [bulk, setBulk] = useState<AdminOrder[] | null>(null);
  const autoPrint = sp.get('print') === '1';
  const [prods, setProds] = useState<Record<string, Prod>>({});
  const [order, setOrder] = useState<AdminOrder | null | 'yok'>(null);
  const [seller, setSeller] = useState<Seller>({ name: '', address: '', taxOffice: '', taxNo: '', mersis: '', phone: '', email: '' });
  const [mode, setMode] = useState<Mode>(sp.get('mode') === 'form' ? 'form' : 'fatura');

  useEffect(() => {
    let off = false;
    (async () => {
      const [o, s, pr, ds] = await Promise.all([
        no && !nosKey ? supabase().from('orders').select('*').eq('order_no', no).maybeSingle() : Promise.resolve({ data: null }),
        supabase().from('shop_settings').select('key,value'),
        supabase().from('products').select('slug,thumb,colors,data'),
        supabase().from('shop_settings').select('key,value').eq('key', 'default_vat').maybeSingle(),
      ]);
      if (off) return;
      setProds(Object.fromEntries(((pr.data ?? []) as Prod[]).map((x) => [x.slug, x])));
      void ds;
      const m = Object.fromEntries((s.data ?? []).map((r) => [r.key as string, String(r.value ?? '').trim()]));
      setSeller({ name: m.seller_name ?? '', address: m.seller_address ?? '', taxOffice: m.seller_tax_office ?? '', taxNo: m.seller_tax_no ?? '', mersis: m.seller_mersis ?? '', phone: m.seller_phone ?? '', email: m.contact_email ?? '' });
      if (nosKey) {
        const { data } = await supabase().from('orders').select('*').in('order_no', nosKey.split(',')).order('created_at', { ascending: true });
        if (off) return;
        setBulk((data ?? []) as AdminOrder[]);
        return;
      }
      setOrder((o.data as AdminOrder | null) ?? 'yok');
    })();
    return () => {
      off = true;
    };
  }, [no, nosKey]);

  useEffect(() => {
    if (!bulk || !bulk.length || !autoPrint) return;
    const t = setTimeout(() => window.print(), 1400); // görseller yüklensin
    return () => clearTimeout(t);
  }, [bulk, autoPrint]);

  if (nosKey) {
    return (
      <>
        <TopBar title="Sipariş formları" sub={bulk ? `${bulk.length} sipariş` : ''} onMenu={menu} />
        <div className="adm-scroll">
          <div className="fatura-page">
            {bulk === null ? (
              <Loading />
            ) : bulk.length === 0 ? (
              <Empty title="Sipariş bulunamadı" text="Seçilen siparişler bulunamadı." />
            ) : (
              <>
                <div className="fatura-bar no-print">
                  <span>{bulk.length} sipariş, her biri ayrı sayfada</span>
                  <span className="grow" />
                  <button className="btn" onClick={() => window.print()}>
                    <Printer size={15} /> Yazdır
                  </button>
                </div>
                {bulk.map((o) => (
                  <div key={o.id} className="bulk-pg">
                    <OrderForm o={o} s={seller} prods={prods} />
                  </div>
                ))}
              </>
            )}
          </div>
        </div>
      </>
    );
  }

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
            <Sheet order={order} seller={seller} mode={mode} setMode={setMode} prods={prods} autoPrint={autoPrint} />
          )}
        </div>
      </div>
    </>
  );
}

function Sheet({ order: o, seller: s, mode, setMode, prods, autoPrint }: { order: AdminOrder; seller: Seller; mode: Mode; setMode: (m: Mode) => void; prods: Record<string, Prod>; autoPrint: boolean }) {
  useEffect(() => {
    if (!autoPrint || mode !== 'form') return;
    const t = setTimeout(() => window.print(), 900); // görseller yüklensin
    return () => clearTimeout(t);
  }, [autoPrint, mode]);
  const a = o.address ?? {};
  const addr = [a.address, [a.zip, a.district].filter(Boolean).join(' '), a.city].filter(Boolean).join('\n');
  const disc = Number(o.discount ?? 0);
  const sellerLines = [s.address, s.taxOffice || s.taxNo ? `V.D.: ${s.taxOffice || '—'} · V.No: ${s.taxNo || '—'}` : '', s.mersis && `Mersis: ${s.mersis}`, s.phone, s.email].filter(Boolean).join('\n');
  return (
    <>
      <div className="fatura-bar no-print">
        <div className="tabs">
          <button className={`tab${mode === 'form' ? ' on' : ''}`} onClick={() => setMode('form')}>Sipariş formu</button>
          <button className={`tab${mode === 'fatura' ? ' on' : ''}`} onClick={() => setMode('fatura')}>Fatura bilgi formu</button>
          <button className={`tab${mode === 'irsaliye' ? ' on' : ''}`} onClick={() => setMode('irsaliye')}>Sevk irsaliyesi</button>
          <button className={`tab${mode === 'etiket' ? ' on' : ''}`} onClick={() => setMode('etiket')}>Kargo etiketi (10×15)</button>
        </div>
        <span className="grow" />
        <button className="btn" onClick={() => window.print()}>
          <Printer size={15} /> Yazdır
        </button>
      </div>

      {mode === 'etiket' && (
        <article className="lbl">
          <div className="lbl-from"><small>GÖNDERİCİ</small><b>{s.name || 'Demleme'}</b><span>{[s.address, s.phone].filter(Boolean).join(' · ')}</span></div>
          <div className="lbl-to"><small>ALICI</small><b>{o.full_name}</b><span style={{ whiteSpace: 'pre-line' }}>{addr}</span><span>Tel: {o.phone}</span></div>
          <div className="lbl-row"><div><small>SİPARİŞ</small><b className="mono">{o.order_no}</b></div><div><small>KARGO</small><b>{o.tracking_carrier || '—'}</b></div><div><small>ÖDEME</small><b>{o.payment_method === 'havale' || o.payment_method === 'kapida' ? PAY[o.payment_method] ?? o.payment_method : 'Ödendi'}</b></div></div>
          {o.tracking_no && <div className="lbl-bc"><small>TAKİP NO</small><b className="mono">{o.tracking_no}</b></div>}
          <div className="lbl-items"><small>İÇERİK</small>{o.items.map((i, k) => <span key={k}>{i.qty} × {i.name}{[i.color_name, i.size].filter(Boolean).length ? ` (${[i.color_name, i.size].filter(Boolean).join(' · ')})` : ''}</span>)}</div>
        </article>
      )}
      {mode === 'form' && <OrderForm o={o} s={s} prods={prods} />}
      {mode !== 'etiket' && mode !== 'form' && <article className="sheet">
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
      </article>}
    </>
  );
}

const DEFAULT_VAT = 20;
const STATUS_TR: Record<string, string> = { odeme_bekleniyor: 'Ödeme bekleniyor', hazirlaniyor: 'Hazırlanıyor', kargoda: 'Kargoda', teslim_edildi: 'Teslim edildi', iptal: 'İptal', iade: 'İade' };

function OrderForm({ o, s, prods }: { o: AdminOrder; s: Seller; prods: Record<string, Prod> }) {
  const a = o.address ?? {};
  const addr = [a.address, [a.zip, a.district].filter(Boolean).join(' '), a.city].filter(Boolean).join('\n');
  const sub = Number(o.subtotal) || o.items.reduce((n, i) => n + Number(i.line_total), 0);
  const disc = Number(o.discount ?? 0);
  const ship = Number(o.shipping ?? 0);
  const f = sub > 0 ? Math.max(0, 1 - disc / sub) : 1; // indirimi kalemlere orantılı dağıt
  const rows = o.items.map((i) => {
    const p = i.slug ? prods[i.slug] : undefined;
    const col = p?.colors?.find((c) => c.key === i.color);
    const img = col?.thumb || col?.img || p?.thumb || '';
    const rate = p?.data?.vat != null ? Number(p.data.vat) : DEFAULT_VAT;
    const gross = Number(i.line_total);
    const net = gross * f;
    return { i, img, rate, gross, vatAmt: net - net / (1 + rate / 100), known: p?.data?.vat != null };
  });
  const byRate = new Map<number, { gross: number; tax: number }>();
  const add = (r: number, g: number) => { const c = byRate.get(r) ?? { gross: 0, tax: 0 }; c.gross += g; c.tax += g - g / (1 + r / 100); byRate.set(r, c); };
  rows.forEach((r) => add(r.rate, r.gross * f));
  if (ship > 0) add(DEFAULT_VAT, ship);
  const totalVat = [...byRate.values()].reduce((n, c) => n + c.tax, 0);
  const unknown = rows.some((r) => !r.known);
  const sellerLines = [s.address, s.taxOffice || s.taxNo ? `V.D.: ${s.taxOffice || '—'} · V.No: ${s.taxNo || '—'}` : '', s.mersis && `Mersis: ${s.mersis}`, s.phone, s.email].filter(Boolean).join('\n');
  const payLabel = PAY[o.payment_method] ?? o.payment_method;
  return (
    <article className="sheet of">
      <div className="sh-head">
        <div>
          <h2>Sipariş formu</h2>
          <div style={{ marginTop: 6 }}>
            Sipariş no: <b>{o.order_no}</b>
            <br />
            Tarih: {dt(o.created_at, true)}
            <br />
            Durum: {STATUS_TR[o.status] ?? o.status}
          </div>
        </div>
        <div className="sh-seller">
          <b>{s.name || 'Demleme'}</b>
          {sellerLines}
        </div>
      </div>

      <div className="sh-grid">
        <div className="sh-box">
          <h3>Müşteri / teslimat adresi</h3>
          <b>{o.full_name}</b>
          <div style={{ whiteSpace: 'pre-line' }}>{addr}</div>
          <div>{o.phone}</div>
          <div>{o.email}</div>
        </div>
        <div className="sh-box">
          <h3>Ödeme ve kargo</h3>
          <div>Ödeme: {payLabel}{o.paid_at ? ` · ${dt(o.paid_at, true)}` : ' · ödenmedi'}</div>
          <div>Kupon: {o.coupon_code || '—'}</div>
          <div>Kargo firması: {o.tracking_carrier || '—'}{o.tracking_no ? ` · ${o.tracking_no}` : ''}</div>
          {o.note ? <div>Not: {o.note}</div> : null}
        </div>
        {invoiceRows(o.invoice, addr.replace(/\n/g, ', ')).length > 0 && (
          <div className="sh-box" style={{ gridColumn: '1 / -1' }}>
            <h3>Fatura bilgisi</h3>
            {invoiceRows(o.invoice, addr.replace(/\n/g, ', ')).map(([k, v]) => (
              <div key={k}>
                {k}: <b>{v}</b>
              </div>
            ))}
          </div>
        )}
      </div>

      <table className="of-tbl">
        <thead>
          <tr>
            <th style={{ width: 64 }} />
            <th>Ürün</th>
            <th className="r">Adet</th>
            <th className="r">Birim (KDV dahil)</th>
            <th className="r">KDV %</th>
            <th className="r">Matrah</th>
            <th className="r">KDV tutarı</th>
            <th className="r">Tutar</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ i, img, rate, gross }, k) => {
            const v = [i.color_name, i.size].filter(Boolean).join(' · ');
            return (
              <tr key={k}>
                <td>{img ? /* eslint-disable-next-line @next/next/no-img-element */ <img src={img} alt="" className="of-img" /> : null}</td>
                <td>
                  <b>{i.name}</b>
                  {v ? <div style={{ color: '#666' }}>{v}</div> : null}
                </td>
                <td className="r">{i.qty}</td>
                <td className="r">{tl(Number(i.unit_price))}</td>
                <td className="r">%{rate}</td>
                <td className="r">{tl(gross * f / (1 + rate / 100))}</td>
                <td className="r">{tl(gross * f - gross * f / (1 + rate / 100))}</td>
                <td className="r">{tl(gross)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <div className="tot">
        <div><span>Ürünler toplamı (KDV dahil)</span><span>{tl(sub)}</span></div>
        {disc > 0 && <div><span>İndirim{o.coupon_code ? ` (${o.coupon_code})` : ''}</span><span>−{tl(disc)}</span></div>}
        <div><span><b>Mal bedeli toplamı</b></span><span><b>{tl(Math.max(0, sub - disc))}</b></span></div>
      </div>

      <table className="of-kdv of-ship">
        <thead>
          <tr><th>Kargo bedeli</th><th className="r">Oran</th><th className="r">Matrah</th><th className="r">KDV tutarı</th><th className="r">KDV dahil</th></tr>
        </thead>
        <tbody>
          <tr>
            <td>{o.tracking_carrier || 'Kargo'}</td>
            <td className="r">%{DEFAULT_VAT}</td>
            <td className="r">{tl(ship / (1 + DEFAULT_VAT / 100))}</td>
            <td className="r">{tl(ship - ship / (1 + DEFAULT_VAT / 100))}</td>
            <td className="r">{ship === 0 ? 'Ücretsiz' : tl(ship)}</td>
          </tr>
        </tbody>
      </table>

      <div className="tot">
        <div className="g"><span>Genel toplam (mal + kargo)</span><span>{tl(Number(o.total))}</span></div>
      </div>

      <table className="of-kdv">
        <thead>
          <tr><th>KDV oranı</th><th className="r">Matrah</th><th className="r">KDV tutarı</th><th className="r">KDV dahil</th></tr>
        </thead>
        <tbody>
          {[...byRate.entries()].sort((x, y) => x[0] - y[0]).map(([r, c]) => (
            <tr key={r}><td>%{r}</td><td className="r">{tl(c.gross - c.tax)}</td><td className="r">{tl(c.tax)}</td><td className="r">{tl(c.gross)}</td></tr>
          ))}
          <tr><td><b>Toplam</b></td><td className="r"><b>{tl(Number(o.total) - totalVat)}</b></td><td className="r"><b>{tl(totalVat)}</b></td><td className="r"><b>{tl(Number(o.total))}</b></td></tr>
        </tbody>
      </table>

      <p className="note">
        {disc > 0 ? 'Matrah ve KDV sütunları indirim düşüldükten sonraki tutardan hesaplanmıştır. ' : ''}Bu form resmî fatura yerine geçmez; sipariş içeriğini, uygulanan indirimi ve KDV dökümünü gösteren iç bilgi çıktısıdır.
        {unknown ? ` KDV oranı tanımlı olmayan ürünler %${DEFAULT_VAT} ile hesaplanmıştır.` : ''} Kargo ücreti %{DEFAULT_VAT} KDV ile hesaplanmıştır.
      </p>
    </article>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<Loading />}>
      <Doc />
    </Suspense>
  );
}
