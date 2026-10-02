'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Check, Clock, EyeOff, MessageSquare, Star, Trash2, MessagesSquare } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { dt, refreshSite } from '@/lib/admin';
import { useMenu } from '@/components/admin/Shell';
import { Confirm, Empty, Field, Kpi, Loading, Panel, TopBar, useToast } from '@/components/admin/ui';
import { PageHero } from '@/components/admin/PageHero';

type Review = {
  id: string;
  product_slug: string;
  name: string;
  email: string;
  rating: number;
  title: string;
  body: string;
  approved: boolean;
  verified: boolean;
  reply: string | null;
  created_at: string;
};

const TABS = [
  ['pending', 'Onay bekleyen'],
  ['live', 'Yayında'],
  ['all', 'Tümü'],
] as const;
type Tab = (typeof TABS)[number][0];

const COLS = '28px minmax(0,1.1fr) minmax(0,1.1fr) minmax(0,2fr) 84px 140px';
const stars = (n: number) => '★'.repeat(n) + '☆'.repeat(5 - n);

export default function Reviews() {
  const menu = useMenu();
  const { show, node } = useToast();
  const [rows, setRows] = useState<Review[] | null>(null);
  const [names, setNames] = useState<Record<string, string>>({});
  const [err, setErr] = useState('');
  const [tab, setTab] = useState<Tab>('pending');
  const [prod, setProd] = useState('');
  const [sel, setSel] = useState<string[]>([]);
  const [reply, setReply] = useState<{ r: Review; text: string } | null>(null);
  const [del, setDel] = useState<Review | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const [a, b] = await Promise.all([
      supabase().from('reviews').select('*').order('created_at', { ascending: false }).limit(1000),
      supabase().from('products').select('slug,name'),
    ]);
    if (a.error) return setErr('Yorumlar yüklenemedi: ' + a.error.message);
    setErr('');
    setRows((a.data ?? []) as Review[]);
    setNames(Object.fromEntries(((b.data ?? []) as { slug: string; name: string }[]).map((p) => [p.slug, p.name])));
  }, []);
  useEffect(() => {
    const x = setTimeout(load, 0);
    return () => clearTimeout(x);
  }, [load]);

  const stat = useMemo(() => {
    const all = rows ?? [];
    const live = all.filter((r) => r.approved);
    return {
      pending: all.length - live.length,
      live: live.length,
      all: all.length,
      avg: live.length ? live.reduce((a, r) => a + r.rating, 0) / live.length : 0,
    };
  }, [rows]);

  const shown = useMemo(
    () => (rows ?? []).filter((r) => (tab === 'all' || (tab === 'live') === r.approved) && (!prod || r.product_slug === prod)),
    [rows, tab, prod],
  );
  const slugs = useMemo(() => [...new Set((rows ?? []).map((r) => r.product_slug))].sort((a, b) => (names[a] ?? a).localeCompare(names[b] ?? b, 'tr')), [rows, names]);
  const selPending = sel.filter((id) => shown.some((r) => r.id === id && !r.approved));

  /** Yazma sonrası ortak akış: hata göster, listeyi yenile, site önbelleğini tazele. */
  async function done(error: { message: string } | null, ok: string) {
    if (error) {
      show('İşlem yapılamadı: ' + error.message, true);
      return false;
    }
    setSel([]);
    await load();
    await refreshSite();
    show(ok);
    return true;
  }

  async function setApproved(ids: string[], approved: boolean) {
    if (!ids.length) return;
    setBusy(true);
    const { error } = await supabase().from('reviews').update({ approved }).in('id', ids);
    setBusy(false);
    await done(error, approved ? (ids.length > 1 ? `${ids.length} yorum yayınlandı` : 'Yorum yayınlandı') : 'Yorum yayından kaldırıldı');
  }

  async function saveReply() {
    if (!reply) return;
    setBusy(true);
    const text = reply.text.trim();
    const { error } = await supabase().from('reviews').update({ reply: text || null }).eq('id', reply.r.id);
    setBusy(false);
    if (await done(error, text ? 'Yanıt kaydedildi' : 'Yanıt kaldırıldı')) setReply(null);
  }

  async function remove() {
    if (!del) return;
    setBusy(true);
    const { error } = await supabase().from('reviews').delete().eq('id', del.id);
    setBusy(false);
    if (await done(error, 'Yorum silindi')) setDel(null);
  }

  const toggleSel = (id: string) => setSel((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  const allPendingShown = shown.filter((r) => !r.approved).map((r) => r.id);

  return (
    <>
      <TopBar title="Ürün yorumları" sub="Onayla, yanıtla, yayından kaldır" onMenu={menu} />
      <div className="adm-scroll">
        <div className="adm-inner"><PageHero />
          {err && <div className="alert err">{err}</div>}
          {!rows ? (
            !err && <Loading />
          ) : (
            <>
              <div className="kpis">
                <Kpi label="Ortalama puan" value={stat.live ? stat.avg.toFixed(1).replace('.', ',') + ' / 5' : '—'} sub={`${stat.live} yayındaki yoruma göre`} tone="amber" icon={<Star size={17} />} />
                <Kpi label="Onay bekleyen" value={String(stat.pending)} sub={stat.pending ? 'Sitede henüz görünmüyor' : 'Bekleyen yok'} tone={stat.pending ? 'red' : 'green'} icon={<Clock size={17} />} />
                <Kpi label="Yayında" value={String(stat.live)} sub="Ürün sayfalarında görünüyor" tone="green" icon={<Check size={17} />} />
                <Kpi label="Toplam yorum" value={String(stat.all)} tone="blue" icon={<MessagesSquare size={17} />} />
              </div>

              <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', marginBottom: 14 }}>
                <div className="tabs">
                  {TABS.map(([k, l]) => (
                    <button key={k} type="button" className={`tab${tab === k ? ' on' : ''}`} onClick={() => { setTab(k); setSel([]); }}>
                      {l} <i>{stat[k]}</i>
                    </button>
                  ))}
                </div>
                <select className="inp" style={{ width: 'auto', maxWidth: 260 }} value={prod} onChange={(e) => { setProd(e.target.value); setSel([]); }} aria-label="Ürün filtresi">
                  <option value="">Tüm ürünler</option>
                  {slugs.map((s) => (
                    <option key={s} value={s}>
                      {names[s] ?? s}
                    </option>
                  ))}
                </select>
                {tab !== 'live' && allPendingShown.length > 0 && (
                  <span style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                    <button type="button" className="btn ghost sm" onClick={() => setSel(selPending.length === allPendingShown.length ? [] : allPendingShown)}>
                      {selPending.length === allPendingShown.length ? 'Seçimi temizle' : `Bekleyenlerin hepsini seç (${allPendingShown.length})`}
                    </button>
                    <button type="button" className="btn sm" disabled={!selPending.length || busy} onClick={() => setApproved(selPending, true)}>
                      <Check size={14} /> Seçilenleri onayla{selPending.length ? ` (${selPending.length})` : ''}
                    </button>
                  </span>
                )}
              </div>

              <section className="card">
                {shown.length === 0 ? (
                  <Empty title={tab === 'pending' ? 'Onay bekleyen yorum yok' : 'Yorum yok'} text="Ziyaretçiler ürün sayfasından yorum yazdıkça burada görünür." />
                ) : (
                  <div style={{ overflowX: 'auto' }}>
                    <div className="tbl" style={{ minWidth: 860 }}>
                      <div className="tr hd" style={{ gridTemplateColumns: COLS }}>
                        <span />
                        <span>Ürün</span>
                        <span>Yazan</span>
                        <span>Yorum</span>
                        <span>Puan</span>
                        <span />
                      </div>
                      {shown.map((r) => (
                        <div className="tr" key={r.id} style={{ gridTemplateColumns: COLS, alignItems: 'start' }}>
                          <span>{!r.approved && <input type="checkbox" checked={sel.includes(r.id)} onChange={() => toggleSel(r.id)} aria-label="Seç" style={{ accentColor: 'var(--ac)' }} />}</span>
                          <span className="cell-clip">
                            <b className="cell-strong">{names[r.product_slug] ?? r.product_slug}</b>
                            <br />
                            <span className="cell-muted">{dt(r.created_at, true)}</span>
                          </span>
                          <span className="cell-clip">
                            <b className="cell-strong">{r.name}</b>
                            {r.verified && (
                              <>
                                {' '}
                                <span className="badge plain b-green" style={{ padding: '1px 7px', fontSize: 10.5 }}>doğrulanmış alıcı</span>
                              </>
                            )}
                            <br />
                            <span className="cell-muted">{r.email}</span>
                          </span>
                          <span style={{ minWidth: 0, overflowWrap: 'anywhere' }}>
                            {r.title && <b className="cell-strong">{r.title}<br /></b>}
                            <span style={{ whiteSpace: 'pre-line' }}>{r.body.length > 220 ? r.body.slice(0, 220) + '…' : r.body}</span>
                            {r.reply && (
                              <>
                                <br />
                                <span className="cell-muted">Yanıt: {r.reply.length > 120 ? r.reply.slice(0, 120) + '…' : r.reply}</span>
                              </>
                            )}
                          </span>
                          <span style={{ color: 'var(--amber)', letterSpacing: 1 }} title={`${r.rating} / 5`}>
                            {stars(r.rating)}
                            <br />
                            <span className={`badge plain ${r.approved ? 'b-green' : 'b-amber'}`} style={{ padding: '1px 7px', fontSize: 10.5, letterSpacing: 0 }}>{r.approved ? 'yayında' : 'bekliyor'}</span>
                          </span>
                          <span style={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                            {r.approved ? (
                              <button type="button" className="icon-btn" title="Yayından kaldır" disabled={busy} onClick={() => setApproved([r.id], false)}><EyeOff size={15} /></button>
                            ) : (
                              <button type="button" className="icon-btn" title="Onayla ve yayınla" disabled={busy} onClick={() => setApproved([r.id], true)}><Check size={15} color="var(--green)" /></button>
                            )}
                            <button type="button" className="icon-btn" title={r.reply ? 'Yanıtı düzenle' : 'Mağaza yanıtı yaz'} onClick={() => setReply({ r, text: r.reply ?? '' })}><MessageSquare size={15} /></button>
                            <button type="button" className="icon-btn" title="Sil" onClick={() => setDel(r)}><Trash2 size={15} /></button>
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </section>
            </>
          )}
        </div>
      </div>

      {reply && (
        <Panel
          title="Yorum ve mağaza yanıtı"
          onClose={() => setReply(null)}
          footer={
            <>
              <button className="btn ghost" onClick={() => setReply(null)}>Vazgeç</button>
              <button className="btn" onClick={saveReply} disabled={busy}>{busy ? 'Kaydediliyor…' : 'Yanıtı kaydet'}</button>
            </>
          }
        >
          <div className="sec">
            <div className="sec-t">{names[reply.r.product_slug] ?? reply.r.product_slug}</div>
            <p style={{ color: 'var(--amber)', letterSpacing: 1, margin: '0 0 4px' }}>{stars(reply.r.rating)}</p>
            <p style={{ margin: '0 0 2px' }}><b>{reply.r.name}</b> <span className="cell-muted">{reply.r.email}</span></p>
            {reply.r.title && <p style={{ margin: '8px 0 2px', fontWeight: 600 }}>{reply.r.title}</p>}
            <p style={{ whiteSpace: 'pre-line', overflowWrap: 'anywhere', margin: 0 }}>{reply.r.body}</p>
          </div>
          <Field label="Mağaza yanıtı" hint={`${reply.text.length}/1000 · Ürün sayfasında yorumun altında “Demleme yanıtı” olarak görünür (yorum yayındaysa). Boş bırakıp kaydedersen yanıt silinir.`}>
            <textarea className="inp" rows={6} maxLength={1000} value={reply.text} onChange={(e) => setReply({ ...reply, text: e.target.value })} />
          </Field>
        </Panel>
      )}
      {del && <Confirm title="Yorum silinsin mi?" text={`${del.name} adlı kişinin yorumu kalıcı olarak silinir. Yalnızca yayından kaldırmak istersen “Yayından kaldır” düğmesini kullan.`} confirmText="Sil" busy={busy} onConfirm={remove} onCancel={() => setDel(null)} />}
      {node}
    </>
  );
}
