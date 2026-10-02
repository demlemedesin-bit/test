'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { BadgePercent, Dices, Pencil, Plus, Search, Ticket, Trash2, Wallet } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { dt, tl } from '@/lib/admin';
import { useMenu } from '@/components/admin/Shell';
import { Confirm, Empty, Field, Kpi, Loading, Panel, TopBar, useToast } from '@/components/admin/ui';

type Kind = 'percent' | 'fixed' | 'free_shipping';
type Coupon = {
  id: string;
  code: string | null;
  name: string;
  kind: Kind;
  value: number;
  min_total: number;
  max_discount: number | null;
  auto: boolean;
  starts_at: string | null;
  ends_at: string | null;
  usage_limit: number | null;
  per_email_limit: number | null;
  used_count: number;
  product_slugs: string[];
  active: boolean;
  created_at: string;
};
type Redemption = { id: string; coupon_id: string; order_no: string; email: string; amount: number; created_at: string };
type Prod = { slug: string; name: string };
type Form = {
  id?: string;
  code: string;
  name: string;
  kind: Kind;
  value: string;
  min_total: string;
  max_discount: string;
  auto: boolean;
  starts_at: string;
  ends_at: string;
  usage_limit: string;
  per_email_limit: string;
  product_slugs: string[];
  active: boolean;
};

const KINDS: Record<Kind, string> = { percent: 'Yüzde indirim', fixed: 'Sabit tutar', free_shipping: 'Ücretsiz kargo' };
const TABS = [
  ['kupon', 'Kupon kodları'],
  ['otomatik', 'Otomatik kampanyalar'],
  ['gecmis', 'Kullanım geçmişi'],
] as const;
type Tab = (typeof TABS)[number][0];

const toLocal = (iso: string | null) => {
  if (!iso) return '';
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
};
const fromLocal = (s: string) => (s ? new Date(s).toISOString() : null);

const blank = (auto: boolean): Form => ({
  code: '', name: '', kind: 'percent', value: '', min_total: '0', max_discount: '', auto, starts_at: '', ends_at: '', usage_limit: '', per_email_limit: '', product_slugs: [], active: true,
});

function toForm(c: Coupon): Form {
  return {
    id: c.id,
    code: c.code ?? '',
    name: c.name,
    kind: c.kind,
    value: String(c.value),
    min_total: String(c.min_total),
    max_discount: c.max_discount == null ? '' : String(c.max_discount),
    auto: c.auto,
    starts_at: toLocal(c.starts_at),
    ends_at: toLocal(c.ends_at),
    usage_limit: c.usage_limit == null ? '' : String(c.usage_limit),
    per_email_limit: c.per_email_limit == null ? '' : String(c.per_email_limit),
    product_slugs: c.product_slugs ?? [],
    active: c.active,
  };
}

function status(c: Coupon): { label: string; tone: string } {
  const now = Date.now();
  if (!c.active) return { label: 'Pasif', tone: 'b-gray' };
  if (c.ends_at && new Date(c.ends_at).getTime() < now) return { label: 'Süresi doldu', tone: 'b-red' };
  if (c.usage_limit != null && c.used_count >= c.usage_limit) return { label: 'Limit doldu', tone: 'b-red' };
  if (c.starts_at && new Date(c.starts_at).getTime() > now) return { label: 'Planlandı', tone: 'b-blue' };
  return { label: 'Aktif', tone: 'b-green' };
}

const valueText = (c: Coupon) => (c.kind === 'percent' ? `%${Number(c.value)}` : c.kind === 'fixed' ? tl(Number(c.value)) : 'Ücretsiz kargo');

function genCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const a = new Uint32Array(8);
  crypto.getRandomValues(a);
  return Array.from(a, (n) => chars[n % chars.length]).join('');
}

