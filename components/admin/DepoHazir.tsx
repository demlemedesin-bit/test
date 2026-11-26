'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { dt, tl, type AdminOrder, type AdminProduct } from '@/lib/admin';
import { Card } from './Tbl';

type O = AdminOrder & { packed_at?: string | null };
type Item = O['items'][number] & { slug?: string; color?: string | null };
type Ship = { order_no: string; barcode: string; env: string; status: string };
type Res = { ok: boolean; text: string };

const keyOf = (i: Item) => i.slug || i.name;
const nickOfP = (p?: { data?: unknown } | null): string => String((p?.data as { subtitle?: unknown } | undefined)?.subtitle ?? '').trim();

async function token(): Promise<string> {
  const { data } = await supabase().auth.getSession();
  return data.session?.access_token ?? '';
}
async function hj(body: Record<string, unknown>): Promise<Response> {
  return fetch('/api/hepsijet', { method: 'POST', headers: { Authorization: 'Bearer ' + (await token()), 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
}
async function notifyShipped(orderNo: string): Promise<string> {
  try {
    const r = await fetch('/api/bildirim', { method: 'POST', headers: { Authorization: 'Bearer ' + (await token()), 'Content-Type': 'application/json' }, body: JSON.stringify({ event: 'order_shipped', order_no: orderNo }) });
    const j = (await r.json().catch(() => ({}))) as { ok?: boolean; skipped?: boolean };
    if (!r.ok || j.ok === false) return 'bildirim gönderilemedi';
    return j.skipped ? 'bildirim atlandı' : 'müşteriye e-posta gitti';
  } catch {
    return 'bildirim gönderilemedi';
  }
}

/** Depo > Hazırlanacak: ürün panosu + filtre, satırda ürün resimleri, form yazdır / HepsiJET gönder / etiket. */
export function DepoHazir({ orders, products, onChanged, show, onPack, onAddrLabel }: { orders: O[]; products: AdminProduct[]; onChanged: () => void; show: (t: string, e?: boolean) => void; onPack: (o: O) => void; onAddrLabel: (o: O) => void }) {
  const [sel, setSel] = useState<string[]>([]);
  const [peek, setPeek] = useState<O | null>(null);
  const [ask, setAsk] = useState<O | null>(null);
  const [askDesi, setAskDesi] = useState('');
  const [askParcels, setAskParcels] = useState('1');
  const [busy, setBusy] = useState('');
  const [res, setRes] = useState<Record<string, Res>>({});
  const [ships, setShips] = useState<Record<string, Ship>>({});
  const [sent, setSent] = useState<O[]>([]);

  const pmap = useMemo(() => new Map(products.map((p) => [p.slug, p])), [products]);
  const imgOf = useCallback(
    (i: Item) => {
      const p = i.slug ? pmap.get(i.slug) : undefined;
      const col = p?.colors?.find((c) => c.key === i.color);
      return col?.thumb || col?.img || p?.thumb || '';
    },
    [pmap],
  );

  const load = useCallback(async () => {
    const sb = supabase();
    const since = new Date(Date.now() - 36 * 3600 * 1000).toISOString();
    const { data: sh } = await sb.from('hepsijet_shipments').select('order_no,barcode,env,status').eq('status', 'olusturuldu').gte('created_at', since);
    const map: Record<string, Ship> = {};
    (sh ?? []).forEach((s) => { map[(s as Ship).order_no] = s as Ship; });
    setShips(map);
    const nos = Object.keys(map);
    if (nos.length) {
      const { data: o } = await sb.from('orders').select('*').in('order_no', nos).eq('status', 'kargoda').order('created_at');
      setSent((o ?? []) as O[]);
    } else setSent([]);
  }, []);
  useEffect(() => { const t = setTimeout(load, 0); return () => clearTimeout(t); }, [load, orders]);

  // Pano: ürün bazında sipariş ve adet
  const board = useMemo(() => {
    const m = new Map<string, { key: string; name: string; nick: string; img: string; orders: number; qty: number }>();
    orders.forEach((o) => {
      const seen = new Set<string>();
      (o.items as Item[]).forEach((i) => {
        const k = keyOf(i);
        const c = m.get(k) ?? { key: k, name: i.name, nick: nickOfP(i.slug ? pmap.get(i.slug) : null), img: imgOf(i), orders: 0, qty: 0 };
        c.qty += i.qty;
        if (!seen.has(k)) { c.orders += 1; seen.add(k); }
        if (!c.img) c.img = imgOf(i);
        m.set(k, c);
      });
    });
    return [...m.values()].sort((a, b) => b.qty - a.qty);
  }, [orders, imgOf, pmap]);

  const list = useMemo(() => (sel.length ? orders.filter((o) => (o.items as Item[]).some((i) => sel.includes(keyOf(i)))) : orders), [orders, sel]);
  const toggle = (k: string) => setSel((s) => (s.includes(k) ? s.filter((x) => x !== k) : [...s, k]));

  const desiOf = (o: O): number | null => {
    let t = 0;
    for (const i of o.items as Item[]) {
      const d = Number(String((pmap.get(i.slug || '')?.data as { desi?: unknown } | undefined)?.desi ?? '').replace(',', '.'));
      if (!Number.isFinite(d) || d <= 0) return null;
      t += d * i.qty;
    }
    return Math.round(t * 100) / 100;
  };

  const printForm = (o: O) => window.open(`/admin/siparisler/fatura?no=${encodeURIComponent(o.order_no)}&mode=form&print=1`, '_blank');

  async function label(o: O) {
    setBusy('l' + o.order_no);
    const w = window.open('', '_blank');
    try {
      const r = await hj({ action: 'etiket', format: 'pdf', order_no: o.order_no });
      if (!r.ok || /json/i.test(r.headers.get('content-type') || '')) {
        const j = (await r.json().catch(() => ({}))) as { error?: string };
        w?.close();
        show(j.error || 'Etiket alınamadı.', true);
      } else {
        const url = URL.createObjectURL(await r.blob());
        if (w) w.location.href = url; else window.location.href = url;
      }
    } catch {
      w?.close();
      show('Bağlantı hatası. Tekrar dene.', true);
    }
    setBusy('');
  }

  const openAsk = (o: O) => {
    const d = desiOf(o);
    setAskDesi(d != null ? String(d) : '');
    setAskParcels('1');
    setAsk(o);
  };

  // Gönderim öncesi kontrol: HepsiJET'in reddedeceği durumları baştan göster
  const phoneOk = (p: string) => {
    let d = (p || '').replace(/\D/g, '');
    if (d.startsWith('0090')) d = d.slice(4);
    else if (d.startsWith('90') && d.length === 12) d = d.slice(2);
    if (d.length === 10 && d[0] === '5') d = '0' + d;
    return /^05\d{9}$/.test(d);
  };

  async function send(o: O, desi: string, parcels: string) {
    setAsk(null);
    setBusy('s' + o.order_no);
    try {
      const r = await hj({ action: 'gonder', order_no: o.order_no, parcels: Number(parcels) || 1, desi: desi.trim() || undefined });
      const j = (await r.json().catch(() => ({}))) as { ok?: boolean; error?: string; barcode?: string; env?: string; desi?: number; warn?: string };
      if (!r.ok || !j.ok || !j.barcode) {
        setRes((m) => ({ ...m, [o.order_no]: { ok: false, text: j.error || 'HepsiJET gönderisi oluşturulamadı.' } }));
        show(`${o.order_no}: ${j.error || 'HepsiJET gönderisi oluşturulamadı.'}`, true);
      } else if (j.env === 'test') {
        setRes((m) => ({ ...m, [o.order_no]: { ok: true, text: `Test gönderisi (${j.barcode}) · sipariş değişmedi` } }));
      } else {
        const { error } = await supabase().from('orders').update({ status: 'kargoda', tracking_carrier: 'HepsiJet', tracking_no: j.barcode }).eq('id', o.id);
        if (error) {
          setRes((m) => ({ ...m, [o.order_no]: { ok: false, text: `Gönderi açıldı (${j.barcode}) ama sipariş durumu güncellenemedi. Sipariş sayfasından kontrol et.` } }));
        } else {
          const n = await notifyShipped(o.order_no);
          setRes((m) => ({ ...m, [o.order_no]: { ok: true, text: `Gönderildi · ${j.barcode}${j.desi ? ` · ${j.desi} desi` : ''} · ${n}` } }));
          show(`${o.order_no} HepsiJET'e verildi · ${n}`);
        }
      }
    } catch {
      setRes((m) => ({ ...m, [o.order_no]: { ok: false, text: 'Bağlantı hatası. Tekrar dene.' } }));
    }
    setBusy('');
    onChanged();
    load();
  }

  const Thumbs = ({ o }: { o: O }) => (
    <button type="button" onClick={() => setPeek(o)} aria-label="Ürünleri göster" style={{ display: 'flex', gap: 6, flexWrap: 'wrap', background: 'none', border: 0, padding: 0, cursor: 'pointer', textAlign: 'left' }}>
      {(o.items as Item[]).map((i, k) => (
        <span key={k} title={`${i.qty}× ${i.name}${nickOfP(i.slug ? pmap.get(i.slug) : null) ? ' (' + nickOfP(i.slug ? pmap.get(i.slug) : null) + ')' : ''}${i.color_name ? ' · ' + i.color_name : ''}`} style={{ position: 'relative', width: 44, height: 44, borderRadius: 8, overflow: 'hidden', background: 'var(--bg2, #eee)', border: '1px solid var(--line, #ddd)', display: 'inline-block', opacity: sel.length && !sel.includes(keyOf(i)) ? 0.35 : 1 }}>
          {imgOf(i) ?   <img src={imgOf(i)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <span style={{ fontSize: 10, padding: 2, display: 'block' }}>{i.name.slice(0, 10)}</span>}
          {i.qty > 1 && <b style={{ position: 'absolute', right: 0, bottom: 0, background: '#17130F', color: '#fff', fontSize: 11, padding: '0 4px', borderTopLeftRadius: 6 }}>×{i.qty}</b>}
        </span>
      ))}
    </button>
  );

  const Row = ({ o, done }: { o: O; done?: boolean }) => {
    const s = ships[o.order_no];
    const r = res[o.order_no];
    const d = desiOf(o);
    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.1fr) minmax(0,1.6fr) auto', gap: 12, padding: '12px 16px', borderTop: '1px solid var(--line, #e5e5e5)', alignItems: 'center' }}>
        <div style={{ minWidth: 0 }}>
          <b>{o.order_no}</b> <span className="cell-muted">· {dt(o.created_at, true)}</span>
          <div className="cell-clip">{o.full_name}</div>
          {s && <div className="cell-muted" style={{ fontSize: 12 }}>HepsiJET: {s.barcode}{s.env === 'test' ? ' (test)' : ''}</div>}
          {r && <div style={{ fontSize: 12.5, marginTop: 2, color: r.ok ? 'var(--green, #178a5a)' : '#c2410c', fontWeight: 600 }}>{r.ok ? '✓ ' : '✗ '}{r.text}</div>}
        </div>
        <Thumbs o={o} />
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <button className="btn ghost" onClick={() => printForm(o)}>Form yazdır</button>
          {s && <button className="btn ghost" disabled={busy === 'l' + o.order_no} onClick={() => label(o)}>Etiket</button>}
          {!done && !s && <button className="btn" disabled={busy === 's' + o.order_no} onClick={() => openAsk(o)}>{busy === 's' + o.order_no ? 'Gönderiliyor…' : 'HepsiJET gönder'}</button>}
          {!done && !s && <button className="btn ghost" onClick={() => onAddrLabel(o)}>Adres etiketi</button>}
          {!done && <button className="btn ghost" onClick={() => onPack(o)}>Paketlendi</button>}
          {!done && d != null && <span className="cell-muted" style={{ alignSelf: 'center', fontSize: 12 }}>{d} desi</span>}
        </div>
      </div>
    );
  };

  return (
    <>
      <Card title="Bugün çıkarılacaklar" meta={sel.length ? `${sel.length} ürün seçili · ${list.length} sipariş` : 'Ürüne dokun, o ürünü içeren siparişleri göster'}>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', padding: 16 }}>
          {board.length === 0 && <span className="cell-muted">Hazırlanacak ürün yok</span>}
          {board.map((b) => {
            const on = sel.includes(b.key);
            return (
              <button key={b.key} type="button" onClick={() => toggle(b.key)} aria-pressed={on} style={{ display: 'flex', gap: 10, alignItems: 'center', padding: '8px 12px 8px 8px', borderRadius: 12, cursor: 'pointer', border: on ? '2px solid #17130F' : '1px solid var(--line, #ddd)', background: on ? 'var(--bg2, #f4eee1)' : 'transparent', textAlign: 'left' }}>
                <span style={{ width: 40, height: 40, borderRadius: 8, overflow: 'hidden', background: 'var(--bg2, #eee)', flex: '0 0 auto' }}>
                  {b.img ?   <img src={b.img} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : null}
                </span>
                <span style={{ minWidth: 0 }}>
                  <b style={{ display: 'block', fontSize: 13, lineHeight: 1.25 }}>{b.name}</b>
                  {b.nick && <span style={{ display: 'block', fontSize: 12, fontStyle: 'italic', color: 'var(--ac, #6b5cf6)' }}>{b.nick}</span>}
                  <span className="cell-muted" style={{ fontSize: 12 }}>{b.orders} sipariş · {b.qty} adet</span>
                </span>
              </button>
            );
          })}
          {sel.length > 0 && <button type="button" className="btn ghost" onClick={() => setSel([])}>Seçimi temizle</button>}
        </div>
      </Card>

      <Card title="Hazırlanacak siparişler" meta="Eskiden yeniye">
        {list.length === 0 ? <div className="tr" style={{ color: 'var(--tx3)', padding: 16 }}>Hazırlanacak sipariş yok</div> : list.map((o) => <Row key={o.id} o={o} />)}
      </Card>

      {sent.length > 0 && (
        <Card title="HepsiJET'e verilenler" meta="Son 36 saat · etiketi buradan alabilirsin">
          {sent.map((o) => <Row key={o.id} o={o} done />)}
        </Card>
      )}

      {peek && (
        <div className="overlay center" style={{ zIndex: 110 }} onMouseDown={(e) => e.target === e.currentTarget && setPeek(null)}>
          <div className="dialog" role="dialog" aria-modal="true" style={{ maxWidth: 460, width: '100%' }}>
            <h3 style={{ fontSize: 16.5, fontWeight: 700, marginBottom: 10 }}>{peek.order_no} · {peek.full_name}</h3>
            <div style={{ display: 'grid', gap: 10, maxHeight: '60vh', overflowY: 'auto' }}>
              {(peek.items as Item[]).map((i, k) => (
                <div key={k} style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                  <span style={{ width: 84, height: 84, borderRadius: 10, overflow: 'hidden', background: 'var(--bg2, #eee)', flex: '0 0 auto' }}>
                    {imgOf(i) ?   <img src={imgOf(i)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : null}
                  </span>
                  <span>
                    <b>{i.name}</b>
                    {nickOfP(i.slug ? pmap.get(i.slug) : null) && <div style={{ fontSize: 13, fontStyle: 'italic', color: 'var(--ac, #6b5cf6)' }}>{nickOfP(i.slug ? pmap.get(i.slug) : null)}</div>}
                    <div className="cell-muted">{[i.color_name, i.size].filter(Boolean).join(' · ') || 'Tek seçenek'}</div>
                    <div><b>{i.qty} adet</b> <span className="cell-muted">· {tl(Number(i.line_total))}</span></div>
                  </span>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 14, textAlign: 'right' }}><button className="btn" onClick={() => setPeek(null)}>Kapat</button></div>
          </div>
        </div>
      )}

      {ask && (() => {
        const a = ask.address as unknown as { city?: string; district?: string; address?: string } | null;
        const dn = Number(askDesi.replace(',', '.'));
        const probs: string[] = [];
        if (!phoneOk(ask.phone)) probs.push('Telefon geçerli bir Türkiye cep numarası değil (05xx xxx xx xx). HepsiJET kabul etmez.');
        if (!a?.city || !a?.district) probs.push('İl/ilçe eksik.');
        if ((a?.address || '').trim().length < 5) probs.push('Açık adres eksik.');
        if (askDesi.trim() && (!Number.isFinite(dn) || dn <= 0)) probs.push('Desi geçersiz.');
        const row = (k: string, v: React.ReactNode) => (<div style={{ display: 'grid', gridTemplateColumns: '92px 1fr', gap: 8, padding: '4px 0', fontSize: 14 }}><span className="cell-muted">{k}</span><span>{v}</span></div>);
        return (
          <div className="overlay center" style={{ zIndex: 120 }} onMouseDown={(e) => e.target === e.currentTarget && setAsk(null)}>
            <div className="dialog" role="alertdialog" aria-modal="true" style={{ maxWidth: 480, width: '100%' }}>
              <h3 style={{ fontSize: 16.5, fontWeight: 700, marginBottom: 4 }}>{ask.order_no} HepsiJET&rsquo;e verilsin mi?</h3>
              <p className="cell-muted" style={{ marginBottom: 10, fontSize: 13 }}>Aşağıdaki bilgilerle HepsiJET&rsquo;te gönderi açılacak.</p>
              {row('Alıcı', ask.full_name)}
              {row('Telefon', ask.phone)}
              {row('Adres', `${a?.address || '—'}, ${a?.district || '—'} / ${a?.city || '—'}`)}
              {row('Ürünler', (ask.items as Item[]).map((i) => `${i.qty}× ${i.name}${nickOfP(i.slug ? pmap.get(i.slug) : null) ? ' (' + nickOfP(i.slug ? pmap.get(i.slug) : null) + ')' : ''}${i.color_name ? ' · ' + i.color_name : ''}`).join(', '))}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, margin: '10px 0' }}>
                <label style={{ fontSize: 13 }}>Desi
                  <input className="inp" inputMode="decimal" value={askDesi} onChange={(e) => setAskDesi(e.target.value)} placeholder="Otomatik" style={{ width: '100%' }} />
                </label>
                <label style={{ fontSize: 13 }}>Koli sayısı
                  <input className="inp" inputMode="numeric" value={askParcels} onChange={(e) => setAskParcels(e.target.value)} style={{ width: '100%' }} />
                </label>
              </div>
              {desiOf(ask) == null && !askDesi.trim() && <p style={{ fontSize: 13, color: '#c2410c' }}>Bazı ürünlerin desisi kayıtlı değil, boş bırakılırsa varsayılan desi (1) gider. Desiyi elle yazman iyi olur.</p>}
              {probs.map((t) => <p key={t} style={{ fontSize: 13, color: '#c2410c', fontWeight: 600 }}>✗ {t}</p>)}
              <p className="cell-muted" style={{ fontSize: 13, margin: '8px 0 14px' }}>Sipariş <b>Kargoda</b> olacak ve müşteriye <b>&ldquo;yola çıktı&rdquo; e-postası</b> gidecek. Bu işlem geri alınamaz.</p>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button className="btn ghost" onClick={() => setAsk(null)}>Vazgeç</button>
                <button className="btn" disabled={probs.length > 0} onClick={() => send(ask, askDesi, askParcels)}>Onaylıyorum, gönder</button>
              </div>
            </div>
          </div>
        );
      })()}
    </>
  );
}
