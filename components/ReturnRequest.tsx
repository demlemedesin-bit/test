'use client';

import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { RET_REASON, RET_STATUS } from '@/lib/analytics';
import { dateTr, variant, type OrderRow } from './OrderParts';

type Req = { product_slug: string; qty: number; kind: string; reason: string; status: string; customer_note: string | null; created_at: string };

/** Müşteri: kargodaki / teslim edilen siparişte iade veya değişim talebi açar, sebebini yazar; mevcut taleplerin durumunu görür. */
export function ReturnRequest({ order, email }: { order: OrderRow; email: string }) {
  const [reqs, setReqs] = useState<Req[]>([]);
  const [open, setOpen] = useState(false);
  const [pick, setPick] = useState<Record<number, number>>({});
  const [kind, setKind] = useState('iade');
  const [reason, setReason] = useState('beden');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ err: boolean; t: string } | null>(null);

  const load = useCallback(async () => {
    const { data } = await supabase().rpc('get_returns', { p_order_no: order.order_no, p_email: email });
    setReqs(Array.isArray(data) ? (data as Req[]) : []);
  }, [order.order_no, email]);
  useEffect(() => { const t = setTimeout(load, 0); return () => clearTimeout(t); }, [load]);

  const can = order.status === 'kargoda' || order.status === 'teslim_edildi';
  if (!can && !reqs.length) return null;

  async function send() {
    const items = Object.entries(pick).filter(([, q]) => q > 0).map(([idx, qty]) => ({ idx: Number(idx), qty }));
    if (!items.length) return setMsg({ err: true, t: 'İade etmek istediğin ürünü seç.' });
    if (reason === 'diger' && note.trim().length < 5) return setMsg({ err: true, t: 'Lütfen sebebi kısaca yaz.' });
    setBusy(true);
    setMsg(null);
    const { data, error } = await supabase().rpc('request_return', { p_order_no: order.order_no, p_email: email, p_items: items, p_kind: kind, p_reason: reason, p_note: note });
    setBusy(false);
    const r = data as { ok?: boolean; error?: string } | null;
    if (error || !r?.ok) return setMsg({ err: true, t: r?.error ?? 'Talep gönderilemedi. Biraz sonra tekrar dene.' });
    setOpen(false);
    setPick({});
    setNote('');
    setMsg({ err: false, t: 'Talebin alındı. Ekibimiz inceleyip e-posta ile dönüş yapacak.' });
    load();
  }

  return (
    <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--line)' }}>
      {reqs.length > 0 && (
        <div style={{ marginBottom: 12 }}>
          <b>İade / değişim talepleri</b>
          <ul style={{ margin: '8px 0 0', padding: 0, listStyle: 'none', display: 'grid', gap: 6 }}>
            {reqs.map((r, k) => (
              <li key={k} className="small">
                {r.qty}× {r.product_slug || 'ürün'} · {r.kind === 'degisim' ? 'Değişim' : 'İade'} · {RET_REASON[r.reason] ?? r.reason} · <b>{RET_STATUS[r.status] ?? r.status}</b>
                <span className="muted"> · {dateTr(r.created_at)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {msg && <p className="small" role="status" style={{ color: msg.err ? '#a1161b' : 'inherit', margin: '0 0 10px' }}>{msg.t}</p>}
      {can && !open && <button type="button" className="btn" onClick={() => { setOpen(true); setMsg(null); }}>İade / değişim talebi oluştur</button>}
      {can && open && (
        <div className="form" style={{ gap: 12 }}>
          <b>Hangi ürün?</b>
          {order.items.map((i, k) => (
            <label key={k} style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <input type="checkbox" checked={(pick[k] ?? 0) > 0} onChange={(e) => setPick({ ...pick, [k]: e.target.checked ? i.qty : 0 })} />
              <span>{i.qty} × {i.name}{variant(i) ? <span className="muted"> ({variant(i)})</span> : null}</span>
              {(pick[k] ?? 0) > 0 && i.qty > 1 && (
                <select aria-label="Adet" value={pick[k]} onChange={(e) => setPick({ ...pick, [k]: Number(e.target.value) })}>
                  {Array.from({ length: i.qty }, (_, n) => n + 1).map((n) => <option key={n} value={n}>{n} adet</option>)}
                </select>
              )}
            </label>
          ))}
          <label>
            <span className="small">Talep türü</span>
            <select value={kind} onChange={(e) => setKind(e.target.value)} style={{ display: 'block', width: '100%', minHeight: 44 }}>
              <option value="iade">İade (ücret iadesi)</option>
              <option value="degisim">Değişim</option>
            </select>
          </label>
          <label>
            <span className="small">Sebep</span>
            <select value={reason} onChange={(e) => setReason(e.target.value)} style={{ display: 'block', width: '100%', minHeight: 44 }}>
              {Object.entries(RET_REASON).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </label>
          <label>
            <span className="small">Açıklama{reason === 'diger' ? '' : ' (isteğe bağlı)'}</span>
            <textarea rows={3} maxLength={600} value={note} onChange={(e) => setNote(e.target.value)} style={{ display: 'block', width: '100%' }} />
          </label>
          <div style={{ display: 'flex', gap: 10 }}>
            <button type="button" className="btn btn--solid" onClick={send} disabled={busy}>{busy ? 'Gönderiliyor…' : 'Talebi gönder'}</button>
            <button type="button" className="btn" onClick={() => setOpen(false)}>Vazgeç</button>
          </div>
        </div>
      )}
    </div>
  );
}