function validate(f: Form): string | null {
  if (!f.name.trim()) return 'Kampanya adı gerekli.';
  if (!f.auto && !/^[A-Z0-9_-]{3,32}$/.test(f.code)) return 'Kod 3-32 karakter olmalı; yalnızca büyük harf, rakam, _ ve - kullanılabilir.';
  if (f.kind !== 'free_shipping') {
    const v = Number(f.value);
    if (f.value === '' || !Number.isFinite(v) || v <= 0) return 'İndirim değeri 0’dan büyük olmalı.';
    if (f.kind === 'percent' && v > 100) return 'Yüzde indirim 0-100 arasında olmalı.';
  }
  if (Number(f.min_total || 0) < 0) return 'Alt sepet tutarı negatif olamaz.';
  if (f.max_discount !== '' && Number(f.max_discount) < 0) return 'Üst indirim sınırı negatif olamaz.';
  if (f.usage_limit !== '' && (!Number.isInteger(Number(f.usage_limit)) || Number(f.usage_limit) < 0)) return 'Toplam kullanım limiti geçersiz.';
  if (f.per_email_limit !== '' && (!Number.isInteger(Number(f.per_email_limit)) || Number(f.per_email_limit) < 1)) return 'Kişi başı limit en az 1 olmalı.';
  if (f.starts_at && f.ends_at && new Date(f.ends_at) <= new Date(f.starts_at)) return 'Bitiş tarihi başlangıçtan sonra olmalı.';
  return null;
}

