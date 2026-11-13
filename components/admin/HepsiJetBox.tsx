'use client';

import { useCallback, useEffect, useState } from 'react';
import { FileText, Printer, RefreshCw, Truck } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Confirm, Field } from './ui';

type Ship = { order_no: string; barcode: string; env: 'test' | 'prod'; desi: number | null; parcels: number; status: string; last_status: string | null; last_checked_at: string | null };
type St = { ok: boolean; enabled: boolean; env: string; ready: boolean; missing: string[] };
type Ev = { status: string; date: string; note: string };
type Resp = { env?: string; ok?: boolean; error?: string; barcode?: string; zpl?: string[]; last?: string; events?: Ev[]; raw?: string; warn?: string };

async function tok(): Promise<string> {
  const { data } = await supabase().auth.getSession();
  return data.session?.access_token ?? '';
}

async function post(body: Record<string, unknown>): Promise<Response> {
  return fetch('/api/hepsijet', { method: 'POST', headers: { Authorization: 'Bearer ' + (await tok()), 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
}

/**
 * Siparişin HepsiJET gönderisi: oluştur (+ kargoya ver), etiket, takip, koli/desi güncelle, sil / geri çağır.
 * Kimlik bilgisi tarayıcıya gelmez; her işlem /api/hepsijet üzerinden sunucuda yapılır.
 */
export function HepsiJetBox({
  orderNo, status, payment, cancelled, onShip, onChanged, onActive, toast,
}: {
  orderNo: string;
  status: string;
  payment: string;
  cancelled: boolean;
  onShip: (barcode: string) => Promise<void>;
  onChanged: () => void;
  onActive: (active: boolean) => void;
  toast: (t: string, e?: boolean) => void;
}) {
  const [st, setSt] = useState<St | null>(null);
  const [ship, setShip] = useState<Ship | null>(null);
  const [busy, setBusy] = useState('');
  const [desi, setDesi] = useState('');
  const [parcels, setParcels] = useState('1');
  const [ask, setAsk] = useState<null | 'sil' | 'geri'>(null);
  const [trk, setTrk] = useState<Resp | null>(null);

  const load = useCallback(async () => {
    const [s, r] = await Promise.all([
      supabase().from('hepsijet_shipments').select('order_no,barcode,env,desi,parcels,status,last_status,last_checked_at').eq('order_no', orderNo).maybeSingle(),
      (async () => {
        try {
          const x = await fetch('/api/hepsijet', { headers: { Authorization: 'Bearer ' + (await tok()) }, cache: 'no-store' });
          return x.ok ? ((await x.json()) as St) : null;
        } catch {
          return null;
        }
      })(),
    ]);
    const sh = (s.data as Ship | null) ?? null;
    setShip(sh);
    setSt(r);
    if (sh && sh.status === 'olusturuldu') {
      setDesi(sh.desi == null ? '' : String(sh.desi));
      setParcels(String(sh.parcels));
    }
    onActive(!!sh && sh.status === 'olusturuldu');
  }, [orderNo, onActive]);

  useEffect(() => {
    const t = setTimeout(load, 0);
    return () => clearTimeout(t);
  }, [load, status]);

  async function run(name: string, body: Record<string, unknown>): Promise<Resp | null> {
    setBusy(name);
    try {
      const r = await post({ ...body, order_no: orderNo });
      const j = (await r.json().catch(() => ({}))) as Resp;
      if (!r.ok || !j.ok) {
        toast(j.error || 'İşlem başarısız. Tekrar dene.', true);
        return null;
      }
      return j;
    } catch {
      toast('Bağlantı hatası. Tekrar dene.', true);
      return null;
    } finally {
      setBusy('');
    }
  }

  async function create() {
    const j = await run('gonder', { action: 'gonder', desi: desi.trim() || undefined, parcels: Number(parcels) || 1 });
    if (!j || !j.barcode) return;
    if (j.warn) toast(j.warn, true);
    if (j.env === 'test') toast('Test gönderisi oluşturuldu · sipariş durumu ve müşteri bildirimi değişmedi');
    else if (status === 'hazirlaniyor') await onShip(j.barcode);
    else {
      toast('HepsiJET gönderisi oluşturuldu');
      onChanged();
    }
    load();
  }

  async function label(fmt: 'pdf' | 'zpl') {
    if (fmt === 'zpl') {
      const j = await run('zpl', { action: 'etiket', format: 'zpl' });
      if (!j?.zpl) return;
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([j.zpl.join('\n')], { type: 'text/plain' }));
      a.download = `${ship?.barcode ?? orderNo}.zpl`;
      a.click();
      URL.revokeObjectURL(a.href);
      return;
    }
    setBusy('pdf');
    const w = window.open('', '_blank');
    try {
      const r = await post({ action: 'etiket', format: 'pdf', order_no: orderNo });
      const ct = r.headers.get('content-type') || '';
      if (!r.ok || /json/i.test(ct)) {
        const j = (await r.json().catch(() => ({}))) as Resp;
        w?.close();
        toast(j.error || 'Etiket alınamadı.', true);
      } else {
        const url = URL.createObjectURL(await r.blob());
        if (w) w.location.href = url;
        else window.location.href = url;
      }
    } catch {
      w?.close();
      toast('Bağlantı hatası. Tekrar dene.', true);
    }
    setBusy('');
  }

  async function track() {
    const j = await run('takip', { action: 'takip' });
    if (j) {
      setTrk(j);
      load();
    }
  }

  async function update() {
    const j = await run('guncelle', { action: 'guncelle', parcels: Number(parcels), desi: desi.trim() });
    if (j) {
      toast('Koli ve desi HepsiJET\'te güncellendi');
      load();
    }
  }

  async function cancel(mode: 'sil' | 'geri') {
    const j = await run('iptal', { action: 'iptal', mode });
    setAsk(null);
    if (j) {
      toast(mode === 'geri' ? 'Gönderi geri çağrıldı' : 'HepsiJET gönderisi silindi');
      load();
      onChanged();
    }
  }

  if (cancelled && !ship) return null;
  if (payment === 'kapida') return null;
  if (!st?.enabled && !ship) return null;

  const active = !!ship && ship.status === 'olusturuldu';
  const canCreate = !active && !cancelled && (status === 'hazirlaniyor' || (status === 'kargoda' && !!ship));

  return (
    <div className="sec no-print">
      <p className="sec-t">
        <Truck size={13} style={{ verticalAlign: '-2px' }} /> HepsiJET
        {ship && <span className={`badge plain ${ship.env === 'test' ? 'b-amber' : 'b-green'}`} style={{ marginLeft: 8 }}>{ship.env === 'test' ? 'Test ortamı' : 'Canlı'}</span>}
      </p>

      {!active && ship && <p className="hint" style={{ marginTop: 0 }}>Önceki gönderi {ship.status === 'silindi' ? 'silindi' : 'geri çağrıldı'} ({ship.barcode}). Gerekirse yeniden oluşturabilirsin.</p>}

      {canCreate && (
        <>
          {st && !st.ready && <div className="alert err" style={{ marginBottom: 10 }}>Eksik ayar: {st.missing.join(', ')}</div>}
          <div className="row2">
            <Field label="Desi (isteğe bağlı)" hint="Boşsa ürün desisi ya da sabit desi kullanılır (1–41).">
              <input className="inp" inputMode="decimal" value={desi} onChange={(e) => setDesi(e.target.value)} placeholder="Otomatik" />
            </Field>
            <Field label="Koli sayısı" hint="Birden çok koli için HepsiJET'te K-Barkod açık olmalı.">
              <input className="inp" inputMode="numeric" value={parcels} onChange={(e) => setParcels(e.target.value.replace(/\D/g, ''))} />
            </Field>
          </div>
          <div className="actions">
            <button className="btn" disabled={!!busy || !st?.ready} onClick={create}>
              <Truck size={15} /> {busy === 'gonder' ? 'Gönderiliyor…' : status === 'hazirlaniyor' ? 'HepsiJET ile gönder ve kargoya ver' : 'HepsiJET gönderisini yeniden oluştur'}
            </button>
          </div>
        </>
      )}

      {!canCreate && !active && status === 'odeme_bekleniyor' && <p className="hint" style={{ marginTop: 0 }}>Ödeme alındıktan sonra HepsiJET ile gönderilebilir.</p>}

      {active && ship && (
        <>
          <p style={{ margin: '0 0 10px', fontSize: 13.5 }}>
            Barkod: <b className="mono">{ship.barcode}</b> · {ship.parcels} koli · {ship.desi ?? '—'} desi
            {ship.last_status && <> · Son durum: <b>{ship.last_status}</b></>}
          </p>
          <div className="actions">
            <button className="btn" disabled={!!busy} onClick={() => label('pdf')}><Printer size={15} /> {busy === 'pdf' ? 'Hazırlanıyor…' : 'Etiket (PDF)'}</button>
            <button className="btn ghost" disabled={!!busy} onClick={() => label('zpl')}><FileText size={15} /> {busy === 'zpl' ? 'Hazırlanıyor…' : 'Etiket (ZPL)'}</button>
            <button className="btn ghost" disabled={!!busy} onClick={track}><RefreshCw size={15} /> {busy === 'takip' ? 'Sorgulanıyor…' : 'Durumu sorgula'}</button>
          </div>
          <div className="row2" style={{ marginTop: 12 }}>
            <Field label="Toplam desi">
              <input className="inp" inputMode="decimal" value={desi} onChange={(e) => setDesi(e.target.value)} />
            </Field>
            <Field label="Koli sayısı">
              <input className="inp" inputMode="numeric" value={parcels} onChange={(e) => setParcels(e.target.value.replace(/\D/g, ''))} />
            </Field>
          </div>
          <div className="actions">
            <button className="btn ghost" disabled={!!busy} onClick={update}>{busy === 'guncelle' ? 'Güncelleniyor…' : 'Koli / desi güncelle'}</button>
            <button className="btn danger" disabled={!!busy} onClick={() => setAsk('sil')}>Gönderiyi sil</button>
            <button className="btn danger" disabled={!!busy} onClick={() => setAsk('geri')}>Geri çağır</button>
          </div>
          <p className="hint">Sil: kurye henüz almadıysa. Geri çağır: kurye aldı ama dağıtıma çıkmadıysa. Koli/desi yalnızca kurye almadan önce güncellenir.</p>
          {trk && (
            <div style={{ marginTop: 10, fontSize: 13 }}>
              {trk.events && trk.events.length > 0 ? (
                <ul style={{ margin: 0, paddingLeft: 18 }}>
                  {trk.events.slice(-8).reverse().map((e, i) => (<li key={i}><b>{e.status}</b>{e.date ? ' · ' + e.date : ''}{e.note ? ' · ' + e.note : ''}</li>))}
                </ul>
              ) : (
                <p className="hint" style={{ margin: 0 }}>Henüz hareket yok: paket kurye tarafından teslim alınıp okutulunca durumlar görünür.</p>
              )}
              {trk.raw && (<details style={{ marginTop: 6 }}><summary className="hint" style={{ cursor: 'pointer' }}>Ham yanıt</summary><pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all', fontSize: 11.5 }}>{trk.raw}</pre></details>)}
            </div>
          )}
        </>
      )}

      {ask && (
        <Confirm
          title={ask === 'sil' ? 'HepsiJET gönderisi silinsin mi?' : 'Gönderi geri çağrılsın mı?'}
          text={ask === 'sil' ? `${ship?.barcode} HepsiJET sisteminden silinir. Kurye paketi almışsa silinemez; o zaman geri çağırmayı dene.` : `${ship?.barcode} yoldan geri çağrılır ve deponuza döner. Dağıtıma çıkmışsa yapılamaz.`}
          confirmText={ask === 'sil' ? 'Evet, sil' : 'Evet, geri çağır'}
          busy={!!busy}
          onCancel={() => setAsk(null)}
          onConfirm={() => cancel(ask)}
        />
      )}
    </div>
  );
}
