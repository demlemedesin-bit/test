'use client';

import { useEffect, useState } from 'react';
import { Plus, Save, Trash2, ArrowUp, ArrowDown } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { refreshSite } from '@/lib/admin';
import { useMenu } from '@/components/admin/Shell';
import { Field, Loading, TopBar, useToast } from '@/components/admin/ui';
import { ImageInput } from '@/components/admin/Editors';
import { Tabs } from '@/components/admin/Tbl';
import { emptyBanner, parseBanners, parseScripts, toIso, toLocalInput, type Banner, type Scripts } from '@/lib/design';

const TABS = [['banner', 'Ana sayfa banner'], ['script', 'Özel betikler']] as const;

export default function Tasarim() {
  const menu = useMenu();
  const { show, node } = useToast();
  const [tab, setTab] = useState<(typeof TABS)[number][0]>('banner');
  const [bn, setBn] = useState<Banner[] | null>(null);
  const [sc, setSc] = useState<Scripts | null>(null);
  const [sel, setSel] = useState(0);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase().from('site_content').select('key, value').in('key', ['banners', 'scripts']).then(({ data }) => {
      const m = Object.fromEntries((data ?? []).map((r) => [r.key as string, r.value]));
      setBn(parseBanners(m.banners));
      setSc(parseScripts(m.scripts));
    });
  }, []);

  async function save() {
    if (!bn || !sc) return;
    setBusy(true);
    const now = new Date().toISOString();
    const { error } = await supabase().from('site_content').upsert([{ key: 'banners', value: bn, updated_at: now }, { key: 'scripts', value: sc, updated_at: now }], { onConflict: 'key' });
    if (!error) await refreshSite();
    setBusy(false);
    show(error ? 'Kaydedilemedi: ' + error.message : 'Kaydedildi, site güncellendi', !!error);
  }
  if (!bn || !sc) return (<><TopBar title="Tasarım" onMenu={menu} /><div className="adm-scroll"><Loading /></div></>);
  const b = bn[sel];
  const up = (p: Partial<Banner>) => setBn((l) => (l ?? []).map((x, i) => (i === sel ? { ...x, ...p } : x)));
  const mv = (d: -1 | 1) => setBn((l) => { const a = [...(l ?? [])]; const j = sel + d; if (j < 0 || j >= a.length) return a; [a[sel], a[j]] = [a[j], a[sel]]; setSel(j); return a; });

  return (
    <>
      <TopBar title="Sayfa tasarımı" sub="Banner yönetimi ve özel betikler" onMenu={menu}>
        <button className="btn" onClick={save} disabled={busy}><Save size={15} /> {busy ? 'Kaydediliyor…' : 'Kaydet'}</button>
      </TopBar>
      <div className="adm-scroll"><div className="adm-inner" style={{ maxWidth: 1000 }}>
        <Tabs items={TABS} value={tab} onChange={setTab} />
        {tab === 'banner' && (
          <div style={{ display: 'grid', gridTemplateColumns: '230px minmax(0,1fr)', gap: 18, alignItems: 'start' }}>
            <aside className="card"><div className="card-b" style={{ padding: 10 }}>
              {bn.map((x, i) => (
                <button key={x.id} type="button" onClick={() => setSel(i)} style={{ display: 'flex', width: '100%', justifyContent: 'space-between', padding: '8px 10px', borderRadius: 8, border: 0, background: i === sel ? 'var(--ac2)' : 'none', color: i === sel ? 'var(--ac)' : 'var(--tx2)', fontSize: 13, cursor: 'pointer' }}>
                  <span>{x.name || 'Adsız'}</span><span className={`badge plain${x.on ? ' b-ac' : ''}`}>{x.on ? 'açık' : 'kapalı'}</span>
                </button>
              ))}
              <button className="btn ghost" style={{ width: '100%', marginTop: 8 }} onClick={() => { setBn((l) => [...(l ?? []), emptyBanner()]); setSel(bn.length); }}><Plus size={14} /> Yeni banner</button>
            </div></aside>
            {!b ? <div className="card"><div className="card-b">Banner yok. Soldan ekle; ana sayfada hero bölümünün üstünde şerit olarak görünür (birden fazlaysa kaydırmalı).</div></div> : (
              <section className="card"><div className="card-h"><h2 className="card-t">Banner</h2>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button className="btn ghost" onClick={() => mv(-1)}><ArrowUp size={14} /></button><button className="btn ghost" onClick={() => mv(1)}><ArrowDown size={14} /></button>
                  <button className="btn ghost" onClick={() => { setBn((l) => (l ?? []).filter((_, i) => i !== sel)); setSel(0); }}><Trash2 size={14} /> Sil</button>
                </div></div>
                <div className="card-b">
                  <label className="chk"><input type="checkbox" checked={b.on} onChange={(e) => up({ on: e.target.checked })} /> Yayında</label>
                  <Field label="İç ad"><input className="inp" value={b.name} onChange={(e) => up({ name: e.target.value })} /></Field>
                  <Field label="Masaüstü görseli" hint="Önerilen 1600×500"><ImageInput value={b.image} onChange={(v) => up({ image: v })} onError={(m) => show(m, true)} folder="banner" /></Field>
                  <Field label="Mobil görseli (isteğe bağlı)" hint="Önerilen 800×800"><ImageInput value={b.mobile_image} onChange={(v) => up({ mobile_image: v })} onError={(m) => show(m, true)} folder="banner" /></Field>
                  <Field label="Başlık"><input className="inp" value={b.title} onChange={(e) => up({ title: e.target.value })} /></Field>
                  <Field label="Metin"><input className="inp" value={b.text} onChange={(e) => up({ text: e.target.value })} /></Field>
                  <Field label="Buton yazısı"><input className="inp" value={b.cta_label} onChange={(e) => up({ cta_label: e.target.value })} /></Field>
                  <Field label="Bağlantı"><input className="inp" placeholder="/urun/… veya https://…" value={b.url} onChange={(e) => up({ url: e.target.value })} /></Field>
                  <Field label="Yazı hizası"><select className="inp" value={b.align} onChange={(e) => up({ align: e.target.value as Banner['align'] })}><option value="left">Sol</option><option value="center">Orta</option><option value="right">Sağ</option></select></Field>
                  <Field label="Yayın başlangıcı"><input className="inp" type="datetime-local" value={toLocalInput(b.starts_at)} onChange={(e) => up({ starts_at: toIso(e.target.value) })} /></Field>
                  <Field label="Yayın bitişi" hint="Süre dolunca banner kendiliğinden kalkar"><input className="inp" type="datetime-local" value={toLocalInput(b.ends_at)} onChange={(e) => up({ ends_at: toIso(e.target.value) })} /></Field>
                </div></section>
            )}
          </div>
        )}
        {tab === 'script' && (
          <section className="card"><div className="card-h"><h2 className="card-t">Özel betikler</h2><span className="card-m">Canlı sohbet, ısı haritası, doğrulama vb.</span></div><div className="card-b">
            <label className="chk"><input type="checkbox" checked={sc.need_consent} onChange={(e) => setSc({ ...sc, need_consent: e.target.checked })} /> Pazarlama çerezi onayından sonra yükle (önerilir)</label>
            <Field label="Sayfa başına (head)" hint="&lt;script&gt;…&lt;/script&gt; veya &lt;meta&gt; etiketleri"><textarea className="inp" rows={7} style={{ fontFamily: 'monospace', fontSize: 12 }} value={sc.head} onChange={(e) => setSc({ ...sc, head: e.target.value })} /></Field>
            <Field label="Sayfa sonuna (body)"><textarea className="inp" rows={7} style={{ fontFamily: 'monospace', fontSize: 12 }} value={sc.body_end} onChange={(e) => setSc({ ...sc, body_end: e.target.value })} /></Field>
            <div className="alert">Yalnızca güvendiğin kaynaklardan kod ekle; betikler müşterilerin tarayıcısında tam yetkiyle çalışır.</div>
          </div></section>
        )}
      </div></div>
      {node}
    </>
  );
}