export default function Campaigns() {
  const menu = useMenu();
  const { show, node } = useToast();
  const [list, setList] = useState<Coupon[] | null>(null);
  const [reds, setReds] = useState<Redemption[]>([]);
  const [prods, setProds] = useState<Prod[]>([]);
  const [err, setErr] = useState('');
  const [tab, setTab] = useState<Tab>('kupon');
  const [q, setQ] = useState('');
  const [edit, setEdit] = useState<Form | null>(null);
  const [del, setDel] = useState<Coupon | null>(null);
  const [busy, setBusy] = useState(false);
  const [pq, setPq] = useState('');

  const load = useCallback(async () => {
    const sb = supabase();
    const [c, r, p] = await Promise.all([
      sb.from('coupons').select('*').order('created_at', { ascending: false }),
      sb.from('coupon_redemptions').select('*').order('created_at', { ascending: false }).limit(1000),
      sb.from('products').select('slug,name').order('name'),
    ]);
    if (c.error) return setErr('Kampanyalar yüklenemedi. Sayfayı yenile.');
    setErr('');
    setList((c.data ?? []) as Coupon[]);
    setReds((r.data ?? []) as Redemption[]);
    setProds((p.data ?? []) as Prod[]);
  }, []);
  useEffect(() => {
    const t = setTimeout(load, 0);
    return () => clearTimeout(t);
  }, [load]);

  const byId = useMemo(() => new Map((list ?? []).map((c) => [c.id, c])), [list]);

  const shown = useMemo(() => {
    const k = q.trim().toLocaleLowerCase('tr-TR');
    return (list ?? []).filter((c) => (tab === 'otomatik' ? c.auto : !c.auto) && (!k || [c.name, c.code ?? ''].some((v) => v.toLocaleLowerCase('tr-TR').includes(k))));
  }, [list, tab, q]);

  const shownReds = useMemo(() => {
    const k = q.trim().toLocaleLowerCase('tr-TR');
    return reds.filter((r) => {
      const c = byId.get(r.coupon_id);
      return !k || [r.order_no, r.email, c?.name ?? '', c?.code ?? ''].some((v) => v.toLocaleLowerCase('tr-TR').includes(k));
    });
  }, [reds, q, byId]);

  const activeCount = (list ?? []).filter((c) => status(c).label === 'Aktif').length;
  const totalUse = (list ?? []).reduce((n, c) => n + c.used_count, 0);
  const totalDisc = reds.reduce((n, r) => n + Number(r.amount), 0);

  async function save() {
    if (!edit) return;
    const bad = validate(edit);
    if (bad) return show(bad, true);
    const row = {
      code: edit.auto ? null : edit.code.trim(),
      name: edit.name.trim(),
      kind: edit.kind,
      value: edit.kind === 'free_shipping' ? 0 : Number(edit.value),
      min_total: Number(edit.min_total || 0),
      max_discount: edit.kind === 'percent' && edit.max_discount !== '' ? Number(edit.max_discount) : null,
      auto: edit.auto,
      starts_at: fromLocal(edit.starts_at),
      ends_at: fromLocal(edit.ends_at),
      usage_limit: edit.usage_limit === '' ? null : Number(edit.usage_limit),
      per_email_limit: edit.per_email_limit === '' ? null : Number(edit.per_email_limit),
      product_slugs: edit.product_slugs,
      active: edit.active,
    };
    setBusy(true);
    const sb = supabase();
    const { error } = edit.id ? await sb.from('coupons').update(row).eq('id', edit.id) : await sb.from('coupons').insert(row);
    setBusy(false);
    if (error) {
      show(error.code === '23505' ? 'Bu kod zaten kullanılıyor.' : 'Kaydedilemedi: ' + error.message, true);
      return;
    }
    show(edit.id ? 'Kampanya güncellendi' : 'Kampanya oluşturuldu');
    setEdit(null);
    load();
  }

  async function toggle(c: Coupon) {
    const { error } = await supabase().from('coupons').update({ active: !c.active }).eq('id', c.id);
    if (error) return show('Durum değiştirilemedi.', true);
    show(c.active ? 'Kampanya pasifleştirildi' : 'Kampanya aktifleştirildi');
    load();
  }

  async function remove() {
    if (!del) return;
    setBusy(true);
    const { error } = await supabase().from('coupons').delete().eq('id', del.id);
    setBusy(false);
    setDel(null);
    if (error) return show('Silinemedi: ' + error.message, true);
    show('Kampanya silindi');
    load();
  }

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setEdit((f) => (f ? { ...f, [k]: v } : f));
  const toggleSlug = (s: string) => setEdit((f) => (f ? { ...f, product_slugs: f.product_slugs.includes(s) ? f.product_slugs.filter((x) => x !== s) : [...f.product_slugs, s] } : f));

  const pk = pq.trim().toLocaleLowerCase('tr-TR');
  const shownProds = prods.filter((p) => !pk || p.name.toLocaleLowerCase('tr-TR').includes(pk) || p.slug.includes(pk));
  const grid = 'minmax(0,1.5fr) 130px 110px 130px 110px 110px';

  return (
    <>
      <TopBar title="Kampanya ve indirim" sub={list ? `${list.length} kampanya` : ''} onMenu={menu}>
        <button className="btn" onClick={() => setEdit(blank(tab === 'otomatik'))}>
          <Plus size={15} /> Yeni kampanya
        </button>
      </TopBar>
      <div className="adm-scroll">
        <div className="adm-inner">
          {err && <div className="alert err">{err}</div>}
          {list && (
            <div className="kpis">
              <Kpi label="Aktif kampanya" value={String(activeCount)} tone="green" icon={<BadgePercent size={17} />} />
              <Kpi label="Toplam kullanım" value={String(totalUse)} tone="blue" icon={<Ticket size={17} />} />
              <Kpi label="Verilen indirim" value={tl(totalDisc)} sub="kullanım geçmişine göre" tone="amber" icon={<Wallet size={17} />} />
            </div>
          )}
          <div className="toolbar">
            <div className="search">
              <Search size={15} />
              <input className="inp" placeholder={tab === 'gecmis' ? 'Sipariş no, e-posta, kampanya…' : 'Ad veya kod ara…'} value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
            <div className="tabs">
              {TABS.map(([k, l]) => (
                <button key={k} className={`tab${tab === k ? ' on' : ''}`} onClick={() => setTab(k)}>{l}</button>
              ))}
            </div>
          </div>
          <div className="card">
            {!list ? (
              <Loading />
            ) : tab === 'gecmis' ? (
              shownReds.length === 0 ? (
                <Empty title="Kullanım kaydı yok" text="Kuponlar siparişlerde kullanıldıkça burada listelenir." icon={<Ticket size={30} strokeWidth={1.5} />} />
              ) : (
                <div className="tbl">
                  <div className="tr hd" style={{ gridTemplateColumns: '130px minmax(0,1.3fr) minmax(0,1.3fr) 100px 110px' }}>
                    <span>Tarih</span><span>Kampanya</span><span>E-posta</span><span>Sipariş</span><span>İndirim</span>
                  </div>
                  {shownReds.map((r) => {
                    const c = byId.get(r.coupon_id);
                    return (
                      <div className="tr" key={r.id} style={{ gridTemplateColumns: '130px minmax(0,1.3fr) minmax(0,1.3fr) 100px 110px' }}>
                        <span className="cell-muted">{dt(r.created_at, true)}</span>
                        <span className="cell-clip"><b className="cell-strong">{c?.name ?? '—'}</b>{c?.code && <> <span className="mono cell-muted">{c.code}</span></>}</span>
                        <span className="cell-clip cell-muted hide-m">{r.email}</span>
                        <span className="mono hide-m">{r.order_no}</span>
                        <span className="num">{tl(Number(r.amount))}</span>
                      </div>
                    );
                  })}
                </div>
              )
            ) : shown.length === 0 ? (
              <Empty title={list.some((c) => (tab === 'otomatik') === c.auto) ? 'Eşleşen kampanya yok' : tab === 'otomatik' ? 'Henüz otomatik kampanya yok' : 'Henüz kupon kodu yok'} text="“Yeni kampanya” ile ekleyebilirsin." icon={<BadgePercent size={30} strokeWidth={1.5} />} />
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <div className="tbl">
                  <div className="tr hd" style={{ gridTemplateColumns: grid }}>
                    <span>{tab === 'otomatik' ? 'Kampanya' : 'Kupon'}</span><span>İndirim</span><span>Alt sepet</span><span>Geçerlilik</span><span>Kullanım</span><span />
                  </div>
                  {shown.map((c) => {
                    const st = status(c);
                    return (
                      <div className="tr" key={c.id} style={{ gridTemplateColumns: grid, opacity: c.active ? 1 : 0.6 }}>
                        <span className="cell-clip">
                          <b className="cell-strong">{c.name}</b> <span className={`badge plain ${st.tone}`}>{st.label}</span>
                          <br />
                          <span className="cell-muted">{c.code ? <span className="mono">{c.code}</span> : 'Kodsuz'}{c.product_slugs.length > 0 && ` · ${c.product_slugs.length} ürün`}</span>
                        </span>
                        <span>{valueText(c)}</span>
                        <span className="cell-muted hide-m">{Number(c.min_total) > 0 ? tl(Number(c.min_total)) : '—'}</span>
                        <span className="cell-muted hide-m">{c.starts_at || c.ends_at ? `${dt(c.starts_at)} – ${dt(c.ends_at)}` : 'Süresiz'}</span>
                        <span className="num hide-m">{c.used_count}{c.usage_limit != null && ` / ${c.usage_limit}`}</span>
                        <span style={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                          <button className="icon-btn" title={c.active ? 'Pasifleştir' : 'Aktifleştir'} onClick={() => toggle(c)}>
                            <span className={`badge plain ${c.active ? 'b-green' : 'b-gray'}`} style={{ padding: '1px 7px', fontSize: 10.5 }}>{c.active ? 'aktif' : 'pasif'}</span>
                          </button>
                          <button className="icon-btn" title="Düzenle" onClick={() => setEdit(toForm(c))}><Pencil size={15} /></button>
                          <button className="icon-btn" title="Sil" onClick={() => setDel(c)}><Trash2 size={15} /></button>
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {edit && (
        <Panel
          title={edit.id ? 'Kampanyayı düzenle' : edit.auto ? 'Yeni otomatik kampanya' : 'Yeni kupon'}
          onClose={() => setEdit(null)}
          footer={
            <>
              <button className="btn ghost" onClick={() => setEdit(null)}>Vazgeç</button>
              <button className="btn" onClick={save} disabled={busy}>{busy ? 'Kaydediliyor…' : 'Kaydet'}</button>
            </>
          }
        >
          <div className="stack">
            <label className="chk">
              <input type="checkbox" checked={edit.auto} onChange={(e) => set('auto', e.target.checked)} /> Otomatik kampanya (kod gerekmez, sepet koşulu sağlanınca uygulanır)
            </label>
            <Field label="Kampanya adı">
              <input className="inp" value={edit.name} onChange={(e) => set('name', e.target.value)} placeholder="Örn. Hoş geldin indirimi" />
            </Field>
            {!edit.auto && (
              <Field label="Kupon kodu" hint="3-32 karakter: büyük harf, rakam, _ ve -">
                <div style={{ display: 'flex', gap: 8 }}>
                  <input className="inp mono" value={edit.code} onChange={(e) => set('code', e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, ''))} maxLength={32} placeholder="YAZ25" />
                  <button type="button" className="btn ghost" onClick={() => set('code', genCode())}><Dices size={15} /> Üret</button>
                </div>
              </Field>
            )}
            <div className="row2">
              <Field label="İndirim türü">
                <select className="inp" value={edit.kind} onChange={(e) => set('kind', e.target.value as Kind)}>
                  {(Object.keys(KINDS) as Kind[]).map((k) => <option key={k} value={k}>{KINDS[k]}</option>)}
                </select>
              </Field>
              {edit.kind !== 'free_shipping' && (
                <Field label={edit.kind === 'percent' ? 'Yüzde (0-100)' : 'Tutar (₺)'}>
                  <input className="inp" type="number" min={0} max={edit.kind === 'percent' ? 100 : undefined} step="any" value={edit.value} onChange={(e) => set('value', e.target.value)} />
                </Field>
              )}
            </div>
            <div className="row2">
              <Field label="Alt sepet tutarı (₺)" hint="0 = koşul yok">
                <input className="inp" type="number" min={0} step="any" value={edit.min_total} onChange={(e) => set('min_total', e.target.value)} />
              </Field>
              {edit.kind === 'percent' && (
                <Field label="En çok indirim (₺)" hint="Boş = sınırsız">
                  <input className="inp" type="number" min={0} step="any" value={edit.max_discount} onChange={(e) => set('max_discount', e.target.value)} />
                </Field>
              )}
            </div>
            <div className="row2">
              <Field label="Başlangıç">
                <input className="inp" type="datetime-local" value={edit.starts_at} onChange={(e) => set('starts_at', e.target.value)} />
              </Field>
              <Field label="Bitiş">
                <input className="inp" type="datetime-local" value={edit.ends_at} onChange={(e) => set('ends_at', e.target.value)} />
              </Field>
            </div>
            <div className="row2">
              <Field label="Toplam kullanım limiti" hint="Boş = sınırsız">
                <input className="inp" type="number" min={0} step={1} value={edit.usage_limit} onChange={(e) => set('usage_limit', e.target.value)} />
              </Field>
              <Field label="Kişi başı limit" hint="Boş = sınırsız">
                <input className="inp" type="number" min={1} step={1} value={edit.per_email_limit} onChange={(e) => set('per_email_limit', e.target.value)} />
              </Field>
            </div>
            <div className="fld">
              <span className="lbl">Geçerli ürünler {edit.product_slugs.length > 0 ? `(${edit.product_slugs.length} seçili)` : '(boş = tüm sepet)'}</span>
              <input className="inp" placeholder="Ürün ara…" value={pq} onChange={(e) => setPq(e.target.value)} />
              <div style={{ maxHeight: 200, overflowY: 'auto', marginTop: 8, border: '1px solid var(--bdr)', borderRadius: 8, padding: '4px 12px' }}>
                {shownProds.length === 0 ? (
                  <span className="hint">Ürün bulunamadı.</span>
                ) : (
                  shownProds.map((p) => (
                    <label className="chk" key={p.slug}>
                      <input type="checkbox" checked={edit.product_slugs.includes(p.slug)} onChange={() => toggleSlug(p.slug)} /> {p.name}
                    </label>
                  ))
                )}
              </div>
              {edit.product_slugs.length > 0 && (
                <button type="button" className="link-btn" style={{ marginTop: 6 }} onClick={() => set('product_slugs', [])}>Seçimi temizle</button>
              )}
            </div>
            <label className="chk">
              <input type="checkbox" checked={edit.active} onChange={(e) => set('active', e.target.checked)} /> Aktif
            </label>
          </div>
        </Panel>
      )}

      {del && <Confirm title="Kampanya silinsin mi?" text={`“${del.name}” ve kullanım geçmişi kalıcı olarak silinecek.`} confirmText="Sil" onConfirm={remove} onCancel={() => setDel(null)} busy={busy} />}
      {node}
    </>
  );
}
