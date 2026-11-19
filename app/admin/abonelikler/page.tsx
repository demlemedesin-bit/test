'use client';

import { useCallback, useEffect, useState } from 'react';
import { Download } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { dt } from '@/lib/admin';
import { useMenu } from '@/components/admin/Shell';
import { Empty, Loading, TopBar } from '@/components/admin/ui';
import { PageHero } from '@/components/admin/PageHero';

type Sub = { email: string; source: string; created_at: string; unsubscribed: boolean; consent: boolean; confirmed_at: string | null };
const ok = (s: Sub) => s.consent && !s.unsubscribed && !!s.confirmed_at;
type Alert = { id: string; email: string; product_slug: string; created_at: string; notified_at: string | null };

export default function Abonelikler() {
  const menu = useMenu();
  const [subs, setSubs] = useState<Sub[] | null>(null);
  const [al, setAl] = useState<Alert[]>([]);
  const [tab, setTab] = useState<'b' | 's' | 'g'>('b');
  const [subj, setSubj] = useState('');
  const [body, setBody] = useState('');
  const [testTo, setTestTo] = useState('');
  const [sendBusy, setSendBusy] = useState(false);
  const [sendMsg, setSendMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null);
  const [err, setErr] = useState('');
  const load = useCallback(async () => {
    const a = await supabase().from('subscribers').select('*').order('created_at', { ascending: false }).limit(2000);
    const b = await supabase().from('stock_alerts').select('*').order('created_at', { ascending: false }).limit(2000);
    if (a.error) setErr(a.error.message);
    setSubs((a.data as Sub[]) ?? []);
    setAl((b.data as Alert[]) ?? []);
  }, []);
  useEffect(() => { const x = setTimeout(load, 0); return () => clearTimeout(x); }, [load]);

  function csv() {
    const rows = tab === 'b' ? [['email', 'kaynak', 'tarih'], ...(subs ?? []).filter(ok).map((s) => [s.email, s.source, s.created_at])] : [['email', 'ürün', 'tarih', 'haber verildi'], ...al.map((x) => [x.email, x.product_slug, x.created_at, x.notified_at ?? ''])];
    const body = rows.map((r) => r.map((c) => '"' + String(c).replace(/"/g, '""') + '"').join(',')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob(['﻿' + body], { type: 'text/csv;charset=utf-8' }));
    a.download = (tab === 'b' ? 'bulten' : 'stok-haberi') + '.csv';
    a.click();
  }

  async function send(test: boolean) {
    setSendMsg(null);
    if (!subj.trim() || body.trim().length < 10) return setSendMsg({ kind: 'err', text: 'Konu ve metin gerekli.' });
    if (test && !testTo.includes('@')) return setSendMsg({ kind: 'err', text: 'Deneme için bir e-posta adresi yaz.' });
    const n = (subs ?? []).filter(ok).length;
    if (!test && (n === 0 || !confirm(n + ' kişiye ticari e-posta gönderilecek. Metni deneme olarak kendine gönderdin mi? Gönderilsin mi?'))) return;
    setSendBusy(true);
    try {
      const tok = (await supabase().auth.getSession()).data.session?.access_token ?? '';
      const key = 'k' + Date.now().toString(36);
      let sent = 0;
      let failed = 0;
      for (let i = 0; i < 100; i++) {
        const r = await fetch('/api/bulten/gonder', { method: 'POST', headers: { Authorization: 'Bearer ' + tok, 'Content-Type': 'application/json' }, body: JSON.stringify({ subject: subj, text: body, key, ...(test ? { test: testTo } : {}) }) });
        const j = (await r.json().catch(() => ({}))) as { ok?: boolean; sent?: number; failed?: number; remaining?: number; error?: string };
        if (!r.ok || !j.ok) { setSendMsg({ kind: 'err', text: j.error || 'Gönderilemedi.' }); setSendBusy(false); return; }
        sent += j.sent ?? 0; failed += j.failed ?? 0;
        setSendMsg({ kind: 'ok', text: test ? 'Deneme gönderildi.' : `Gönderiliyor… ${sent} gitti${failed ? `, ${failed} hata` : ''}` });
        if (test || !j.remaining || !(j.sent ?? 0)) break;
      }
      if (!test) { setSendMsg({ kind: failed ? 'err' : 'ok', text: `${sent} kişiye gönderildi${failed ? `, ${failed} adres gönderilemedi (Mesaj kayıtlarına bak)` : ''}.` }); load(); }
    } catch { setSendMsg({ kind: 'err', text: 'Bağlantı hatası. Tekrar dene.' }); }
    setSendBusy(false);
  }

  return (
    <>
      <TopBar title="Bülten ve stok haberi" sub="Abone listesi ve “gelince haber ver” talepleri" onMenu={menu}>
        <button className="btn ghost" onClick={csv}><Download size={15} /> CSV</button>
      </TopBar>
      <div className="adm-scroll"><div className="adm-inner"><PageHero />
        <div className="tabs" style={{ marginBottom: 14 }}>
          <button className={`tab${tab === 'b' ? ' on' : ''}`} onClick={() => setTab('b')}>Bülten ({subs?.length ?? 0})</button>
          <button className={`tab${tab === 's' ? ' on' : ''}`} onClick={() => setTab('s')}>Stok haberi ({al.length})</button>
          <button className={`tab${tab === 'g' ? ' on' : ''}`} onClick={() => setTab('g')}>Toplu e-posta</button>
        </div>
        {err && <div className="alert err">{err}</div>}
        {!subs ? <Loading /> : tab === 'g' ? (
          <section className="card"><div className="card-b" style={{ display: 'grid', gap: 12, maxWidth: 640 }}>
            <p style={{ margin: 0, fontSize: 13.5 }}>Alıcılar: ticari ileti izni verip e-postasını doğrulamış ve ayrılmamış <b>{subs.filter(ok).length}</b> kişi. Her e-postanın altına gönderici bilgisi ve “izni geri al” bağlantısı otomatik eklenir. Onay bekleyen veya ayrılan kişilere gönderilmez.</p>
            {sendMsg && <div className={`alert ${sendMsg.kind}`}>{sendMsg.text}</div>}
            <label>Konu<input className="inp" value={subj} onChange={(e) => setSubj(e.target.value)} maxLength={150} /></label>
            <label>Metin (düz yazı)<textarea className="inp" rows={10} value={body} onChange={(e) => setBody(e.target.value)} placeholder="Merhaba, bu hafta..." /></label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              <input className="inp" style={{ flex: 1, minWidth: 200 }} type="email" placeholder="Deneme için e-posta adresin" value={testTo} onChange={(e) => setTestTo(e.target.value)} />
              <button className="btn ghost" disabled={sendBusy} onClick={() => send(true)}>Deneme gönder</button>
              <button className="btn" disabled={sendBusy} onClick={() => send(false)}>{sendBusy ? 'Gönderiliyor…' : 'Herkese gönder'}</button>
            </div>
          </div></section>
        ) : tab === 'b' ? (
          subs.length === 0 ? <Empty title="Henüz abone yok" text="Popup veya footer formundan gelenler burada listelenir." /> :
          <section className="card"><div className="card-b" style={{ padding: 0 }}>
            {subs.map((x) => (<div key={x.email} style={{ display: 'flex', gap: 12, padding: '10px 16px', borderBottom: '1px solid var(--bdr)', fontSize: 13.5 }}><b style={{ flex: 1 }}>{x.email}</b><span style={{ color: 'var(--tx3)' }}>{x.source}</span><span style={{ color: 'var(--tx3)' }}>{dt(x.created_at)}</span>{x.unsubscribed ? <span className="badge plain">ayrıldı</span> : !x.confirmed_at ? <span className="badge plain">onay bekliyor</span> : <span className="badge b-green">onaylı</span>}</div>))}
          </div></section>
        ) : al.length === 0 ? <Empty title="Talep yok" /> : (
          <section className="card"><div className="card-b" style={{ padding: 0 }}>
            {al.map((x) => (<div key={x.id} style={{ display: 'flex', gap: 12, padding: '10px 16px', borderBottom: '1px solid var(--bdr)', fontSize: 13.5 }}><b style={{ flex: 1 }}>{x.email}</b><span>{x.product_slug}</span><span style={{ color: 'var(--tx3)' }}>{dt(x.created_at)}</span>{x.notified_at && <span className="badge plain b-ac">haber verildi</span>}</div>))}
          </div></section>
        )}
      </div></div>
    </>
  );
}
