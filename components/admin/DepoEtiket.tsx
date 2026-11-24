'use client';

import { useCallback, useEffect, useState } from 'react';
import { PDFDocument } from 'pdf-lib';
import { supabase } from '@/lib/supabase';
import { dt, type AdminOrder } from '@/lib/admin';
import { Card } from './Tbl';

type Row = { order_no: string; barcode: string; created_at: string; full_name: string; status: string; items: AdminOrder['items'] };

const PRINTED_KEY = 'dm-etiket-basildi';
const A4 = { w: 595.28, h: 841.89 };
const MARGIN = 6; // pt: hücre kenar boşluğu

function readPrinted(): Record<string, number> {
  try {
    return JSON.parse(localStorage.getItem(PRINTED_KEY) || '{}') as Record<string, number>;
  } catch {
    return {};
  }
}

async function token(): Promise<string> {
  const { data } = await supabase().auth.getSession();
  return data.session?.access_token ?? '';
}

/** Depo > Etiketler: HepsiJET etiketlerini A4 kâğıda 4'lü (2×2) dizer. Yalnızca gönderisi başarıyla açılmış siparişler listelenir. */
export function DepoEtiket({ show }: { show: (t: string, e?: boolean) => void }) {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [sel, setSel] = useState<string[]>([]);
  const [start, setStart] = useState(1);
  const [printed, setPrinted] = useState<Record<string, number>>({});
  const [busy, setBusy] = useState(false);
  const [fails, setFails] = useState<{ no: string; err: string }[]>([]);

  const load = useCallback(async () => {
    const sb = supabase();
    const since = new Date(Date.now() - 7 * 86400000).toISOString();
    const { data: sh } = await sb.from('hepsijet_shipments').select('order_no,barcode,created_at').eq('status', 'olusturuldu').eq('env', 'prod').gte('created_at', since).order('created_at', { ascending: false });
    const list = (sh ?? []) as { order_no: string; barcode: string; created_at: string }[];
    if (!list.length) { setRows([]); return; }
    const { data: os } = await sb.from('orders').select('order_no,full_name,status,items').in('order_no', list.map((s) => s.order_no));
    const om = new Map((os ?? []).map((o) => [o.order_no as string, o as { full_name: string; status: string; items: AdminOrder['items'] }]));
    const out: Row[] = list
      .filter((s) => om.has(s.order_no) && om.get(s.order_no)!.status !== 'iptal')
      .map((s) => ({ ...s, full_name: om.get(s.order_no)!.full_name, status: om.get(s.order_no)!.status, items: om.get(s.order_no)!.items }));
    const p = readPrinted();
    setPrinted(p);
    setRows(out);
    setSel(out.filter((r) => !p[r.order_no]).map((r) => r.order_no));
  }, []);
  useEffect(() => { const t = setTimeout(load, 0); return () => clearTimeout(t); }, [load]);

  const toggle = (no: string) => setSel((s) => (s.includes(no) ? s.filter((x) => x !== no) : [...s, no]));

  async function build() {
    if (!rows || !sel.length) return;
    setBusy(true);
    setFails([]);
    const tk = await token();
    const w = window.open('', '_blank');
    const pdfs: PDFDocument[] = [];
    const ok: string[] = [];
    const bad: { no: string; err: string }[] = [];
    for (const no of sel) {
      try {
        const r = await fetch('/api/hepsijet', { method: 'POST', headers: { Authorization: 'Bearer ' + tk, 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'etiket', format: 'pdf', order_no: no }) });
        if (!r.ok || /json/i.test(r.headers.get('content-type') || '')) {
          const j = (await r.json().catch(() => ({}))) as { error?: string };
          bad.push({ no, err: j.error || 'Etiket alınamadı.' });
          continue;
        }
        pdfs.push(await PDFDocument.load(await r.arrayBuffer()));
        ok.push(no);
      } catch {
        bad.push({ no, err: 'Etiket okunamadı veya bağlantı hatası.' });
      }
    }
    setFails(bad);
    if (!pdfs.length) {
      w?.close();
      show('Hiçbir etiket alınamadı. Hataları listede gör.', true);
      setBusy(false);
      return;
    }
    try {
      const out = await PDFDocument.create();
      const cw = A4.w / 2;
      const ch = A4.h / 2;
      let slot = Math.max(0, Math.min(3, start - 1));
      let page = out.addPage([A4.w, A4.h]);
      for (const src of pdfs) {
        const emb = await out.embedPdf(src, src.getPageIndices());
        for (const ep of emb) {
          if (slot > 3) { page = out.addPage([A4.w, A4.h]); slot = 0; }
          const col = slot % 2;
          const rowi = Math.floor(slot / 2);
          const maxW = cw - MARGIN * 2;
          const maxH = ch - MARGIN * 2;
          const k = Math.min(maxW / ep.width, maxH / ep.height);
          const dw = ep.width * k;
          const dh = ep.height * k;
          const x = col * cw + (cw - dw) / 2;
          const y = A4.h - (rowi + 1) * ch + (ch - dh) / 2;
          page.drawPage(ep, { x, y, width: dw, height: dh });
          slot++;
        }
      }
      const bytes = await out.save();
      const url = URL.createObjectURL(new Blob([new Uint8Array(bytes)], { type: 'application/pdf' }));
      if (w) w.location.href = url; else window.location.href = url;
      const p = { ...readPrinted() };
      ok.forEach((n) => { p[n] = Date.now(); });
      try { localStorage.setItem(PRINTED_KEY, JSON.stringify(p)); } catch { /* depolama kapalı olabilir */ }
      setPrinted(p);
      setSel((s) => s.filter((n) => !ok.includes(n)));
      show(`${ok.length} etiket ${out.getPageCount()} sayfaya dizildi${bad.length ? ` · ${bad.length} etiket alınamadı` : ''}`, bad.length > 0);
    } catch {
      w?.close();
      show('PDF hazırlanamadı. Tekrar dene.', true);
    }
    setBusy(false);
  }

  const pages = Math.ceil((sel.length + (start - 1)) / 4);

  return (
    <>
      <Card title="Etiketler · A4 · 4'lü" meta="Gönderisi açılmış siparişler · son 7 gün">
        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'center', padding: 16, borderBottom: '1px solid var(--line, #e5e5e5)' }}>
          <label style={{ fontSize: 14 }}>
            Başlangıç konumu{' '}
            <select className="inp" value={start} onChange={(e) => setStart(Number(e.target.value))} style={{ width: 'auto' }}>
              <option value={1}>1 · sol üst</option>
              <option value={2}>2 · sağ üst</option>
              <option value={3}>3 · sol alt</option>
              <option value={4}>4 · sağ alt</option>
            </select>
          </label>
          <span className="cell-muted" style={{ fontSize: 13 }}>Yarım kalan sayfayı kullanmak için.</span>
          <span style={{ flex: 1 }} />
          <button className="btn ghost" onClick={() => setSel((rows ?? []).map((r) => r.order_no))} disabled={!rows?.length}>Hepsini seç</button>
          <button className="btn ghost" onClick={() => setSel([])} disabled={!sel.length}>Temizle</button>
          <button className="btn" onClick={build} disabled={busy || !sel.length}>{busy ? 'Hazırlanıyor…' : `PDF'i aç ve yazdır (${sel.length} etiket · ${pages || 0} sayfa)`}</button>
        </div>
        {fails.length > 0 && (
          <div style={{ padding: '10px 16px', background: 'rgba(194,65,12,.08)', borderBottom: '1px solid var(--line, #e5e5e5)' }}>
            <b style={{ color: '#c2410c', fontSize: 13 }}>Şu etiketler alınamadı, kâğıda girmedi:</b>
            {fails.map((f) => <div key={f.no} style={{ fontSize: 13, color: '#c2410c' }}>✗ {f.no}: {f.err}</div>)}
          </div>
        )}
        {rows === null ? <div style={{ padding: 16 }} className="cell-muted">Yükleniyor…</div> : rows.length === 0 ? <div style={{ padding: 16 }} className="cell-muted">Son 7 günde HepsiJET gönderisi açılmış sipariş yok. Önce Hazırlanacak sekmesinden gönderi aç.</div> : rows.map((r) => (
          <label key={r.order_no} style={{ display: 'grid', gridTemplateColumns: '28px minmax(0,1.2fr) minmax(0,1fr) auto', gap: 10, padding: '10px 16px', borderTop: '1px solid var(--line, #e5e5e5)', alignItems: 'center', cursor: 'pointer' }}>
            <input type="checkbox" checked={sel.includes(r.order_no)} onChange={() => toggle(r.order_no)} />
            <span><b>{r.order_no}</b> <span className="cell-muted">· {r.full_name}</span><div className="cell-muted" style={{ fontSize: 12 }}>✓ {r.barcode} · {dt(r.created_at, true)}</div></span>
            <span className="cell-muted cell-clip" style={{ fontSize: 13 }}>{r.items.map((i) => `${i.qty}× ${i.name}`).join(', ')}</span>
            <span className="cell-muted" style={{ fontSize: 12.5 }}>{printed[r.order_no] ? `Basıldı ${dt(new Date(printed[r.order_no]).toISOString(), true)}` : 'Basılmadı'}</span>
          </label>
        ))}
      </Card>
      <p className="cell-muted" style={{ fontSize: 12.5, margin: '0 4px 16px' }}>
        Etiketler HepsiJET&rsquo;in kendi PDF&rsquo;inden alınır ve A4&rsquo;e 2×2 dizilir. &ldquo;Basıldı&rdquo; bilgisi bu tarayıcıda tutulur. Açılan PDF&rsquo;i yazdırırken ölçeği &ldquo;%100 / Gerçek boyut&rdquo; seç.
      </p>
    </>
  );
}
