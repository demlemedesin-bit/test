'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Eye, Pencil, Plus, Save, Trash2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { dt, refreshSite, slugify } from '@/lib/admin';
import { md } from '@/lib/md';
import { toAnnounce } from '@/lib/announce';
import { useMenu } from '@/components/admin/Shell';
import { Confirm, Empty, Field, Loading, Panel, TopBar, useToast } from '@/components/admin/ui';
import { ImageInput } from '@/components/admin/Editors';
import { AnnounceBar, type AnnounceData } from '@/components/AnnounceBar';
import './sayfalar.css';

const TABS = ['Sayfalar', 'Blog', 'Yönlendirmeler', 'Duyuru çubuğu'] as const;
type Toast = (t: string, e?: boolean) => void;

type PageRow = { slug: string; title: string; body: string; seo_title: string; seo_desc: string; published: boolean; in_footer: boolean; sort: number; updated_at: string };
type PostRow = { slug: string; title: string; excerpt: string; cover: string | null; body: string; tags: string[]; seo_title: string; seo_desc: string; published: boolean; published_at: string | null; created_at: string; updated_at: string };
type RedirRow = { id: string; from_path: string; to_path: string; permanent: boolean; active: boolean; created_at: string };

export default function Pages() {
  const menu = useMenu();
  const { show, node } = useToast();
  const [tab, setTab] = useState<(typeof TABS)[number]>(TABS[0]);
  return (
    <>
      <TopBar title="Sayfa, blog, yönlendirme" sub="Kurumsal sayfalar, yazılar, eski adresler ve duyuru" onMenu={menu}>
        <a className="btn ghost" href="/blog" target="_blank" rel="noopener">Blogu aç</a>
      </TopBar>
      <div className="adm-scroll">
        <div className="adm-inner" style={{ maxWidth: 980 }}>
          <div className="tabs" style={{ marginBottom: 18 }}>
            {TABS.map((x) => (
              <button key={x} type="button" className={`tab${tab === x ? ' on' : ''}`} onClick={() => setTab(x)}>{x}</button>
            ))}
          </div>
          {tab === 'Sayfalar' && <ContentTab kind="page" toast={show} />}
          {tab === 'Blog' && <ContentTab kind="post" toast={show} />}
          {tab === 'Yönlendirmeler' && <RedirectsTab toast={show} />}
          {tab === 'Duyuru çubuğu' && <AnnounceTab toast={show} />}
        </div>
      </div>
      {node}
    </>
  );
}

// ═══ Sayfalar ve blog ══════════════════════════════════════════════════
type Draft = {
  isNew: boolean;
  orig: string;
  slug: string;
  slugTouched: boolean;
  title: string;
  body: string;
  excerpt: string;
  cover: string;
  tags: string;
  seoTitle: string;
  seoDesc: string;
  published: boolean;
  inFooter: boolean;
  sort: string;
  publishedAt: string; // datetime-local
};

const toLocalInput = (iso: string | null) => {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
};

const blank = (sort: number): Draft => ({ isNew: true, orig: '', slug: '', slugTouched: false, title: '', body: '', excerpt: '', cover: '', tags: '', seoTitle: '', seoDesc: '', published: false, inFooter: false, sort: String(sort), publishedAt: '' });
const fromPage = (p: PageRow): Draft => ({ ...blank(p.sort), isNew: false, orig: p.slug, slug: p.slug, slugTouched: true, title: p.title, body: p.body, seoTitle: p.seo_title, seoDesc: p.seo_desc, published: p.published, inFooter: p.in_footer });
const fromPost = (p: PostRow): Draft => ({ ...blank(0), isNew: false, orig: p.slug, slug: p.slug, slugTouched: true, title: p.title, body: p.body, excerpt: p.excerpt, cover: p.cover ?? '', tags: (p.tags ?? []).join(', '), seoTitle: p.seo_title, seoDesc: p.seo_desc, published: p.published, publishedAt: toLocalInput(p.published_at) });

