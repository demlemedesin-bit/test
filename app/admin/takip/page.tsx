'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Check, Copy, Link2, Pencil, Plus, Trash2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { slugify, tl } from '@/lib/admin';
import { useMenu } from '@/components/admin/Shell';
import { AreaChart, Donut, HBars } from '@/components/admin/Charts';
import { Confirm, Empty, Field, Kpi, Loading, Panel, TopBar, useToast } from '@/components/admin/ui';
import { PageHero } from '@/components/admin/PageHero';

type TLink = { id: string; code: string; name: string; dest: string; utm_source: string; utm_medium: string; utm_campaign: string; utm_term: string; utm_content: string; active: boolean; created_at: string };
type Row = { source: string; medium: string; campaign: string; clicks: number; views: number; visitors: number; carts: number; orders: number; revenue: number };
type LRow = { code: string; clicks: number; visitors: number; carts: number; orders: number; revenue: number };
type Day = { day: string; views: number; visitors: number; orders: number };
type Report = { rows: Row[]; links: LRow[]; daily: Day[] };

const EMPTY = { name: '', code: '', dest: '/', utm_source: '', utm_medium: '', utm_campaign: '', utm_term: '', utm_content: '' };
const SOURCES = [['instagram', 'social'], ['youtube', 'video'], ['tiktok', 'social'], ['x', 'social'], ['whatsapp', 'social'], ['newsletter', 'email'], ['google', 'cpc'], ['meta', 'cpc']];
const RANGES = [[7, 'Son 7 gün'], [30, 'Son 30 gün'], [90, 'Son 90 gün']] as const;
const pct = (a: number, b: number) => (b > 0 ? (a / b * 100).toFixed(1).replace('.', ',') + '%' : '—');

function longUrl(origin: string, f: typeof EMPTY) {
  const u = new URL(f.dest.startsWith('/') ? f.dest : '/', origin || 'https://site.example');
  (['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'] as const).forEach((k) => f[k].trim() && u.searchParams.set(k, f[k].trim()));
  return u.toString();
}

