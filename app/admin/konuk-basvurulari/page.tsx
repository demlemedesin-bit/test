'use client';

import { useCallback, useEffect, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { dt } from '@/lib/admin';
import { GUEST_BUCKET } from '@/lib/guestConst';
import { useMenu } from '@/components/admin/Shell';
import { Empty, Loading, TopBar } from '@/components/admin/ui';
import { PageHero } from '@/components/admin/PageHero';

type App = { id: string; created_at: string; full_name: string; email: string; wanted_guest: string; video_path: string | null; video_name: string | null; video_size: number | null; status: string; admin_note: string | null };
const ST: Record<string, string> = { yeni: 'Yeni', gorusulecek: 'Görüşülecek', kabul: 'Kabul', red: 'Red' };

export default function KonukBasvurulari() {
  const menu = useMenu();
  const [rows, setRows] = useState<App[] | null>(null);
  const [flt, setFlt] = useState('hepsi');
  const [err, setErr] = useState('');
  const [open, setOpen] = useState<string | null>(null);
  const [vid, setVid] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [delId, setDelId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const r = await supabase().from('guest_applications').select('id,created_at,full_name,email,wanted_guest,video_path,video_name,video_size,status,admin_note').order('created_at', { ascending: false }).limit(500);
    if (r.error) setErr(r.error.message);
    setRows((r.data as App[]) ?? []);
  }, []);
  useEffect(() => {
    const t = setTimeout(load, 0);
    return () => clearTimeout(t);
  }, [load]);

  async function patch(a: App, v: Partial<App>) {
    const { error } = await supabase().from('guest_applications').update(v).eq('id', a.id);
    if (error) return setErr(error.message);
    setRows((p) => (p ?? []).map((x) => (x.id === a.id ? { ...x, ...v } : x)));
  }
  async function showVideo(a: App) {
    if (!a.video_path) return;
    const { data, error } = await supabase().storage.from(GUEST_BUCKET).createSignedUrl(a.video_path, 3600);
    if (error || !data) return setErr('Video açılamadı: ' + (error?.message ?? ''));
    setVid((p) => ({ ...p, [a.id]: data.signedUrl }));
  }
  async function remove(a: App) {
    if (a.video_path) await supabase().storage.from(GUEST_BUCKET).remove([a.video_path]);
    const { error } = await supabase().from('guest_applications').delete().eq('id', a.id);
    if (error) return setErr(error.message);
    setDelId(null);
    setRows((p) => (p ?? []).filter((x) => x.id !== a.id));
  }

  const list = (rows ?? []).filter((x) => flt === 'hepsi' || x.status === flt);
  const nNew = (rows ?? []).filter((x) => x.status === 'yeni').length;

  return (
    <>
      <TopBar title="Konuk başvuruları" sub={`${rows?.length ?? 0} başvuru · ${nNew} yeni`} onMenu={menu} />
      <div className="adm-scroll"><div className="adm-inner"><PageHero />
        <div className="tabs" style={{ marginBottom: 14 }}>
          {['hepsi', 'yeni', 'gorusulecek', 'kabul', 'red'].map((k) => (
            <button key={k} className={`tab${flt === k ? ' on' : ''}`} onClick={() => setFlt(k)}>{k === 'hepsi' ? 'Hepsi' : ST[k]}</button>
          ))}
        </div>
        {err && <div className="alert err">{err}</div>}
        {!rows ? <Loading /> : list.length === 0 ? <Empty title="Başvuru yok" text="Sayfa açıkken gelen başvurular burada listelenir." /> : (
          <section className="card"><div className="card-b" style={{ padding: 0 }}>
            {list.map((a) => (
              <div key={a.id} style={{ borderBottom: '1px solid var(--bdr)' }}>
                <button type="button" onClick={() => setOpen(open === a.id ? null : a.id)} style={{ display: 'flex', gap: 12, width: '100%', padding: '12px 16px', background: 'none', border: 0, textAlign: 'left', cursor: 'pointer', fontSize: 13.5, alignItems: 'center' }}>
                  <b style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.full_name}</b>
                  <span style={{ color: 'var(--tx3)' }} className="hide-m">{a.video_path ? 'video var' : 'video yok'}</span>
                  <span style={{ color: 'var(--tx3)' }}>{dt(a.created_at)}</span>
                  <span className={`badge ${a.status === 'yeni' ? 'b-ac' : a.status === 'kabul' ? 'b-green' : 'plain'}`}>{ST[a.status] ?? a.status}</span>
                </button>
                {open === a.id && (
                  <div style={{ padding: '4px 16px 16px', display: 'grid', gap: 10, fontSize: 13.5 }}>
                    <div><span style={{ color: 'var(--tx3)' }}>E-posta: </span><a href={`mailto:${a.email}`}>{a.email}</a></div>
                    <div><span style={{ color: 'var(--tx3)' }}>Kimin hikayesini dinlemek istersiniz: </span><b>{a.wanted_guest}</b></div>
                    {a.video_path ? (
                      vid[a.id] ? <video src={vid[a.id]} controls preload="metadata" style={{ maxWidth: 520, width: '100%', borderRadius: 10 }} /> : (
                        <div><button className="btn ghost sm" onClick={() => showVideo(a)}>Videoyu aç</button> <span style={{ color: 'var(--tx3)' }}>{a.video_name} {a.video_size ? `· ${(a.video_size / 1048576).toFixed(1)} MB` : ''}</span></div>
                      )
                    ) : <div style={{ color: 'var(--tx3)' }}>Video yüklenmemiş.</div>}
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                      <select className="inp" style={{ width: 170 }} value={a.status} onChange={(e) => patch(a, { status: e.target.value })}>
                        {Object.entries(ST).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                      </select>
                      <input className="inp" style={{ flex: 1, minWidth: 200 }} placeholder="Not (sadece sen görürsün)" value={notes[a.id] ?? a.admin_note ?? ''} onChange={(e) => setNotes((p) => ({ ...p, [a.id]: e.target.value }))} />
                      <button className="btn ghost sm" onClick={() => patch(a, { admin_note: (notes[a.id] ?? a.admin_note ?? '').trim() || null })}>Notu kaydet</button>
                      {delId === a.id ? (
                        <>
                          <button className="btn sm" style={{ background: 'var(--red, #c0392b)' }} onClick={() => remove(a)}>Evet, sil (geri alınamaz)</button>
                          <button className="btn ghost sm" onClick={() => setDelId(null)}>Vazgeç</button>
                        </>
                      ) : <button className="btn ghost sm" onClick={() => setDelId(a.id)}><Trash2 size={14} /> Sil</button>}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div></section>
        )}
      </div></div>
    </>
  );
}
