'use client';

import { useEffect, useState } from 'react';
import { Plus, Save, Trash2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { refreshSite } from '@/lib/admin';
import { useMenu } from '@/components/admin/Shell';
import { Field, Loading, TopBar, useToast } from '@/components/admin/ui';
import { ImageInput } from '@/components/admin/Editors';
import { PopupCard } from '@/components/Popups';
import { toIso, toLocalInput } from '@/lib/design';
import { BGS, DEVICES, FREQS, KINDS, PAGES, POPUP_TEMPLATES, TRIGGERS, emptyPopup, parsePopupsLoose, type Popup } from '@/lib/popups';

export default function PopupAdmin() {
  const menu = useMenu();
  const { show, node } = useToast();
  const [list, setList] = useState<Popup[] | null>(null);
  const [sel, setSel] = useState(0);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase().from('site_content').select('value').eq('key', 'popups').maybeSingle().then(({ data }) => setList(parsePopupsLoose(data?.value)));
  }, []);

  async function save() {
    if (!list) return;
    setBusy(true);
    const { error } = await supabase().from('site_content').upsert({ key: 'popups', value: list, updated_at: new Date().toISOString() }, { onConflict: 'key' });
    if (!error) await refreshSite();
    setBusy(false);
    show(error ? 'Kaydedilemedi: ' + error.message : 'Kaydedildi, popuplar yayında', !!error);
  }
  if (!list) return (<><TopBar title="Popuplar" onMenu={menu} /><div className="adm-scroll"><Loading /></div></>);
  const p = list[sel];
  const up = (patch: Partial<Popup>) => setList((l) => (l ?? []).map((x, i) => (i === sel ? { ...x, ...patch } : x)));
  const add = (n: Popup) => { setList((l) => [...(l ?? []), n]); setSel(list.length); };
  const sl = <T extends string>(v: T, o: { key: T; label: string }[], f: (v: T) => void) => (
    <select className="inp" value={v} onChange={(e) => f(e.target.value as T)}>{o.map((x) => <option key={x.key} value={x.key}>{x.label}</option>)}</select>
  );

  return (
    <>
      <TopBar title="Popuplar" sub="Bülten, duyuru, çıkış niyeti ve geri sayım" onMenu={menu}>
        <button className="btn" onClick={save} disabled={busy}><Save size={15} /> {busy ? 'Kaydediliyor…' : 'Kaydet'}</button>
      </TopBar>
      <div className="adm-scroll"><div className="adm-inner" style={{ maxWidth: 1100 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '240px minmax(0,1fr)', gap: 18, alignItems: 'start' }}>
          <aside className="card"><div className="card-b" style={{ padding: 10 }}>
            {list.map((x, i) => (
              <button key={x.id} type="button" onClick={() => setSel(i)} style={{ display: 'flex', width: '100%', justifyContent: 'space-between', padding: '8px 10px', borderRadius: 8, border: 0, background: i === sel ? 'var(--ac2)' : 'none', color: i === sel ? 'var(--ac)' : 'var(--tx2)', fontSize: 13, cursor: 'pointer' }}>
                <span>{x.name || 'Adsız'}</span><span className={`badge plain${x.on ? ' b-ac' : ''}`}>{x.on ? 'açık' : 'kapalı'}</span>
              </button>
            ))}
            <button className="btn ghost" style={{ width: '100%', marginTop: 8 }} onClick={() => add(emptyPopup())}><Plus size={14} /> Yeni popup</button>
            <select className="inp" style={{ marginTop: 8 }} value="" onChange={(e) => { const t = POPUP_TEMPLATES.find((x) => x.key === e.target.value); if (t) add(t.make()); }}>
              <option value="">Şablondan ekle…</option>
              {POPUP_TEMPLATES.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
            </select>
          </div></aside>
          {!p ? <div className="card"><div className="card-b">Popup yok. Soldan ekle.</div></div> : (
            <div style={{ display: 'grid', gap: 16 }}>
              <section className="card"><div className="card-h"><h2 className="card-t">İçerik</h2>
                <button className="btn ghost" onClick={() => { setList((l) => (l ?? []).filter((_, i) => i !== sel)); setSel(0); }}><Trash2 size={14} /> Sil</button></div>
                <div className="card-b">
                  <label className="chk"><input type="checkbox" checked={p.on} onChange={(e) => up({ on: e.target.checked })} /> Yayında</label>
                  <Field label="İç ad"><input className="inp" value={p.name} onChange={(e) => up({ name: e.target.value })} /></Field>
                  <Field label="Tür">{sl(p.kind, KINDS, (v) => up({ kind: v }))}</Field>
                  <Field label="Başlık"><input className="inp" value={p.title} onChange={(e) => up({ title: e.target.value })} /></Field>
                  <Field label="Metin"><textarea className="inp" rows={3} value={p.text} onChange={(e) => up({ text: e.target.value })} /></Field>
                  <Field label="Görsel"><ImageInput value={p.image} onChange={(v) => up({ image: v })} onError={(m) => show(m, true)} folder="popup" /></Field>
                  <Field label="Buton yazısı"><input className="inp" value={p.cta_label} onChange={(e) => up({ cta_label: e.target.value })} /></Field>
                  <Field label="Buton bağlantısı"><input className="inp" value={p.cta_url} onChange={(e) => up({ cta_url: e.target.value })} /></Field>
                  <Field label="Kupon kodu" hint="Bülten türünde kayıttan sonra gösterilir."><input className="inp" value={p.coupon_code} onChange={(e) => up({ coupon_code: e.target.value.toUpperCase() })} /></Field>
                  {p.kind === 'countdown' && <Field label="Geri sayım bitişi"><input className="inp" type="datetime-local" value={toLocalInput(p.countdown_to)} onChange={(e) => up({ countdown_to: toIso(e.target.value) })} /></Field>}
                  {(p.kind === 'newsletter' || p.kind === 'exit') && <Field label="Onay metni (KVKK)"><textarea className="inp" rows={2} value={p.consent_text} onChange={(e) => up({ consent_text: e.target.value })} /></Field>}
                  <Field label="Renk">{sl(p.bg, BGS, (v) => up({ bg: v }))}</Field>
                </div></section>
              <section className="card"><div className="card-h"><h2 className="card-t">Ne zaman, kime</h2></div><div className="card-b">
                <Field label="Tetikleyici">{sl(p.trigger, TRIGGERS, (v) => up({ trigger: v }))}</Field>
                {p.trigger === 'delay' && <Field label="Bekleme (sn)"><input className="inp" type="number" min={0} value={p.delay_s} onChange={(e) => up({ delay_s: Math.max(0, Number(e.target.value) || 0) })} /></Field>}
                {p.trigger === 'scroll' && <Field label="Kaydırma (%)"><input className="inp" type="number" min={1} max={100} value={p.scroll_pct} onChange={(e) => up({ scroll_pct: Math.max(1, Math.min(100, Number(e.target.value) || 1)) })} /></Field>}
                <Field label="Sayfalar">{sl(p.pages, PAGES, (v) => up({ pages: v }))}</Field>
                {p.pages === 'custom' && <Field label="Yollar (satır başına bir, ör. /urun/sehpa)"><textarea className="inp" rows={3} value={p.paths.join('\n')} onChange={(e) => up({ paths: e.target.value.split('\n').map((x) => x.trim()).filter(Boolean) })} /></Field>}
                <Field label="Cihaz">{sl(p.devices, DEVICES, (v) => up({ devices: v }))}</Field>
                <Field label="Sıklık">{sl(p.frequency, FREQS, (v) => up({ frequency: v }))}</Field>
                {p.frequency === 'days' && <Field label="Gün"><input className="inp" type="number" min={1} value={p.days} onChange={(e) => up({ days: Math.max(1, Number(e.target.value) || 1) })} /></Field>}
                <Field label="Başlangıç"><input className="inp" type="datetime-local" value={toLocalInput(p.starts_at)} onChange={(e) => up({ starts_at: toIso(e.target.value) })} /></Field>
                <Field label="Bitiş"><input className="inp" type="datetime-local" value={toLocalInput(p.ends_at)} onChange={(e) => up({ ends_at: toIso(e.target.value) })} /></Field>
                <label className="chk"><input type="checkbox" checked={p.hide_after_subscribe} onChange={(e) => up({ hide_after_subscribe: e.target.checked })} /> Abone olan ziyaretçiye bülten popup’ı gösterme</label>
              </div></section>
              <section className="card"><div className="card-h"><h2 className="card-t">Önizleme</h2></div><div className="card-b" style={{ display: 'grid', placeItems: 'center', background: 'var(--s3)', padding: 24 }}><PopupCard p={p} preview /></div></section>
            </div>
          )}
        </div>
      </div></div>
      {node}
    </>
  );
}