function ContentTab({ kind, toast }: { kind: 'page' | 'post'; toast: Toast }) {
  const table = kind === 'page' ? 'pages' : 'posts';
  const [list, setList] = useState<(PageRow | PostRow)[] | null>(null);
  const [err, setErr] = useState('');
  const [edit, setEdit] = useState<Draft | null>(null);
  const [del, setDel] = useState<PageRow | PostRow | null>(null);
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(0);

  const load = useCallback(async () => {
    const q = kind === 'page' ? supabase().from('pages').select('*').order('sort').order('title') : supabase().from('posts').select('*').order('created_at', { ascending: false });
    const { data, error } = await q;
    if (error) return setErr('Liste yüklenemedi: ' + error.message);
    setErr('');
    setNow(Date.now());
    setList((data ?? []) as (PageRow | PostRow)[]);
  }, [kind]);
  useEffect(() => {
    const x = setTimeout(load, 0);
    return () => clearTimeout(x);
  }, [load]);

  async function remove() {
    if (!del) return;
    setBusy(true);
    const { error } = await supabase().from(table).delete().eq('slug', del.slug);
    if (error) {
      setBusy(false);
      return toast('Silinemedi: ' + error.message, true);
    }
    await refreshSite();
    setBusy(false);
    setDel(null);
    toast('Silindi');
    load();
  }

  const url = (slug: string) => (kind === 'page' ? `/sayfa/${slug}` : `/blog/${slug}`);
  const noun = kind === 'page' ? 'sayfa' : 'yazı';

  return (
    <>
      {err && <div className="alert err">{err}</div>}
      <div className="card">
        <div className="card-h">
          <h2 className="card-t">{kind === 'page' ? 'Kurumsal sayfalar' : 'Blog yazıları'}</h2>
          <span className="card-m">
            <button type="button" className="btn sm" onClick={() => setEdit(blank(kind === 'page' ? ((list as PageRow[] | null)?.length ?? 0) : 0))}><Plus size={14} /> Yeni {noun}</button>
          </span>
        </div>
        {!list ? (
          <Loading />
        ) : list.length === 0 ? (
          <Empty title={`Henüz ${noun} yok`} text={`“Yeni ${noun}” ile ilkini ekle.`} />
        ) : (
          <div>
            <div className="sy-row hd"><span>Başlık</span><span className="sy-hide-m">Durum</span><span className="sy-hide-m">{kind === 'page' ? 'Footer' : 'Yayın tarihi'}</span><span /></div>
            {list.map((r) => {
              const pg = r as PageRow;
              const po = r as PostRow;
              const sched = kind === 'post' && po.published && po.published_at && new Date(po.published_at).getTime() > now;
              return (
                <div className="sy-row" key={r.slug}>
                  <span className="cell-clip">
                    <b className="cell-strong">{r.title}</b>
                    <span className="cell-muted" style={{ display: 'block' }}>{url(r.slug)}</span>
                  </span>
                  <span className="sy-hide-m"><span className={`badge ${sched ? 'b-amber' : r.published ? 'b-green' : 'b-gray'}`}>{sched ? 'Zamanlı' : r.published ? 'Yayında' : 'Taslak'}</span></span>
                  <span className="sy-hide-m cell-muted">{kind === 'page' ? (pg.in_footer ? 'Gösterilir' : '—') : dt(po.published_at)}</span>
                  <span className="sy-act">
                    {r.published && <a className="icon-btn" href={url(r.slug)} target="_blank" rel="noopener" aria-label="Sitede aç" title="Sitede aç"><Eye size={15} /></a>}
                    <button type="button" className="icon-btn" aria-label="Düzenle" title="Düzenle" onClick={() => setEdit(kind === 'page' ? fromPage(pg) : fromPost(po))}><Pencil size={15} /></button>
                    <button type="button" className="icon-btn" aria-label="Sil" title="Sil" onClick={() => setDel(r)}><Trash2 size={15} /></button>
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
      <p className="cell-muted" style={{ marginTop: 14 }}>
        {kind === 'page' ? 'Sayfalar /sayfa/adres altında yayınlanır. “Footer’da göster” işaretliler sitenin alt şeridine bağlantı olarak eklenir.' : 'Yazılar /blog altında listelenir. Yayın tarihi ileri bir tarihse yazı o ana kadar sitede görünmez.'}
      </p>
      {edit && <ContentEditor key={edit.orig || 'yeni'} kind={kind} init={edit} toast={toast} onClose={() => setEdit(null)} onSaved={load} />}
      {del && <Confirm title={`Bu ${noun} silinsin mi?`} text={`“${del.title}” kalıcı olarak silinir. Bu işlem geri alınamaz.`} confirmText="Sil" busy={busy} onConfirm={remove} onCancel={() => setDel(null)} />}
    </>
  );
}

function ContentEditor({ kind, init, toast, onClose, onSaved }: { kind: 'page' | 'post'; init: Draft; toast: Toast; onClose: () => void; onSaved: () => void }) {
  const [d, setD] = useState<Draft>(init);
  const [busy, setBusy] = useState(false);
  const [errs, setErrs] = useState<string[]>([]);
  const [ask, setAsk] = useState(false);
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((s) => ({ ...s, [k]: v }));
  const max = kind === 'page' ? 60 : 80;
  const html = useMemo(() => md(d.body), [d.body]);

  const close = () => (d.title !== init.title || d.body !== init.body) && !ask ? setAsk(true) : onClose();

  async function save() {
    const e: string[] = [];
    const slug = d.slug.trim();
    if (!d.title.trim()) e.push('Başlık gerekli.');
    if (!new RegExp(`^[a-z0-9-]{2,${max}}$`).test(slug)) e.push(`Adres (slug) 2-${max} karakter olmalı; yalnızca küçük harf, rakam ve tire.`);
    let publishedAt: string | null = null;
    if (kind === 'post' && d.publishedAt) {
      const t = new Date(d.publishedAt);
      if (isNaN(t.getTime())) e.push('Yayın tarihi geçersiz.');
      else publishedAt = t.toISOString();
    }
    const sort = Number(d.sort);
    if (kind === 'page' && (d.sort.trim() === '' || !Number.isInteger(sort))) e.push('Sıra tam sayı olmalı.');
    if (e.length) return setErrs(e);
    setErrs([]);

    const base = { slug, title: d.title.trim(), body: d.body, seo_title: d.seoTitle.trim(), seo_desc: d.seoDesc.trim(), published: d.published };
    const row: Record<string, unknown> =
      kind === 'page'
        ? { ...base, in_footer: d.inFooter, sort }
        : {
            ...base,
            excerpt: d.excerpt.trim(),
            cover: d.cover.trim() || null,
            tags: [...new Set(d.tags.split(',').map((t) => t.trim()).filter(Boolean))],
            // yayında ama tarih boşsa “şimdi”
            published_at: d.published ? publishedAt ?? new Date().toISOString() : publishedAt,
          };
    setBusy(true);
    const table = kind === 'page' ? 'pages' : 'posts';
    const { error } = d.isNew ? await supabase().from(table).insert(row) : await supabase().from(table).update(row).eq('slug', init.orig);
    if (error) {
      setBusy(false);
      return setErrs([error.code === '23505' ? 'Bu adresle (slug) başka bir kayıt var.' : 'Kaydedilemedi: ' + error.message]);
    }
    await refreshSite();
    setBusy(false);
    toast(d.published ? 'Kaydedildi, sitede yayında' : 'Taslak kaydedildi');
    onSaved();
    onClose();
  }

  const noun = kind === 'page' ? 'sayfa' : 'yazı';
  return (
    <>
      <Panel
        wide
        title={d.isNew ? `Yeni ${noun}` : d.title || `${noun[0].toUpperCase()}${noun.slice(1)}`}
        onClose={close}
        footer={
          <>
            <button type="button" className="btn ghost" onClick={close} disabled={busy}>Vazgeç</button>
            <button type="button" className="btn" onClick={save} disabled={busy}><Save size={15} /> {busy ? 'Kaydediliyor…' : 'Kaydet'}</button>
          </>
        }
      >
        {errs.length > 0 && <div className="alert err">{errs.map((x) => <div key={x}>{x}</div>)}</div>}
        <div className="sec">
          <p className="sec-t">Genel</p>
          <Field label="Başlık">
            <input className="inp" value={d.title} maxLength={160} onChange={(e) => setD((s) => ({ ...s, title: e.target.value, slug: s.slugTouched ? s.slug : slugify(e.target.value).slice(0, max) }))} />
          </Field>
          <Field label="Adres (slug)" hint={`${kind === 'page' ? '/sayfa/' : '/blog/'}${d.slug || '…'}`}>
            <input className="inp" value={d.slug} maxLength={max} onChange={(e) => setD((s) => ({ ...s, slug: slugify(e.target.value).slice(0, max), slugTouched: true }))} />
          </Field>
          {kind === 'post' && (
            <>
              <Field label="Kısa özet" hint="Blog listesindeki kartta görünür">
                <textarea className="inp" style={{ minHeight: 70 }} value={d.excerpt} maxLength={400} onChange={(e) => set('excerpt', e.target.value)} />
              </Field>
              <Field label="Kapak görseli">
                <ImageInput value={d.cover} onChange={(v) => set('cover', v)} onError={(m) => toast(m, true)} folder="blog" />
              </Field>
              <Field label="Etiketler" hint="Virgülle ayır: podcast, notlar">
                <input className="inp" value={d.tags} onChange={(e) => set('tags', e.target.value)} />
              </Field>
            </>
          )}
        </div>

        <div className="sec">
          <p className="sec-t">İçerik</p>
          <div className="sy-ed">
            <Field label="Metin (markdown)" hint="# Başlık, ## Alt başlık, **kalın**, *italik*, [bağlantı](https://…), - liste, 1. liste, > alıntı, ![açıklama](görsel adresi), --- ayraç. Ham HTML çalışmaz.">
              <textarea className="inp" value={d.body} onChange={(e) => set('body', e.target.value)} spellCheck />
            </Field>
            <div>
              <span className="lbl">Önizleme</span>
              {d.body.trim() ? <div className="sy-prev" dangerouslySetInnerHTML={{ __html: html }} /> : <div className="sy-prev sy-empty-prev">Yazdıkça burada görünür.</div>}
            </div>
          </div>
        </div>

        <div className="sec">
          <p className="sec-t">Yayın</p>
          <label className="chk"><input type="checkbox" checked={d.published} onChange={(e) => set('published', e.target.checked)} /> Sitede yayında</label>
          {kind === 'page' ? (
            <div className="row2">
              <label className="chk"><input type="checkbox" checked={d.inFooter} onChange={(e) => set('inFooter', e.target.checked)} /> Footer’da göster</label>
              <Field label="Sıra" hint="Küçük sayı önce gelir">
                <input className="inp" type="number" step={1} value={d.sort} onChange={(e) => set('sort', e.target.value)} />
              </Field>
            </div>
          ) : (
            <Field label="Yayın tarihi" hint="Boşsa kaydettiğin an kullanılır. İleri bir tarih seçersen yazı o zaman görünür.">
              <input className="inp" type="datetime-local" value={d.publishedAt} onChange={(e) => set('publishedAt', e.target.value)} />
            </Field>
          )}
        </div>

        <div className="sec">
          <p className="sec-t">SEO</p>
          <Field label="Arama sonucu başlığı" hint={`${d.seoTitle.length}/60 · Boşsa başlık kullanılır`}>
            <input className="inp" value={d.seoTitle} maxLength={120} onChange={(e) => set('seoTitle', e.target.value)} />
          </Field>
          <Field label="Arama sonucu açıklaması" hint={`${d.seoDesc.length}/160${kind === 'post' ? ' · Boşsa kısa özet kullanılır' : ''}`}>
            <textarea className="inp" style={{ minHeight: 70 }} value={d.seoDesc} maxLength={300} onChange={(e) => set('seoDesc', e.target.value)} />
          </Field>
        </div>
      </Panel>
      {ask && <Confirm title="Değişiklikler kaydedilmedi" text="Kapatırsan yazdıkların kaybolur." confirmText="Kapat" danger={false} onConfirm={onClose} onCancel={() => setAsk(false)} />}
    </>
  );
}

// ═══ Yönlendirmeler ═══════════════════════════════════════════════════
const normPath = (p: string) => (p.length > 1 ? p.replace(/\/+$/, '') || '/' : p);
const RESERVED = /^\/(admin|api|_next)(\/|$)/i;

function checkRedirect(from: string, to: string, others: RedirRow[]): string | null {
  if (!from.startsWith('/') || /^\/[/\\]/.test(from) || /\s/.test(from) || /[?#]/.test(from)) return 'Eski adres “/” ile başlamalı; boşluk, ? ve # içermemeli (örn. /eski-sayfa).';
  if (normPath(from) === '/') return 'Ana sayfa yönlendirilemez.';
  if (RESERVED.test(from)) return 'Yönetim paneli ve sistem adresleri yönlendirilemez.';
  const t = to.trim();
  const local = /^\/(?![/\\])/.test(t) && !/\s/.test(t);
  if (!local && !/^https?:\/\/[^\s]+$/i.test(t)) return 'Yeni adres “/” ile başlayan bir site içi yol ya da http(s):// ile başlayan tam adres olmalı.';
  if (local && normPath(t.split(/[?#]/)[0]) === normPath(from)) return 'Eski ve yeni adres aynı olamaz.';
  if (local) {
    // Zincir kontrolü: yeni adresten başlayıp tekrar eski adrese dönülüyorsa döngü olur
    const map = new Map(others.filter((o) => o.active).map((o) => [normPath(o.from_path), o.to_path]));
    let cur = normPath(t.split(/[?#]/)[0]);
    for (let i = 0; i < 10 && cur; i++) {
      if (cur === normPath(from)) return 'Bu yönlendirme başka bir yönlendirmeyle döngü oluşturuyor.';
      const nx = map.get(cur);
      if (!nx || !nx.startsWith('/')) break;
      cur = normPath(nx.split(/[?#]/)[0]);
    }
  }
  return null;
}

function RedirectsTab({ toast }: { toast: Toast }) {
  const [list, setList] = useState<RedirRow[] | null>(null);
  const [err, setErr] = useState('');
  const [edit, setEdit] = useState<Partial<RedirRow> | null>(null);
  const [del, setDel] = useState<RedirRow | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const { data, error } = await supabase().from('redirects').select('*').order('created_at', { ascending: false });
    if (error) return setErr('Liste yüklenemedi: ' + error.message);
    setErr('');
    setList((data ?? []) as RedirRow[]);
  }, []);
  useEffect(() => {
    const x = setTimeout(load, 0);
    return () => clearTimeout(x);
  }, [load]);

  async function toggle(r: RedirRow) {
    const { error } = await supabase().from('redirects').update({ active: !r.active }).eq('id', r.id);
    if (error) return toast('Güncellenemedi: ' + error.message, true);
    toast(r.active ? 'Yönlendirme kapatıldı' : 'Yönlendirme açıldı');
    load();
  }

  async function remove() {
    if (!del) return;
    setBusy(true);
    const { error } = await supabase().from('redirects').delete().eq('id', del.id);
    setBusy(false);
    if (error) return toast('Silinemedi: ' + error.message, true);
    setDel(null);
    toast('Silindi');
    load();
  }

  return (
    <>
      {err && <div className="alert err">{err}</div>}
      <div className="card">
        <div className="card-h">
          <h2 className="card-t">Yönlendirmeler</h2>
          <span className="card-m"><button type="button" className="btn sm" onClick={() => setEdit({ from_path: '/', to_path: '/', permanent: true, active: true })}><Plus size={14} /> Yeni yönlendirme</button></span>
        </div>
        {!list ? (
          <Loading />
        ) : list.length === 0 ? (
          <Empty title="Henüz yönlendirme yok" text="Adresi değişen sayfalar için eski adresi yeni adrese yönlendir." />
        ) : (
          <div>
            <div className="sy-row rd hd"><span>Eski adres</span><span className="sy-hide-m">Yeni adres</span><span className="sy-hide-m">Tür</span><span className="sy-hide-m">Durum</span><span /></div>
            {list.map((r) => (
              <div className="sy-row rd" key={r.id}>
                <span className="cell-clip mono" title={r.from_path}>{r.from_path}</span>
                <span className="cell-clip mono sy-hide-m" title={r.to_path}>{r.to_path}</span>
                <span className="cell-muted sy-hide-m">{r.permanent ? 'Kalıcı (301)' : 'Geçici (302)'}</span>
                <span className="sy-hide-m"><button type="button" className={`badge ${r.active ? 'b-green' : 'b-gray'}`} style={{ border: 'none', cursor: 'pointer' }} onClick={() => toggle(r)} title="Durumu değiştir">{r.active ? 'Aktif' : 'Kapalı'}</button></span>
                <span className="sy-act">
                  <button type="button" className="icon-btn" aria-label="Düzenle" title="Düzenle" onClick={() => setEdit(r)}><Pencil size={15} /></button>
                  <button type="button" className="icon-btn" aria-label="Sil" title="Sil" onClick={() => setDel(r)}><Trash2 size={15} /></button>
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
      <p className="cell-muted" style={{ marginTop: 14 }}>Yönlendirmeler en geç 1 dakika içinde devreye girer. Kalıcı (301) arama motorlarına adresin taşındığını bildirir; geçici (302) kampanya gibi süreli işler içindir.</p>
      {edit && <RedirectEditor init={edit} all={list ?? []} toast={toast} onClose={() => setEdit(null)} onSaved={load} />}
      {del && <Confirm title="Yönlendirme silinsin mi?" text={`${del.from_path} adresi artık yönlendirilmez.`} confirmText="Sil" busy={busy} onConfirm={remove} onCancel={() => setDel(null)} />}
    </>
  );
}

function RedirectEditor({ init, all, toast, onClose, onSaved }: { init: Partial<RedirRow>; all: RedirRow[]; toast: Toast; onClose: () => void; onSaved: () => void }) {
  const [from, setFrom] = useState(init.from_path ?? '/');
  const [to, setTo] = useState(init.to_path ?? '/');
  const [permanent, setPermanent] = useState(init.permanent !== false);
  const [active, setActive] = useState(init.active !== false);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  async function save() {
    const f = from.trim();
    const t = to.trim();
    const bad = checkRedirect(f, t, all.filter((x) => x.id !== init.id));
    if (bad) return setErr(bad);
    if (all.some((x) => x.id !== init.id && normPath(x.from_path) === normPath(f))) return setErr('Bu eski adres için zaten bir yönlendirme var.');
    setErr('');
    setBusy(true);
    const row = { from_path: normPath(f), to_path: t, permanent, active };
    const { error } = init.id ? await supabase().from('redirects').update(row).eq('id', init.id) : await supabase().from('redirects').insert(row);
    setBusy(false);
    if (error) return setErr(error.code === '23505' ? 'Bu eski adres için zaten bir yönlendirme var.' : 'Kaydedilemedi: ' + error.message);
    toast('Kaydedildi');
    onSaved();
    onClose();
  }

  return (
    <Panel
      title={init.id ? 'Yönlendirmeyi düzenle' : 'Yeni yönlendirme'}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn ghost" onClick={onClose} disabled={busy}>Vazgeç</button>
          <button type="button" className="btn" onClick={save} disabled={busy}><Save size={15} /> {busy ? 'Kaydediliyor…' : 'Kaydet'}</button>
        </>
      }
    >
      {err && <div className="alert err">{err}</div>}
      <Field label="Eski adres" hint="Örn. /eski-sayfa"><input className="inp" value={from} onChange={(e) => setFrom(e.target.value)} autoCapitalize="none" spellCheck={false} /></Field>
      <Field label="Yeni adres" hint="Site içi yol (/blog/yeni-yazi) ya da tam adres (https://…)"><input className="inp" value={to} onChange={(e) => setTo(e.target.value)} autoCapitalize="none" spellCheck={false} /></Field>
      <Field label="Tür">
        <select className="inp" value={permanent ? '301' : '302'} onChange={(e) => setPermanent(e.target.value === '301')}>
          <option value="301">Kalıcı (301)</option>
          <option value="302">Geçici (302)</option>
        </select>
      </Field>
      <label className="chk"><input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} /> Aktif</label>
    </Panel>
  );
}

// ═══ Duyuru çubuğu ════════════════════════════════════════════════════
const BGS: [AnnounceData['bg'], string][] = [['ink', 'Koyu'], ['accent', 'Kırmızı'], ['cream', 'Krem']];

function AnnounceTab({ toast }: { toast: Toast }) {
  const [a, setA] = useState<AnnounceData | null>(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const x = setTimeout(async () => {
      const { data, error } = await supabase().from('site_content').select('value').eq('key', 'announce').maybeSingle();
      if (error) return setErr('Yüklenemedi: ' + error.message);
      setA(toAnnounce(data?.value));
    }, 0);
    return () => clearTimeout(x);
  }, []);

  if (!a) return err ? <div className="alert err">{err}</div> : <Loading />;
  const set = <K extends keyof AnnounceData>(k: K, v: AnnounceData[K]) => setA((s) => (s ? { ...s, [k]: v } : s));

  async function save() {
    if (!a) return;
    const url = a.url.trim();
    if (a.on && !a.text.trim()) return toast('Duyuru açıkken metin boş olamaz.', true);
    if (url && !/^(\/(?![/\\])|https?:\/\/|mailto:|tel:)/i.test(url)) return toast('Bağlantı “/” ile ya da http(s)://, mailto:, tel: ile başlamalı.', true);
    setBusy(true);
    const { error } = await supabase().from('site_content').upsert({ key: 'announce', value: { on: a.on, text: a.text.trim(), url, bg: a.bg } }, { onConflict: 'key' });
    if (error) {
      setBusy(false);
      return toast('Kaydedilemedi: ' + error.message, true);
    }
    await refreshSite();
    setBusy(false);
    toast('Kaydedildi, site güncellendi');
  }

  return (
    <section className="card">
      <div className="card-h">
        <h2 className="card-t">Duyuru çubuğu</h2>
        <span className="card-m">Ana sayfa ve mağaza sayfalarının en üstünde ince şerit</span>
      </div>
      <div className="card-b">
        <label className="chk"><input type="checkbox" checked={a.on} onChange={(e) => set('on', e.target.checked)} /> Sitede göster</label>
        <Field label="Metin" hint={`${a.text.length}/140 · Ziyaretçi şeridi kapatabilir (o oturum için)`}>
          <input className="inp" value={a.text} maxLength={140} onChange={(e) => set('text', e.target.value)} placeholder="Örn. 750 ₺ üzeri siparişlerde kargo bedava" />
        </Field>
        <div className="row2">
          <Field label="Bağlantı (isteğe bağlı)" hint="Örn. /#magaza ya da https://…"><input className="inp" value={a.url} onChange={(e) => set('url', e.target.value)} autoCapitalize="none" spellCheck={false} /></Field>
          <Field label="Renk">
            <select className="inp" value={a.bg} onChange={(e) => set('bg', e.target.value as AnnounceData['bg'])}>
              {BGS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}
            </select>
          </Field>
        </div>
        <span className="lbl">Önizleme</span>
        <div className="sy-ann-prev">
          <AnnounceBar a={{ ...a, on: true, text: a.text.trim() || 'Duyuru metni burada görünür' }} preview />
        </div>
        {!a.on && <p className="hint">Şu an kapalı: sitede görünmez.</p>}
        <div style={{ marginTop: 18 }}>
          <button type="button" className="btn" onClick={save} disabled={busy}><Save size={15} /> {busy ? 'Kaydediliyor…' : 'Kaydet'}</button>
        </div>
      </div>
    </section>
  );
}
