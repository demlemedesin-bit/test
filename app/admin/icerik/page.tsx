'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Save } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { refreshSite } from '@/lib/admin';
import { useMenu } from '@/components/admin/Shell';
import { Field, Loading, TopBar, useToast } from '@/components/admin/ui';
import { AddBtn, ImageInput, ResetBtn, RowTools, moved, setAt, without } from '@/components/admin/Editors';
import {
  DEFAULT_DM,
  DEFAULT_FAQ,
  DEFAULT_FOOTER,
  DEFAULT_GUESTS,
  DRAWINGS,
  FIELDS,
  REEL_COVERS,
  type Demleyen,
  type Faq,
  type FooterData,
  type Guest,
} from '@/lib/siteDefaults';

import './icerik.css';
import { PageHero } from '@/components/admin/PageHero';
const TABS = ['Metin ve görseller', 'Sıkça sorulan sorular', 'Konuklar', 'Ayın demleyenleri', 'Menü ve footer'] as const;
const GROUPS = [...new Set(FIELDS.map((f) => f.group))];
const COVER = '/demleme/04-konuklar/reel-covers/';
const coverSrc = (c: string) => (/^(https?:)?\/\//.test(c) || c.startsWith('/') ? c : COVER + c);

export default function Content() {
  const menu = useMenu();
  const { show, node } = useToast();
  const [tab, setTab] = useState<(typeof TABS)[number]>(TABS[0]);
  const [group, setGroup] = useState(GROUPS[0]);
  const [q, setQ] = useState('');
  const [t, setT] = useState<Record<string, string> | null>(null);
  const [faq, setFaq] = useState<Faq[]>(DEFAULT_FAQ);
  const [guests, setGuests] = useState<Guest[]>(DEFAULT_GUESTS);
  const [dm, setDm] = useState<Demleyen>(DEFAULT_DM);
  const [footer, setFooter] = useState<FooterData>(DEFAULT_FOOTER);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const load = useCallback(async () => {
    const { data, error } = await supabase().from('site_content').select('key, value');
    if (error) return setErr('İçerik yüklenemedi: ' + error.message);
    const m = Object.fromEntries((data ?? []).map((r) => [r.key as string, r.value as unknown]));
    setT((m.texts as Record<string, string>) ?? {});
    if (Array.isArray(m.faq)) setFaq(m.faq as Faq[]);
    if (Array.isArray(m.guests) && m.guests.length) setGuests(m.guests as Guest[]);
    const d = m.demleyen as Partial<Demleyen> | undefined;
    if (d) setDm({ month: d.month || DEFAULT_DM.month, photos: Array.isArray(d.photos) ? d.photos : DEFAULT_DM.photos, sehpa_base: d.sehpa_base, sehpa_colors: Array.isArray(d.sehpa_colors) ? d.sehpa_colors : [] });
    const f = m.footer as Partial<FooterData> | undefined;
    if (f) setFooter({ cols: Array.isArray(f.cols) ? f.cols : DEFAULT_FOOTER.cols, legal: Array.isArray(f.legal) ? f.legal : DEFAULT_FOOTER.legal });
  }, []);
  useEffect(() => {
    const x = setTimeout(load, 0);
    return () => clearTimeout(x);
  }, [load]);

  const fields = useMemo(() => {
    const k = q.trim().toLowerCase();
    return k ? FIELDS.filter((f) => (f.label + ' ' + (f.hint ?? '') + ' ' + f.group).toLowerCase().includes(k)) : FIELDS.filter((f) => f.group === group);
  }, [group, q]);

  async function save() {
    if (!t) return;
    for (const g of guests) if (!g.name.trim()) return show('Her konuğun adı olmalı.', true);
    for (const f of FIELDS) if (f.kind === 'number' && t[f.id] != null && (t[f.id].trim() === '' || isNaN(Number(t[f.id])) || Number(t[f.id]) < 0)) return show(`“${f.label}” geçerli bir sayı olmalı.`, true);
    setBusy(true);
    const rows = [
      { key: 'texts', value: t },
      { key: 'faq', value: faq.filter((x) => x.q.trim()) },
      { key: 'guests', value: guests },
      { key: 'demleyen', value: dm },
      { key: 'footer', value: footer },
    ].map((r) => ({ ...r, updated_at: new Date().toISOString() }));
    const { error } = await supabase().from('site_content').upsert(rows, { onConflict: 'key' });
    if (error) {
      setBusy(false);
      return show('Kaydedilemedi: ' + error.message, true);
    }
    await refreshSite();
    setBusy(false);
    show('Kaydedildi, site güncellendi');
  }

  if (!t)
    return (
      <>
        <TopBar title="İçerik" onMenu={menu} />
        <div className="adm-scroll">{err ? <div className="alert err">{err}</div> : <Loading />}</div>
      </>
    );

  const setText = (id: string, def: string, v: string) =>
    setT((s) => {
      const n = { ...(s ?? {}) };
      if (v === def) delete n[id];
      else n[id] = v;
      return n;
    });

  return (
    <>
      <TopBar title="İçerik" sub="Sitedeki her metin, görsel ve ayar" onMenu={menu}>
        <a className="btn ghost" href="/" target="_blank" rel="noopener">Siteyi aç</a>
        <button className="btn" onClick={save} disabled={busy}><Save size={15} /> {busy ? 'Kaydediliyor…' : 'Kaydet'}</button>
      </TopBar>
      <div className="adm-scroll">
        <div className="adm-inner" style={{ maxWidth: 940 }}><PageHero />
          <div className="ic-top">
            {TABS.map((x) => (
              <button key={x} type="button" className={tab === x ? 'on' : ''} onClick={() => setTab(x)}>{x}</button>
            ))}
          </div>

          {tab === TABS[0] && (
            <>
              <div className="ic-grid">
              <aside className="ic-side">
                <input className="ic-search" placeholder="Alan ara…" value={q} onChange={(e) => setQ(e.target.value)} />
                {GROUPS.map((g) => {
                  const all = FIELDS.filter((f) => f.group === g);
                  const mod = all.filter((f) => t[f.id] != null).length;
                  const hit = q.trim() ? all.filter((f) => (f.label + ' ' + (f.hint ?? '')).toLowerCase().includes(q.trim().toLowerCase())).length : all.length;
                  if (!hit) return null;
                  return (
                    <button key={g} type="button" className={!q.trim() && group === g ? 'on' : ''} onClick={() => { setGroup(g); setQ(''); }}>
                      <span>{g}</span>
                      <span className={`ic-n${mod ? ' mod' : ''}`} title={mod ? `${mod} alan değiştirildi` : `${all.length} alan`}>{mod || all.length}</span>
                    </button>
                  );
                })}
              </aside>
              <div>
              <section className="card">
                <div className="card-h"><h2 className="card-t">{q.trim() ? `“${q.trim()}” sonuçları` : group}</h2><span className="card-m">Değiştirdiğin alanlar kaydedilince sitede yayına girer</span></div>
                <div className="card-b">
                  {fields.length === 0 && <div className="ic-empty">Eşleşen alan yok.</div>}
                  {fields.map((f) => {
                    const v = t[f.id] ?? f.def;
                    const changed = t[f.id] != null;
                    const reset = changed ? <ResetBtn onClick={() => setText(f.id, f.def, f.def)} /> : null;
                    const label = (
                      <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        {f.label}
                        {changed && <span className="badge plain b-ac" style={{ padding: '1px 7px', fontSize: 10.5 }}>değişti</span>}
                        {reset}
                      </span>
                    );
                    if (f.kind === 'bool')
                      return (
                        <div className="fld" key={f.id}>
                          <label className="chk">
                            <input type="checkbox" checked={v !== '0' && v !== ''} onChange={(e) => setText(f.id, f.def, e.target.checked ? '1' : '0')} />
                            {f.label}
                          </label>
                          {f.hint && <span className="hint">{f.hint}</span>}
                        </div>
                      );
                    return (
                      <div className="fld" key={f.id}>
                        <span className="lbl">{label}</span>
                        {f.kind === 'image' ? (
                          <ImageInput value={v} onChange={(x) => setText(f.id, f.def, x)} onError={(m) => show(m, true)} />
                        ) : f.kind === 'long' || (f.kind === 'text' && f.def.includes('\n')) ? (
                          <textarea className="inp" rows={f.kind === 'long' ? 4 : 2} value={v} onChange={(e) => setText(f.id, f.def, e.target.value)} />
                        ) : (
                          <input className="inp" type={f.kind === 'number' ? 'number' : f.kind === 'url' ? 'url' : 'text'} min={f.kind === 'number' ? 0 : undefined} step={f.kind === 'number' ? 'any' : undefined} value={v} onChange={(e) => setText(f.id, f.def, e.target.value)} />
                        )}
                        {f.hint && <span className="hint">{f.hint}</span>}
                        {f.id === 'shop_title' && <span className="hint">Alt satıra geçmek için Enter.</span>}
                      </div>
                    );
                  })}
                </div>
              </section>
              </div>
              </div>
            </>
          )}

          {tab === TABS[1] && (
            <section className="card">
              <div className="card-h"><h2 className="card-t">Sıkça sorulan sorular</h2><AddBtn onClick={() => setFaq((a) => [...a, { q: '', a: '' }])}>Soru ekle</AddBtn></div>
              <div className="card-b">
                {faq.length === 0 && <p className="hint">Soru yok; bölümü tamamen gizlemek için “Metin ve görseller → Bölümler”i kullan.</p>}
                {faq.map((x, i) => (
                  <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 16, alignItems: 'flex-start' }}>
                    <div style={{ flex: 1 }}>
                      <input className="inp" placeholder="Soru" value={x.q} onChange={(e) => setFaq((a) => setAt(a, i, { q: e.target.value }))} style={{ marginBottom: 8 }} />
                      <textarea className="inp" rows={3} placeholder="Cevap" value={x.a} onChange={(e) => setFaq((a) => setAt(a, i, { a: e.target.value }))} />
                    </div>
                    <RowTools i={i} n={faq.length} move={(d) => setFaq((a) => moved(a, i, d))} remove={() => setFaq((a) => without(a, i))} />
                  </div>
                ))}
              </div>
            </section>
          )}

          {tab === TABS[2] && (
            <>
              <p className="hint" style={{ marginBottom: 12 }}>Sıra, masadaki oturma sırasıdır. İlk konuk ortada başlar. Konuk çizimleri tasarım dosyalarındandır; yeni bir konuk için hazır çizimlerden seçilir.</p>
              {guests.map((g, gi) => (
                <section className="card" key={gi} style={{ marginBottom: 14 }}>
                  <div className="card-h">
                    { }
                    <img src={`/demleme/04-konuklar/guests/${g.drawing}-720.webp`} alt="" style={{ width: 38, height: 38, objectFit: 'contain' }} />
                    <h2 className="card-t">{g.name || 'Yeni konuk'}</h2>
                    <span style={{ marginLeft: 'auto' }}><RowTools i={gi} n={guests.length} move={(d) => setGuests((a) => moved(a, gi, d))} remove={() => setGuests((a) => without(a, gi))} /></span>
                  </div>
                  <div className="card-b">
                    <div className="row3">
                      <Field label="Ad"><input className="inp" value={g.name} onChange={(e) => setGuests((a) => setAt(a, gi, { name: e.target.value }))} /></Field>
                      <Field label="Bağlantı"><input className="inp" value={g.url} onChange={(e) => setGuests((a) => setAt(a, gi, { url: e.target.value }))} /></Field>
                      <Field label="Çizim">
                        <select className="inp" value={g.drawing} onChange={(e) => setGuests((a) => setAt(a, gi, { drawing: e.target.value }))}>
                          {DRAWINGS.map((d) => <option key={d} value={d}>{d}</option>)}
                        </select>
                      </Field>
                    </div>
                    <span className="lbl">Reels&apos;ler</span>
                    {g.reels.map((r, ri) => (
                      <div key={ri} style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 8 }}>
                        { }
                        <img src={coverSrc(r.cover)} alt="" style={{ width: 36, height: 44, objectFit: 'cover', borderRadius: 6, background: 'var(--s3)' }} />
                        <select className="inp" style={{ width: 150 }} value={REEL_COVERS.includes(r.cover) ? r.cover : '__custom'} onChange={(e) => e.target.value !== '__custom' && setGuests((a) => setAt(a, gi, { reels: setAt(g.reels, ri, { cover: e.target.value }) }))}>
                          {REEL_COVERS.map((c) => <option key={c} value={c}>{c.split('-')[0]}</option>)}
                          <option value="__custom">Yüklenen</option>
                        </select>
                        <label className="btn ghost sm" style={{ position: 'relative' }}>
                          Kapak yükle
                          <input type="file" accept="image/*" style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }} onChange={async (e) => {
                            const f = e.target.files?.[0];
                            if (!f) return;
                            try {
                              const { uploadImage } = await import('@/lib/admin');
                              const url = await uploadImage(f, 'reels');
                              setGuests((a) => setAt(a, gi, { reels: setAt(g.reels, ri, { cover: url }) }));
                            } catch (x) { show('Yüklenemedi: ' + (x instanceof Error ? x.message : ''), true); }
                          }} />
                        </label>
                        <label className={`btn ghost sm${r.video ? ' on' : ''}`} style={{ position: 'relative' }} title={r.video ? 'Video yüklü: ' + r.video : 'MP4 / WebM / MOV, en çok 50 MB'}>
                          {r.video ? 'Video ✓ değiştir' : 'Video yükle'}
                          <input type="file" accept="video/mp4,video/webm,video/quicktime" style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }} onChange={async (e) => {
                            const f = e.target.files?.[0];
                            e.target.value = '';
                            if (!f) return;
                            try {
                              show('Video yükleniyor…');
                              const { uploadReelVideo } = await import('@/lib/admin');
                              const url = await uploadReelVideo(f);
                              setGuests((a) => setAt(a, gi, { reels: setAt(g.reels, ri, { video: url }) }));
                              show('Video yüklendi. Kaydetmeyi unutma.');
                            } catch (x) { show('Yüklenemedi: ' + (x instanceof Error ? x.message : ''), true); }
                          }} />
                        </label>
                        {r.video && <button type="button" className="btn ghost sm" onClick={() => setGuests((a) => setAt(a, gi, { reels: setAt(g.reels, ri, { video: '' }) }))}>Videoyu kaldır</button>}
                        <input className="inp" placeholder="Bağlantı (isteğe bağlı)" value={r.url} onChange={(e) => setGuests((a) => setAt(a, gi, { reels: setAt(g.reels, ri, { url: e.target.value }) }))} />
                        <input className="inp" type="number" min={0} max={100} style={{ width: 74 }} title="İlerleme çubuğu %" value={r.progress} onChange={(e) => setGuests((a) => setAt(a, gi, { reels: setAt(g.reels, ri, { progress: Number(e.target.value) }) }))} />
                        <RowTools i={ri} n={g.reels.length} move={(d) => setGuests((a) => setAt(a, gi, { reels: moved(g.reels, ri, d) }))} remove={() => setGuests((a) => setAt(a, gi, { reels: without(g.reels, ri) }))} />
                      </div>
                    ))}
                    <AddBtn onClick={() => setGuests((a) => setAt(a, gi, { reels: [...g.reels, { cover: REEL_COVERS[0], url: '', progress: 20, video: '' }] }))}>Reel ekle</AddBtn>
                  </div>
                </section>
              ))}
              <AddBtn onClick={() => setGuests((a) => [...a, { name: '', url: '/konuklar', drawing: DRAWINGS.find((d) => !a.some((g) => g.drawing === d)) ?? DRAWINGS[0], reels: [] }])}>Konuk ekle</AddBtn>
            </>
          )}

          {tab === TABS[3] && (
            <>
              <section className="card" style={{ marginBottom: 14 }}>
                <div className="card-h"><h2 className="card-t">Sehpa renkleri</h2><AddBtn onClick={() => setDm((d) => ({ ...d, sehpa_colors: [...(d.sehpa_colors ?? []), { name: '', hex: '#8B1D1D', img: '' }] }))}>Renk ekle</AddBtn></div>
                <div className="card-b">
                  <p className="hint" style={{ marginBottom: 12 }}>Ana sayfada sehpanın üzerinde fareyi gezdirince (telefonda alttaki noktalara dokununca) bu renkler görünür. İlk renk, “Metin ve görseller → Sehpa görseli” alanındaki görseldir; onun adını ve rengini aşağıdan yaz. Her renk için sehpanın aynı boyutta, şeffaf arka planlı (WebP/PNG) görselini yükle.</p>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', paddingBottom: 12 }}>
                    <span style={{ fontSize: 12.5, color: 'var(--tx3)', minWidth: 130 }}>Varsayılan renk</span>
                    <input className="inp" style={{ maxWidth: 200 }} placeholder="Ad (örn. Kırmızı)" value={dm.sehpa_base?.name ?? ''} onChange={(e) => setDm((d) => ({ ...d, sehpa_base: { name: e.target.value, hex: d.sehpa_base?.hex || '#8B1D1D' } }))} />
                    <input className="hex" type="color" value={dm.sehpa_base?.hex || '#8B1D1D'} onChange={(e) => setDm((d) => ({ ...d, sehpa_base: { name: d.sehpa_base?.name ?? '', hex: e.target.value } }))} aria-label="Varsayılan renk" />
                  </div>
                  {(dm.sehpa_colors ?? []).map((c, i) => (
                    <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'center', paddingTop: 12, borderTop: '1px solid var(--bdr)' }}>
                      <div style={{ width: 150, flexShrink: 0 }}><ImageInput value={c.img} onChange={(v) => setDm((d) => ({ ...d, sehpa_colors: setAt(d.sehpa_colors ?? [], i, { img: v }) }))} onError={(m) => show(m, true)} folder="demleyenler/sehpa" /></div>
                      <input className="inp" style={{ maxWidth: 200 }} placeholder="Renk adı" value={c.name} onChange={(e) => setDm((d) => ({ ...d, sehpa_colors: setAt(d.sehpa_colors ?? [], i, { name: e.target.value }) }))} />
                      <input className="hex" type="color" value={c.hex || '#8B1D1D'} onChange={(e) => setDm((d) => ({ ...d, sehpa_colors: setAt(d.sehpa_colors ?? [], i, { hex: e.target.value }) }))} aria-label="Renk" />
                      <RowTools i={i} n={(dm.sehpa_colors ?? []).length} move={(x) => setDm((d) => ({ ...d, sehpa_colors: moved(d.sehpa_colors ?? [], i, x) }))} remove={() => setDm((d) => ({ ...d, sehpa_colors: without(d.sehpa_colors ?? [], i) }))} />
                    </div>
                  ))}
                </div>
              </section>
            <section className="card">
              <div className="card-h"><h2 className="card-t">Ayın demleyenleri</h2><AddBtn onClick={() => setDm((d) => ({ ...d, photos: [...d.photos, { name: '', city: '', img: '', icon: 'heart', tilt: 0 }] }))}>Fotoğraf ekle</AddBtn></div>
              <div className="card-b">
                <Field label="Ay adı (başlıkta görünür)" hint="Örn. Ekim. Sehpada 5 fotoğraf en iyi görünür."><input className="inp" style={{ maxWidth: 260 }} value={dm.month} onChange={(e) => setDm((d) => ({ ...d, month: e.target.value }))} /></Field>
                {dm.photos.map((p, i) => (
                  <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start', paddingTop: 14, borderTop: '1px solid var(--bdr)', marginTop: 8 }}>
                    <div style={{ width: 260, flexShrink: 0 }}><ImageInput value={p.img} onChange={(v) => setDm((d) => ({ ...d, photos: setAt(d.photos, i, { img: v }) }))} onError={(m) => show(m, true)} folder="demleyenler" /></div>
                    <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr 90px 80px', gap: 8 }}>
                      <input className="inp" placeholder="Ad" value={p.name} onChange={(e) => setDm((d) => ({ ...d, photos: setAt(d.photos, i, { name: e.target.value }) }))} />
                      <input className="inp" placeholder="Şehir" value={p.city} onChange={(e) => setDm((d) => ({ ...d, photos: setAt(d.photos, i, { city: e.target.value }) }))} />
                      <select className="inp" value={p.icon} onChange={(e) => setDm((d) => ({ ...d, photos: setAt(d.photos, i, { icon: e.target.value as 'heart' | 'mug' }) }))}><option value="heart">Kalp</option><option value="mug">Bardak</option></select>
                      <input className="inp" type="number" title="Eğim (derece)" value={p.tilt} onChange={(e) => setDm((d) => ({ ...d, photos: setAt(d.photos, i, { tilt: Number(e.target.value) }) }))} />
                    </div>
                    <RowTools i={i} n={dm.photos.length} move={(x) => setDm((d) => ({ ...d, photos: moved(d.photos, i, x) }))} remove={() => setDm((d) => ({ ...d, photos: without(d.photos, i) }))} />
                  </div>
                ))}
              </div>
            </section>
            </>
          )}

          {tab === TABS[4] && (
            <>
              {footer.cols.map((c, ci) => (
                <section className="card" key={ci} style={{ marginBottom: 14 }}>
                  <div className="card-h">
                    <input className="inp" style={{ maxWidth: 260, fontWeight: 600 }} value={c.title} onChange={(e) => setFooter((f) => ({ ...f, cols: setAt(f.cols, ci, { title: e.target.value }) }))} />
                    <span style={{ marginLeft: 'auto' }}><RowTools i={ci} n={footer.cols.length} move={(d) => setFooter((f) => ({ ...f, cols: moved(f.cols, ci, d) }))} remove={() => setFooter((f) => ({ ...f, cols: without(f.cols, ci) }))} /></span>
                  </div>
                  <div className="card-b">
                    <LinkList links={c.links} onChange={(links) => setFooter((f) => ({ ...f, cols: setAt(f.cols, ci, { links }) }))} />
                  </div>
                </section>
              ))}
              <div style={{ marginBottom: 18 }}><AddBtn onClick={() => setFooter((f) => ({ ...f, cols: [...f.cols, { title: 'Yeni sütun', links: [] }] }))}>Sütun ekle</AddBtn></div>
              <section className="card">
                <div className="card-h"><h2 className="card-t">Alt şerit bağlantıları</h2><span className="card-m">Ana sayfa ve tüm mağaza sayfalarında görünür</span></div>
                <div className="card-b"><LinkList links={footer.legal} onChange={(legal) => setFooter((f) => ({ ...f, legal }))} /></div>
              </section>
              <p className="hint" style={{ marginTop: 12 }}>Footer slogan ve telif satırı “Metin ve görseller → Footer” altındadır. Bağlantı: “/sayfa”, “#bolum” ya da “https://…”.</p>
            </>
          )}
        </div>
      </div>
      {node}
    </>
  );
}

function LinkList({ links, onChange }: { links: { label: string; href: string }[]; onChange: (l: { label: string; href: string }[]) => void }) {
  return (
    <>
      {links.map((l, i) => (
        <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 8, alignItems: 'center' }}>
          <input className="inp" placeholder="Yazı" value={l.label} onChange={(e) => onChange(setAt(links, i, { label: e.target.value }))} />
          <input className="inp" placeholder="Bağlantı" value={l.href} onChange={(e) => onChange(setAt(links, i, { href: e.target.value }))} />
          <RowTools i={i} n={links.length} move={(d) => onChange(moved(links, i, d))} remove={() => onChange(without(links, i))} />
        </div>
      ))}
      <AddBtn onClick={() => onChange([...links, { label: '', href: '/' }])}>Bağlantı ekle</AddBtn>
    </>
  );
}
