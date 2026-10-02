'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { DatabaseBackup, Download, FileSpreadsheet, Info, Pencil, Plus, RefreshCw, Trash2, Users } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { PERMS, ROLE_TEMPLATES, dt, type Customer } from '@/lib/admin';
import { downloadCsv, downloadJson } from '@/lib/csv';
import { useMenu } from '@/components/admin/Shell';
import { Confirm, Empty, Field, Loading, Panel, TopBar, useToast } from '@/components/admin/ui';
import './sistem.css';

type Tab = 'ekip' | 'kayit' | 'yedek' | 'durum';
const TABS: [Tab, string][] = [
  ['ekip', 'Ekip ve roller'],
  ['kayit', 'İşlem kayıtları'],
  ['yedek', 'Yedek'],
  ['durum', 'Sistem durumu'],
];

const permLabel = (k: string) => PERMS.find((p) => p.key === k)?.label ?? k;
const roleLabel = (k: string) => ROLE_TEMPLATES.find((r) => r.key === k)?.label ?? 'Özel';

/* ═══ 1. Ekip ═══ */
type Staff = { id: string; email: string; name: string; role: string; perms: string[] };
type EditState = { id?: string; email: string; role: string; perms: string[] };

function Team({ toast }: { toast: (t: string, err?: boolean) => void }) {
  const [list, setList] = useState<Staff[] | null>(null);
  const [err, setErr] = useState('');
  const [edit, setEdit] = useState<EditState | null>(null);
  const [del, setDel] = useState<Staff | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const { data, error } = await supabase().rpc('admin_staff');
    if (error) return setErr('Ekip listesi yüklenemedi: ' + error.message);
    setErr('');
    setList((data ?? []) as Staff[]);
  }, []);
  useEffect(() => {
    const t = setTimeout(load, 0);
    return () => clearTimeout(t);
  }, [load]);

  async function save() {
    if (!edit) return;
    const email = edit.email.trim();
    if (!/^\S+@\S+\.\S+$/.test(email)) return toast('Geçerli bir e-posta yaz.', true);
    if (edit.perms.length === 0) return toast('En az bir yetki seç.', true);
    setBusy(true);
    const { error } = await supabase().rpc('admin_set_staff', { p_email: email, p_role: edit.role, p_perms: edit.perms });
    setBusy(false);
    if (error) return toast(error.message, true);
    setEdit(null);
    toast('Ekip üyesi kaydedildi');
    load();
  }
  async function remove() {
    if (!del) return;
    setBusy(true);
    const { error } = await supabase().rpc('admin_remove_staff', { p_user: del.id });
    setBusy(false);
    setDel(null);
    if (error) return toast('Kaldırma işlevi henüz etkin değil, yöneticiye bildir.', true);
    toast('Ekip üyesi kaldırıldı');
    load();
  }
  const togglePerm = (k: string) => edit && setEdit({ ...edit, role: 'ozel', perms: edit.perms.includes(k) ? edit.perms.filter((x) => x !== k) : [...edit.perms, k] });

  return (
    <>
      <div className="alert warn sy-info">
        <Info size={17} style={{ flexShrink: 0, marginTop: 1 }} />
        <span>Tam yöneticiler <b>shop_settings.admin_emails</b> ile belirlenir (Ayarlar sayfasında); buradan değil. Buradaki kişiler yalnızca seçilen bölümlere girebilir. Kişi önce sitede üye olmalıdır.</span>
      </div>
      {err && <div className="alert err">{err}</div>}
      <section className="card">
        <div className="card-h">
          <h2 className="card-t">Ekip</h2>
          <span className="card-m">{list ? `${list.length} kişi` : ''}</span>
          <button type="button" className="btn" style={{ marginLeft: 'auto' }} onClick={() => setEdit({ email: '', role: 'ozel', perms: [] })}>
            <Plus size={15} /> Ekip üyesi ekle
          </button>
        </div>
        {!list ? (
          !err && <Loading />
        ) : list.length === 0 ? (
          <Empty title="Henüz ekip üyesi yok" text="“Ekip üyesi ekle” ile bir kişiye sınırlı yetki ver." icon={<Users size={30} strokeWidth={1.5} />} />
        ) : (
          <div className="sy-scroll">
            <div className="tbl" style={{ minWidth: 640 }}>
              <div className="tr hd" style={{ gridTemplateColumns: 'minmax(0,1.4fr) 120px minmax(0,2fr) 80px' }}>
                <span>Kişi</span><span>Rol</span><span>Yetkiler</span><span />
              </div>
              {list.map((s) => (
                <div className="tr" key={s.id} style={{ gridTemplateColumns: 'minmax(0,1.4fr) 120px minmax(0,2fr) 80px' }}>
                  <span className="cell-clip"><b className="cell-strong">{s.name || s.email}</b>{s.name && <><br /><span className="cell-muted">{s.email}</span></>}</span>
                  <span>{roleLabel(s.role)}</span>
                  <span className="sy-perms">{s.perms.map((p) => <span key={p} className="badge plain b-gray">{permLabel(p)}</span>)}</span>
                  <span style={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                    <button type="button" className="icon-btn" title="Düzenle" onClick={() => setEdit({ id: s.id, email: s.email, role: s.role, perms: s.perms })}><Pencil size={15} /></button>
                    <button type="button" className="icon-btn" title="Kaldır" onClick={() => setDel(s)}><Trash2 size={15} /></button>
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {edit && (
        <Panel
          title={edit.id ? 'Yetkileri düzenle' : 'Ekip üyesi ekle'}
          onClose={() => setEdit(null)}
          footer={<><button type="button" className="btn ghost" onClick={() => setEdit(null)}>Vazgeç</button><button type="button" className="btn" onClick={save} disabled={busy}>{busy ? 'Kaydediliyor…' : 'Kaydet'}</button></>}
        >
          <Field label="E-posta" hint="Kişi sitede bu e-postayla kayıt olmuş olmalı.">
            <input className="inp" type="email" value={edit.email} disabled={!!edit.id} onChange={(e) => setEdit({ ...edit, email: e.target.value })} placeholder="ornek@eposta.com" />
          </Field>
          <div className="sec">
            <div className="sec-t">Hazır şablon</div>
            <div className="tabs">
              {ROLE_TEMPLATES.map((r) => (
                <button key={r.key} type="button" className={`tab${edit.role === r.key ? ' on' : ''}`} onClick={() => setEdit({ ...edit, role: r.key, perms: [...r.perms] })}>{r.label}</button>
              ))}
            </div>
          </div>
          <div className="sec">
            <div className="sec-t">Yetkiler</div>
            {PERMS.map((p) => (
              <label className="chk" key={p.key}>
                <input type="checkbox" checked={edit.perms.includes(p.key)} onChange={() => togglePerm(p.key)} /> {p.label}
              </label>
            ))}
          </div>
        </Panel>
      )}
      {del && <Confirm title="Ekip üyesi kaldırılsın mı?" text={`${del.name || del.email} panele erişimini kaybeder. Üyelik hesabı silinmez.`} confirmText="Kaldır" busy={busy} onConfirm={remove} onCancel={() => setDel(null)} />}
    </>
  );
}

/* ═══ 2. İşlem kayıtları ═══ */
type Log = { id: number; at: string; user_id: string | null; email: string | null; action: string; entity: string; entity_id: string | null; detail: Record<string, unknown> | null };
const ENTITY: Record<string, string> = {
  orders: 'Sipariş',
  products: 'Ürün',
  shop_settings: 'Ayar',
  site_content: 'İçerik',
  track_links: 'Takip bağlantısı',
  coupons: 'Kupon',
  pages: 'Sayfa',
  posts: 'Yazı',
  redirects: 'Yönlendirme',
  profiles: 'Rol',
};
const ACTION: Record<string, [string, string]> = { insert: ['Ekleme', 'b-green'], update: ['Güncelleme', 'b-blue'], delete: ['Silme', 'b-red'] };
const entLabel = (e: string) => ENTITY[e] ?? e;
const show = (v: unknown): string => {
  const s = v === null || v === undefined ? '—' : typeof v === 'object' ? JSON.stringify(v) : String(v);
  return s.length > 90 ? s.slice(0, 90) + '…' : s;
};

function Audit() {
  const [rows, setRows] = useState<Log[] | null>(null);
  const [err, setErr] = useState('');
  const [fu, setFu] = useState('');
  const [fe, setFe] = useState('');
  const [fa, setFa] = useState('');

  const load = useCallback(async () => {
    const { data, error } = await supabase().from('audit_log').select('*').order('at', { ascending: false }).limit(500);
    if (error) return setErr('Kayıtlar yüklenemedi: ' + error.message);
    setErr('');
    setRows((data ?? []) as Log[]);
  }, []);
  useEffect(() => {
    const t = setTimeout(load, 0);
    return () => clearTimeout(t);
  }, [load]);

  const users = useMemo(() => [...new Set((rows ?? []).map((r) => r.email || '').filter(Boolean))].sort(), [rows]);
  const ents = useMemo(() => [...new Set((rows ?? []).map((r) => r.entity))].sort(), [rows]);
  const shown = useMemo(() => (rows ?? []).filter((r) => (!fu || r.email === fu) && (!fe || r.entity === fe) && (!fa || r.action === fa)), [rows, fu, fe, fa]);

  return (
    <>
      {err && <div className="alert err">{err}</div>}
      <div className="sy-filters">
        <select className="inp" value={fu} onChange={(e) => setFu(e.target.value)} aria-label="Kullanıcı"><option value="">Tüm kullanıcılar</option>{users.map((u) => <option key={u} value={u}>{u}</option>)}</select>
        <select className="inp" value={fe} onChange={(e) => setFe(e.target.value)} aria-label="Varlık"><option value="">Tüm kayıt türleri</option>{ents.map((u) => <option key={u} value={u}>{entLabel(u)}</option>)}</select>
        <select className="inp" value={fa} onChange={(e) => setFa(e.target.value)} aria-label="Eylem"><option value="">Tüm eylemler</option>{Object.entries(ACTION).map(([k, [l]]) => <option key={k} value={k}>{l}</option>)}</select>
        <button type="button" className="btn ghost" onClick={load}><RefreshCw size={14} /> Yenile</button>
      </div>
      <section className="card">
        <div className="card-h"><h2 className="card-t">İşlem kayıtları</h2><span className="card-m">{rows ? `son ${rows.length} kayıttan ${shown.length} tanesi` : ''}</span></div>
        {!rows ? (
          !err && <Loading />
        ) : shown.length === 0 ? (
          <Empty title="Kayıt bulunamadı" text="Filtreleri değiştirmeyi dene." />
        ) : (
          <div className="sy-scroll">
            <div className="tbl" style={{ minWidth: 760 }}>
              <div className="tr hd" style={{ gridTemplateColumns: '130px minmax(0,1fr) 100px minmax(0,1fr) minmax(0,2fr)' }}>
                <span>Zaman</span><span>Kullanıcı</span><span>Eylem</span><span>Kayıt</span><span>Ayrıntı</span>
              </div>
              {shown.map((r) => {
                const [al, at] = ACTION[r.action] ?? [r.action, 'b-gray'];
                const d = Object.entries(r.detail ?? {});
                return (
                  <div className="tr" key={r.id} style={{ gridTemplateColumns: '130px minmax(0,1fr) 100px minmax(0,1fr) minmax(0,2fr)', alignItems: 'start' }}>
                    <span className="cell-muted">{dt(r.at, true)}</span>
                    <span className="cell-clip">{r.email || '—'}</span>
                    <span><span className={`badge plain ${at}`}>{al}</span></span>
                    <span className="cell-clip"><b className="cell-strong">{entLabel(r.entity)}</b>{r.entity_id && <><br /><span className="cell-muted mono">{r.entity_id}</span></>}</span>
                    <span className="sy-detail">{d.length === 0 ? <span className="cell-muted">—</span> : d.map(([k, v]) => <span key={k}><b>{k}:</b> {show(v)}</span>)}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </section>
    </>
  );
}

/* ═══ 3. Yedek ═══ */
const BACKUP: [string, string][] = [
  ['products', 'slug'],
  ['shop_settings', 'key'],
  ['site_content', 'key'],
  ['track_links', 'code'],
  ['coupons', 'code'],
  ['pages', 'slug'],
  ['posts', 'slug'],
  ['redirects', 'from_path'],
  ['message_templates', 'key'],
];
const SECRET = /secret|key|token|password/i;

async function fetchAll(table: string, cols: string, order: string): Promise<{ rows: Record<string, unknown>[]; error?: string }> {
  const out: Record<string, unknown>[] = [];
  for (let from = 0; from < 100000; from += 1000) {
    const { data, error } = await supabase().from(table).select(cols).order(order).range(from, from + 999);
    if (error) return { rows: out, error: error.message };
    const part = (data ?? []) as unknown as Record<string, unknown>[];
    out.push(...part);
    if (part.length < 1000) break;
  }
  return { rows: out };
}

function Backup({ toast }: { toast: (t: string, err?: boolean) => void }) {
  const [busy, setBusy] = useState('');
  const day = () => new Date().toISOString().slice(0, 10);

  async function json() {
    setBusy('json');
    const out: Record<string, unknown> = { exported_at: new Date().toISOString() };
    const fails: string[] = [];
    for (const [t, o] of BACKUP) {
      const r = await fetchAll(t, '*', o);
      if (r.error) fails.push(t);
      out[t] = t === 'shop_settings' ? r.rows.filter((x) => String(x.key) !== 'admin_emails' && !SECRET.test(String(x.key))) : r.rows;
    }
    setBusy('');
    downloadJson(`yedek_${day()}.json`, out);
    if (fails.length) toast('Bazı tablolar okunamadı: ' + fails.join(', '), true);
    else toast('Yedek indirildi (gizli ayarlar hariç)');
  }
  async function orders() {
    setBusy('orders');
    const r = await fetchAll('orders', 'order_no,created_at,status,email,full_name,phone,total,payment_method,address', 'created_at');
    setBusy('');
    if (r.error) return toast('Siparişler okunamadı: ' + r.error, true);
    downloadCsv(`siparisler_${day()}.csv`, ['order_no', 'created_at', 'status', 'email', 'full_name', 'phone', 'total', 'payment_method', 'city'], r.rows.map((o) => [o.order_no as string, o.created_at as string, o.status as string, o.email as string, o.full_name as string, o.phone as string, Number(o.total), o.payment_method as string, ((o.address as { city?: string } | null)?.city ?? '') as string]));
    toast(`${r.rows.length} sipariş indirildi`);
  }
  async function customers() {
    setBusy('cust');
    const { data, error } = await supabase().rpc('admin_customers');
    setBusy('');
    if (error) return toast('Müşteriler okunamadı: ' + error.message, true);
    const list = (data ?? []) as Customer[];
    downloadCsv(`musteriler_${day()}.csv`, ['email', 'name', 'phone', 'registered', 'joined_at', 'role', 'orders', 'spent', 'last_order_at'], list.map((c) => [c.email, c.name, c.phone, c.registered ? 'evet' : 'hayır', c.joined_at, c.role, Number(c.orders), Number(c.spent), c.last_order_at]));
    toast(`${list.length} müşteri indirildi`);
  }

  const items: { id: string; title: string; text: string; icon: React.ReactNode; run: () => void; label: string }[] = [
    { id: 'json', title: 'Tam yedek (JSON)', text: 'Ürünler, ayarlar, içerik, takip bağlantıları, kuponlar, sayfalar, yazılar, yönlendirmeler ve mesaj şablonları. Gizli anahtarlar ve yönetici e-postaları dahil edilmez.', icon: <DatabaseBackup size={16} />, run: json, label: 'Yedeği indir' },
    { id: 'orders', title: 'Siparişler (CSV)', text: 'Sipariş no, tarih, durum, müşteri, toplam, ödeme yöntemi ve şehir.', icon: <FileSpreadsheet size={16} />, run: orders, label: 'Siparişleri indir' },
    { id: 'cust', title: 'Müşteriler (CSV)', text: 'Üye ve misafir müşteriler, sipariş sayısı ve toplam harcama.', icon: <Users size={16} />, run: customers, label: 'Müşterileri indir' },
  ];
  return (
    <section className="card">
      <div className="card-h"><h2 className="card-t">Yedek ve dışa aktarma</h2><span className="card-m">veriler tarayıcında oluşturulur</span></div>
      <div className="sy-act">
        {items.map((i) => (
          <div key={i.id}>
            <b>{i.title}</b>
            <p>{i.text}</p>
            <button type="button" className="btn" onClick={i.run} disabled={!!busy}>{busy === i.id ? 'Hazırlanıyor…' : <>{i.icon} <Download size={14} /> {i.label}</>}</button>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ═══ 4. Sistem durumu ═══ */
const COUNTS: [string, string][] = [
  ['orders', 'Siparişler'],
  ['products', 'Ürünler'],
  ['coupons', 'Kuponlar'],
  ['posts', 'Blog yazıları'],
  ['pages', 'Sayfalar'],
  ['redirects', 'Yönlendirmeler'],
  ['site_content', 'Site içeriği'],
  ['track_links', 'Takip bağlantıları'],
  ['message_templates', 'Mesaj şablonları'],
  ['audit_log', 'İşlem kayıtları'],
];
type Check = { name: string; ok: boolean; detail?: string };
type Health = { db: { ok: boolean; ms: number; msg?: string }; counts: [string, number | null][]; env: Check[] | null };

function Status() {
  const [h, setH] = useState<Health | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setBusy(true);
    const sb = supabase();
    const t0 = performance.now();
    const ping = await sb.from('shop_settings').select('key').limit(1);
    const ms = Math.round(performance.now() - t0);
    const counts = await Promise.all(COUNTS.map(async ([t]): Promise<[string, number | null]> => {
      const r = await sb.from(t).select('*', { count: 'exact', head: true });
      return [t, r.error ? null : (r.count ?? 0)];
    }));
    let env: Check[] | null = null;
    try {
      const { data } = await sb.auth.getSession();
      const token = data.session?.access_token;
      const res = await fetch('/api/durum', { headers: token ? { Authorization: `Bearer ${token}` } : undefined, cache: 'no-store' });
      if (res.ok) {
        const j = (await res.json()) as { checks?: Check[] };
        if (Array.isArray(j.checks)) env = j.checks;
      }
    } catch {
      env = null;
    }
    setH({ db: { ok: !ping.error, ms, msg: ping.error?.message }, counts, env });
    setBusy(false);
  }, []);
  useEffect(() => {
    const t = setTimeout(load, 0);
    return () => clearTimeout(t);
  }, [load]);

  if (!h) return <Loading />;
  return (
    <div style={{ opacity: busy ? 0.6 : 1 }}>
      <div style={{ marginBottom: 14 }}><button type="button" className="btn ghost" onClick={load} disabled={busy}><RefreshCw size={14} /> Yeniden kontrol et</button></div>
      <div className="grid2 even">
        <section className="card">
          <div className="card-h"><h2 className="card-t">Bağlantılar</h2></div>
          <div className="attn"><span className={`sy-dot ${h.db.ok ? 'ok' : 'bad'}`} /><div><b>Supabase veritabanı</b><span className="m">{h.db.ok ? `Bağlantı sağlıklı · ${h.db.ms} ms` : `Bağlanılamadı: ${h.db.msg}`}</span></div></div>
          {h.env === null ? (
            <div className="attn"><span className="sy-dot" /><div><b>Ortam kontrolü</b><span className="m">Henüz kullanılamıyor</span></div></div>
          ) : h.env.length === 0 ? (
            <div className="attn"><span className="sy-dot" /><div><b>Ortam kontrolü</b><span className="m">Kontrol sonucu boş</span></div></div>
          ) : (
            h.env.map((c) => (
              <div className="attn" key={c.name}><span className={`sy-dot ${c.ok ? 'ok' : 'bad'}`} /><div><b>{c.name}</b>{c.detail && <span className="m">{c.detail}</span>}</div></div>
            ))
          )}
        </section>
        <section className="card">
          <div className="card-h"><h2 className="card-t">Tablo satır sayıları</h2></div>
          <div className="tbl">
            {h.counts.map(([t, n]) => (
              <div className="tr" key={t} style={{ gridTemplateColumns: 'minmax(0,1fr) auto', padding: '10px 20px' }}>
                <span>{COUNTS.find((c) => c[0] === t)?.[1]} <span className="cell-muted mono">{t}</span></span>
                <span className="num">{n === null ? 'okunamadı' : n.toLocaleString('tr-TR')}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

export default function System() {
  const menu = useMenu();
  const { show: toast, node } = useToast();
  const [tab, setTab] = useState<Tab>('ekip');
  return (
    <>
      <TopBar title="Kullanıcılar ve kayıtlar" sub="Ekip, işlem geçmişi, yedek ve sistem durumu" onMenu={menu} />
      <div className="adm-scroll">
        <div className="adm-inner">
          <div className="tabs" style={{ marginBottom: 16 }}>
            {TABS.map(([k, l]) => <button key={k} type="button" className={`tab${tab === k ? ' on' : ''}`} onClick={() => setTab(k)}>{l}</button>)}
          </div>
          {tab === 'ekip' && <Team toast={toast} />}
          {tab === 'kayit' && <Audit />}
          {tab === 'yedek' && <Backup toast={toast} />}
          {tab === 'durum' && <Status />}
        </div>
      </div>
      {node}
    </>
  );
}