export default function Tracking() {
  const menu = useMenu();
  const { show, node } = useToast();
  const [days, setDays] = useState<number>(30);
  const [rep, setRep] = useState<Report | null>(null);
  const [links, setLinks] = useState<TLink[] | null>(null);
  const [err, setErr] = useState('');
  const [edit, setEdit] = useState<(typeof EMPTY & { id?: string }) | null>(null);
  const [del, setDel] = useState<TLink | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState('');
  const [origin] = useState(() => (typeof window === 'undefined' ? '' : window.location.origin));

  const load = useCallback(async () => {
    const to = new Date(Date.now() + 864e5).toISOString();
    const from = new Date(Date.now() - days * 864e5).toISOString();
    const [r, l] = await Promise.all([supabase().rpc('track_report', { p_from: from, p_to: to }), supabase().from('track_links').select('*').order('created_at', { ascending: false })]);
    if (r.error || l.error) return setErr('Veriler yüklenemedi: ' + (r.error?.message || l.error?.message));
    setErr('');
    setRep(r.data as Report);
    setLinks((l.data ?? []) as TLink[]);
  }, [days]);
  useEffect(() => {
    const x = setTimeout(load, 0);
    return () => clearTimeout(x);
  }, [load]);

  const tot = useMemo(() => {
    const r = rep?.rows ?? [];
    const s = (k: keyof Row) => r.reduce((a, x) => a + Number(x[k]), 0);
    return { views: s('views'), visitors: s('visitors'), carts: s('carts'), orders: s('orders'), revenue: s('revenue') };
  }, [rep]);
  const stat = useMemo(() => Object.fromEntries((rep?.links ?? []).map((x) => [x.code, x])), [rep]);

  async function copy(text: string, id: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(id);
      setTimeout(() => setCopied(''), 1600);
    } catch {
      show('Kopyalanamadı, elle seç.', true);
    }
  }

  async function save() {
    if (!edit) return;
    const code = (edit.code || slugify(edit.name)).slice(0, 40);
    if (!edit.name.trim()) return show('Link için bir ad yaz.', true);
    if (!/^[a-z0-9-]{2,40}$/.test(code)) return show('Kod 2-40 karakter; küçük harf, rakam ve tire olabilir.', true);
    if (!edit.dest.startsWith('/') || edit.dest.startsWith('//')) return show('Hedef “/” ile başlayan bir site içi adres olmalı (örn. /, /#magaza, /urun/…).', true);
    if (!edit.utm_source.trim()) return show('Kaynak (utm_source) gerekli; örn. instagram.', true);
    setBusy(true);
    const row = { name: edit.name.trim(), code, dest: edit.dest.trim(), utm_source: edit.utm_source.trim(), utm_medium: edit.utm_medium.trim(), utm_campaign: edit.utm_campaign.trim(), utm_term: edit.utm_term.trim(), utm_content: edit.utm_content.trim() };
    const { error } = edit.id ? await supabase().from('track_links').update(row).eq('id', edit.id) : await supabase().from('track_links').insert(row);
    setBusy(false);
    if (error) return show(error.code === '23505' ? 'Bu kod başka bir linkte kullanılıyor.' : 'Kaydedilemedi: ' + error.message, true);
    setEdit(null);
    show('Link kaydedildi');
    load();
  }
  async function toggle(l: TLink) {
    const { error } = await supabase().from('track_links').update({ active: !l.active }).eq('id', l.id);
    if (error) return show(error.message, true);
    load();
  }
  async function remove() {
    if (!del) return;
    setBusy(true);
    const { error } = await supabase().from('track_links').delete().eq('id', del.id);
    setBusy(false);
    if (error) return show(error.message, true);
    setDel(null);
    show('Link silindi (geçmiş veriler korunur)');
    load();
  }

  const copyBtn = (text: string, id: string) => (
    <button type="button" className="icon-btn" title="Kopyala" onClick={() => copy(text, id)}>{copied === id ? <Check size={15} color="var(--green)" /> : <Copy size={15} />}</button>
  );


  return (
    <>
      <TopBar title="Takip" sub="Kaynak, kampanya ve link performansı" onMenu={menu}>
        <button className="btn" onClick={() => setEdit({ ...EMPTY })}><Plus size={15} /> Yeni takip linki</button>
      </TopBar>
      <div className="adm-scroll">
        <div className="adm-inner"><PageHero />
          {err && <div className="alert err">{err}</div>}
          <div className="tabs" style={{ marginBottom: 16 }}>
            {RANGES.map(([n, l]) => <button key={n} type="button" className={`tab${days === n ? ' on' : ''}`} onClick={() => setDays(n)}>{l}</button>)}
          </div>
          {!rep || !links ? (
            !err && <Loading />
          ) : (
            <>
              <div className="kpis" style={{ marginBottom: 18 }}>
                <Kpi label="Ziyaretçi" value={String(tot.visitors)} sub={`${tot.views} sayfa görüntüleme`} tone="blue" icon={<Link2 size={17} />} />
                <Kpi label="Sepete ekleyen" value={String(tot.carts)} sub={`ziyaretçinin ${pct(tot.carts, tot.visitors)}'i`} tone="amber" icon={<Plus size={17} />} />
                <Kpi label="Sipariş" value={String(tot.orders)} sub={`dönüşüm ${pct(tot.orders, tot.visitors)}`} tone="green" icon={<Check size={17} />} />
                <Kpi label="Ciro" value={tl(tot.revenue)} sub="takip edilen siparişler" tone="ac" icon={<Copy size={17} />} />
              </div>

              <section className="card" style={{ marginBottom: 18 }}>
                <div className="card-h"><h2 className="card-t">Günlük ziyaret</h2></div>
                <div className="card-b">
                  {rep.daily.length === 0 ? <Empty title="Henüz veri yok" text="Siteye gelen ziyaretler burada görünür." /> : (
                    <AreaChart height={190} data={rep.daily.map((d) => ({ label: d.day.slice(5), value: d.views, note: `${d.visitors} ziyaretçi · ${d.orders} sipariş` }))} />
                  )}
                </div>
              </section>

              {rep.rows.length > 0 && (() => {
                const bySrc = new Map<string, { v: number; r: number }>();
                rep.rows.forEach((r) => { const k = r.source || 'doğrudan'; const o = bySrc.get(k) ?? { v: 0, r: 0 }; o.v += r.visitors; o.r += r.revenue; bySrc.set(k, o); });
                const arr = [...bySrc].sort((a, b) => b[1].v - a[1].v);
                const pal = ['var(--ac)', 'var(--green)', 'var(--blue)', 'var(--amber)', 'var(--red)', 'var(--tx3)'];
                return (
                  <div className="grid2 even">
                    <section className="card"><div className="card-h"><h2 className="card-t">Trafik kaynakları</h2><span className="card-m">ziyaretçi</span></div>
                      <div className="card-b"><Donut size={138} center={{ big: String(tot.visitors), small: 'ziyaretçi' }} segs={arr.slice(0, 6).map(([label, o], i) => ({ label, value: o.v, color: pal[i % pal.length] }))} /></div></section>
                    <section className="card"><div className="card-h"><h2 className="card-t">Kaynağa göre ciro</h2><span className="card-m">₺</span></div>
                      <div className="card-b"><HBars rows={arr.map(([label, o]) => ({ label, value: o.r })).filter((r) => r.value > 0).slice(0, 6)} fmt={tl} /></div></section>
                  </div>
                );
              })()}

              <section className="card" style={{ marginBottom: 18 }}>
                <div className="card-h"><h2 className="card-t">Kaynak / kampanya performansı</h2><span className="card-m">UTM’li her ziyaret otomatik buraya düşer</span></div>
                {rep.rows.length === 0 ? <Empty title="Henüz veri yok" text="Bir takip linki oluşturup paylaş; tıklamalar burada görünür." /> : (
                  <div style={{ overflowX: 'auto' }}>
                    <div className="tbl" style={{ minWidth: 760 }}>
                      <div className="tr hd" style={{ gridTemplateColumns: 'minmax(0,1.3fr) minmax(0,1fr) minmax(0,1.3fr) 70px 70px 70px 70px 100px' }}>
                        <span>Kaynak</span><span>Mecra</span><span>Kampanya</span><span>Ziyaretçi</span><span>Sepet</span><span>Sipariş</span><span>Dönüşüm</span><span>Ciro</span>
                      </div>
                      {rep.rows.map((r, i) => (
                        <div className="tr" key={i} style={{ gridTemplateColumns: 'minmax(0,1.3fr) minmax(0,1fr) minmax(0,1.3fr) 70px 70px 70px 70px 100px' }}>
                          <span className="cell-strong cell-clip">{r.source}</span><span className="cell-muted cell-clip">{r.medium || '—'}</span><span className="cell-clip">{r.campaign || '—'}</span>
                          <span className="num">{r.visitors}</span><span className="num">{r.carts}</span><span className="num">{r.orders}</span><span className="cell-muted">{pct(r.orders, r.visitors)}</span><span className="num">{tl(Number(r.revenue))}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </section>

              <section className="card">
                <div className="card-h"><h2 className="card-t">Takip linkleri</h2><span className="card-m">Paylaş: kısa link tıklamayı sayar ve UTM’li sayfaya yönlendirir</span></div>
                {links.length === 0 ? <Empty title="Henüz takip linki yok" text="“Yeni takip linki” ile ilk linkini oluştur." /> : (
                  <div style={{ overflowX: 'auto' }}>
                    <div className="tbl" style={{ minWidth: 820 }}>
                      <div className="tr hd" style={{ gridTemplateColumns: 'minmax(0,1.5fr) minmax(0,1.6fr) 64px 70px 64px 64px 96px 110px' }}>
                        <span>Link</span><span>Kısa adres</span><span>Tıklama</span><span>Ziyaretçi</span><span>Sepet</span><span>Sipariş</span><span>Ciro</span><span />
                      </div>
                      {links.map((l) => {
                        const s = stat[l.code];
                        const short = `${origin}/t/${l.code}`;
                        return (
                          <div className="tr" key={l.id} style={{ gridTemplateColumns: 'minmax(0,1.5fr) minmax(0,1.6fr) 64px 70px 64px 64px 96px 110px', opacity: l.active ? 1 : 0.55 }}>
                            <span className="cell-clip"><b className="cell-strong">{l.name}</b><br /><span className="cell-muted">{l.utm_source}{l.utm_medium && ' / ' + l.utm_medium}{l.utm_campaign && ' / ' + l.utm_campaign}</span></span>
                            <span className="cell-clip" style={{ display: 'flex', alignItems: 'center', gap: 4 }}><span className="mono cell-clip">/t/{l.code}</span>{copyBtn(short, l.id)}</span>
                            <span className="num">{s?.clicks ?? 0}</span><span className="num">{s?.visitors ?? 0}</span><span className="num">{s?.carts ?? 0}</span><span className="num">{s?.orders ?? 0}</span><span className="num">{tl(Number(s?.revenue ?? 0))}</span>
                            <span style={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                              <button className="icon-btn" title={l.active ? 'Pasifleştir' : 'Aktifleştir'} onClick={() => toggle(l)}><span className={`badge plain ${l.active ? 'b-green' : 'b-gray'}`} style={{ padding: '1px 7px', fontSize: 10.5 }}>{l.active ? 'aktif' : 'pasif'}</span></button>
                              <button className="icon-btn" title="Düzenle" onClick={() => setEdit({ ...l })}><Pencil size={15} /></button>
                              <button className="icon-btn" title="Sil" onClick={() => setDel(l)}><Trash2 size={15} /></button>
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </section>
            </>
          )}
        </div>
      </div>

      {edit && (
        <Panel
          title={edit.id ? 'Takip linkini düzenle' : 'Yeni takip linki'}
          onClose={() => setEdit(null)}
          footer={<><button className="btn ghost" onClick={() => setEdit(null)}>Vazgeç</button><button className="btn" onClick={save} disabled={busy}>{busy ? 'Kaydediliyor…' : 'Kaydet'}</button></>}
        >
          <Field label="Link adı" hint="Sadece sana görünür. Örn. “Ekim reels – Zeynep”"><input className="inp" value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value, code: edit.id || edit.code ? edit.code : '' })} /></Field>
          <div className="row2">
            <Field label="Kısa kod" hint={`${origin}/t/${edit.code || slugify(edit.name) || 'kod'}`}><input className="inp" value={edit.code} placeholder={slugify(edit.name)} onChange={(e) => setEdit({ ...edit, code: slugify(e.target.value) })} /></Field>
            <Field label="Gideceği sayfa" hint="Site içi: /, /#magaza, /urun/…"><input className="inp" value={edit.dest} onChange={(e) => setEdit({ ...edit, dest: e.target.value })} /></Field>
          </div>
          <div className="tabs" style={{ marginBottom: 12 }}>
            {SOURCES.map(([s, m]) => <button key={s} type="button" className="tab" style={{ fontSize: 12 }} onClick={() => setEdit({ ...edit, utm_source: s, utm_medium: m })}>{s}</button>)}
          </div>
          <div className="row2">
            <Field label="Kaynak (utm_source)"><input className="inp" value={edit.utm_source} onChange={(e) => setEdit({ ...edit, utm_source: e.target.value })} placeholder="instagram" /></Field>
            <Field label="Mecra (utm_medium)"><input className="inp" value={edit.utm_medium} onChange={(e) => setEdit({ ...edit, utm_medium: e.target.value })} placeholder="social" /></Field>
          </div>
          <Field label="Kampanya (utm_campaign)"><input className="inp" value={edit.utm_campaign} onChange={(e) => setEdit({ ...edit, utm_campaign: e.target.value })} placeholder="ekim-indirimi" /></Field>
          <div className="row2">
            <Field label="Anahtar kelime (utm_term)"><input className="inp" value={edit.utm_term} onChange={(e) => setEdit({ ...edit, utm_term: e.target.value })} /></Field>
            <Field label="İçerik (utm_content)" hint="Aynı kampanyada hangi görsel/video"><input className="inp" value={edit.utm_content} onChange={(e) => setEdit({ ...edit, utm_content: e.target.value })} /></Field>
          </div>
          <div className="sec">
            <div className="sec-t">Paylaşılacak adresler</div>
            <p className="hint" style={{ marginBottom: 6 }}>Kısa link (önerilir, tıklamayı da sayar):</p>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}><code className="mono cell-clip" style={{ flex: 1 }}>{origin}/t/{edit.code || slugify(edit.name) || 'kod'}</code>{copyBtn(`${origin}/t/${edit.code || slugify(edit.name)}`, 'short')}</div>
            <p className="hint" style={{ margin: '10px 0 6px' }}>Uzun UTM’li adres (kaydetmeden de çalışır):</p>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}><code className="mono" style={{ flex: 1, wordBreak: 'break-all', fontSize: 11.5 }}>{longUrl(origin, edit)}</code>{copyBtn(longUrl(origin, edit), "long")}</div>
          </div>
        </Panel>
      )}
      {del && <Confirm title="Linki sil?" text={`“${del.name}” kısa linki çalışmayı bırakır. Geçmiş istatistikler korunur.`} confirmText="Sil" busy={busy} onConfirm={remove} onCancel={() => setDel(null)} />}
      {node}
    </>
  );
}
