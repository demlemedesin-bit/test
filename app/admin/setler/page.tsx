'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, Trash2, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { refreshSite } from '@/lib/admin';
import { parseSlots, type SetSlot } from '@/lib/setsConst';
import { useMenu } from '@/components/admin/Shell';
import { Empty, Field, Loading, TopBar, useToast } from '@/components/admin/ui';
import { PageHero } from '@/components/admin/PageHero';

type Row = { slug: string; name: string; subtitle: string; price: number; slots: SetSlot[]; active: boolean; sort: number };
type Prod = { slug: string; name: string; price: number };
const tl = (n: number) => '₺' + n.toLocaleString('tr-TR', { maximumFractionDigits: 2 });
const slugify = (s: string) => s.toLocaleLowerCase('tr').replace(/ç/g, 'c').replace(/ğ/g, 'g').replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ş/g, 's').replace(/ü/g, 'u').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);
const blank = (): Row => ({ slug: '', name: '', subtitle: '', price: 0, slots: [{ label: '', slugs: [], qty: 1 }], active: false, sort: 0 });

export default function Setler() {
  const menu = useMenu();
  const { show, node } = useToast();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [prods, setProds] = useState<Prod[]>([]);
  const [edit, setEdit] = useState<(Row & { isNew?: boolean }) | null>(null);
  const [delSlug, setDelSlug] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const [s, p] = await Promise.all([
      supabase().from('product_sets').select('slug,name,subtitle,price,slots,active,sort').order('sort', { ascending: true }),
      supabase().from('products').select('slug,name,price').eq('soon', false).order('sort', { ascending: true }),
    ]);
    if (s.error) show('Setler okunamadı: ' + s.error.message, true);
    setRows(((s.data ?? []) as Row[]).map((r) => ({ ...r, price: Number(r.price), slots: parseSlots(r.slots) })));
    setProds(((p.data ?? []) as { slug: string; name: string; price: number | string }[]).map((x) => ({ ...x, price: Number(x.price) })));
  }, [show]);
  useEffect(() => {
    const t = setTimeout(load, 0);
    return () => clearTimeout(t);
  }, [load]);

  const by = useMemo(() => new Map(prods.map((p) => [p.slug, p])), [prods]);
  const normalOf = (r: Row) => r.slots.reduce((n, s) => n + (s.slugs.length ? Math.min(...s.slugs.map((x) => by.get(x)?.price ?? Infinity)) * s.qty : 0), 0);

  async function save() {
    if (!edit) return;
    const r = edit;
    const name = r.name.trim();
    const slug = r.isNew ? slugify(name) : r.slug;
    const slots = r.slots.map((s) => ({ label: s.label.trim(), slugs: s.slugs, qty: Math.min(9, Math.max(1, Math.floor(s.qty) || 1)) })).filter((s) => s.slugs.length);
    if (name.length < 2 || !slug) return show('Set adı gerekli.', true);
    if (!slots.length) return show('En az bir ürün seç.', true);
    if (!(r.price > 0)) return show('Set fiyatı gerekli.', true);
    const normal = normalOf({ ...r, slots });
    if (r.active && Number.isFinite(normal) && r.price >= normal) return show(`Set fiyatı (${tl(r.price)}) ürünlerin toplamından (${tl(normal)}) düşük olmalı, yoksa indirim olmaz.`, true);
    setBusy(true);
    const body = { slug, name, subtitle: r.subtitle.trim(), price: r.price, slots, active: r.active, sort: Math.floor(r.sort) || 0 };
    const q = r.isNew ? supabase().from('product_sets').insert(body) : supabase().from('product_sets').update(body).eq('slug', r.slug);
    const { error } = await q;
    setBusy(false);
    if (error) return show(error.message.includes('duplicate') ? 'Bu adla bir set zaten var.' : 'Kaydedilemedi: ' + error.message, true);
    await refreshSite();
    show('Set kaydedildi');
    setEdit(null);
    load();
  }
  async function toggle(r: Row, on: boolean) {
    const { error } = await supabase().from('product_sets').update({ active: on }).eq('slug', r.slug);
    if (error) return show(error.message, true);
    await refreshSite();
    setRows((p) => (p ?? []).map((x) => (x.slug === r.slug ? { ...x, active: on } : x)));
    show(on ? 'Set satışa açıldı' : 'Set kapatıldı');
  }
  async function remove(slug: string) {
    const { error } = await supabase().from('product_sets').delete().eq('slug', slug);
    if (error) return show(error.message, true);
    await refreshSite();
    setDelSlug(null);
    setRows((p) => (p ?? []).filter((x) => x.slug !== slug));
    show('Set silindi');
  }

  const setSlot = (i: number, v: Partial<SetSlot>) => setEdit((e) => (e ? { ...e, slots: e.slots.map((s, j) => (j === i ? { ...s, ...v } : s)) } : e));

  return (
    <>
      <TopBar title="Setler" sub="Kampanyalı ürün setleri" onMenu={menu}>
        <button className="btn sm" onClick={() => setEdit({ ...blank(), isNew: true, sort: (rows?.length ?? 0) + 1 })}><Plus size={14} /> Yeni set</button>
      </TopBar>
      <div className="adm-scroll"><div className="adm-inner"><PageHero />
        <p style={{ fontSize: 13, opacity: 0.75, margin: '0 0 14px' }}>Müşteri setteki ürünleri sepete koyunca set indirimi sepette kendiliğinden uygulanır; kupon ve puan setlerle birlikte kullanılabilir. Setlerin nerede görüneceği (ana sayfa, sepet, Setler sayfası) Ayarlar → “Set ürünleri” bölümündedir. Yeni setler kapalı başlar.</p>
        {!rows ? <Loading /> : rows.length === 0 ? <Empty title="Henüz set yok" text="“Yeni set” ile ilk setini oluştur." /> : (
          <section className="card"><div className="card-b" style={{ padding: 0 }}>
            {rows.map((r) => {
              const normal = normalOf(r);
              const ok = Number.isFinite(normal);
              return (
                <div key={r.slug} style={{ display: 'flex', gap: 12, padding: '12px 16px', borderBottom: '1px solid var(--bdr)', alignItems: 'center', flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <b>{r.name}</b>
                    <div style={{ fontSize: 12.5, color: 'var(--tx3)' }}>{r.slots.map((s) => `${s.qty}× ${s.label || s.slugs.map((x) => by.get(x)?.name ?? x).join(' / ')}`).join(' + ')}</div>
                  </div>
                  <div style={{ fontSize: 13 }}>{ok && normal > r.price ? <s style={{ color: 'var(--tx3)' }}>{tl(normal)}</s> : null} <b>{tl(r.price)}</b>{ok && normal > r.price ? <span style={{ color: 'var(--tx3)' }}> · %{Math.round(((normal - r.price) / normal) * 1000) / 10}</span> : null}</div>
                  <label style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 13, cursor: 'pointer' }}><input type="checkbox" checked={r.active} onChange={(e) => toggle(r, e.target.checked)} /> {r.active ? 'Satışta' : 'Kapalı'}</label>
                  <button className="btn ghost sm" onClick={() => setEdit({ ...r })}>Düzenle</button>
                  {delSlug === r.slug ? (
                    <>
                      <button className="btn sm" style={{ background: 'var(--red, #c0392b)' }} onClick={() => remove(r.slug)}>Evet, sil</button>
                      <button className="btn ghost sm" onClick={() => setDelSlug(null)}>Vazgeç</button>
                    </>
                  ) : <button className="btn ghost sm" onClick={() => setDelSlug(r.slug)} aria-label="Sil"><Trash2 size={14} /></button>}
                </div>
              );
            })}
          </div></section>
        )}

        {edit && (
          <section className="card" style={{ marginTop: 18 }}>
            <div className="card-h"><h2 className="card-t">{edit.isNew ? 'Yeni set' : edit.name}</h2><button className="btn ghost sm" onClick={() => setEdit(null)}><X size={14} /> Kapat</button></div>
            <div className="card-b row2">
              <Field label="Set adı"><input className="inp" value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} placeholder="Örn. Misafirler Geldi" /></Field>
              <Field label="Set fiyatı (₺)"><input className="inp" inputMode="decimal" value={edit.price || ''} onChange={(e) => setEdit({ ...edit, price: Number(e.target.value.replace(',', '.')) || 0 })} /></Field>
              <Field label="Alt başlık (isteğe bağlı)"><input className="inp" value={edit.subtitle} onChange={(e) => setEdit({ ...edit, subtitle: e.target.value })} /></Field>
              <Field label="Sıra"><input className="inp" inputMode="numeric" value={edit.sort} onChange={(e) => setEdit({ ...edit, sort: Number(e.target.value) || 0 })} /></Field>
              <div className="fld" style={{ gridColumn: '1 / -1' }}>
                <span className="lbl">Setin içeriği</span>
                {edit.slots.map((s, i) => (
                  <div key={i} style={{ border: '1px solid var(--bdr)', borderRadius: 10, padding: 12, marginBottom: 10 }}>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
                      <input className="inp" style={{ flex: 1, minWidth: 160 }} placeholder="Yuva adı (örn. Şapka, Tote Bag)" value={s.label} onChange={(e) => setSlot(i, { label: e.target.value })} />
                      <input className="inp" style={{ width: 90 }} inputMode="numeric" title="Adet" value={s.qty} onChange={(e) => setSlot(i, { qty: Number(e.target.value) || 1 })} />
                      {edit.slots.length > 1 && <button className="btn ghost sm" onClick={() => setEdit({ ...edit, slots: edit.slots.filter((_, j) => j !== i) })}><Trash2 size={14} /></button>}
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 14px' }}>
                      {prods.map((p) => (
                        <label key={p.slug} style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 13, cursor: 'pointer' }}>
                          <input type="checkbox" checked={s.slugs.includes(p.slug)} onChange={(e) => setSlot(i, { slugs: e.target.checked ? [...s.slugs, p.slug] : s.slugs.filter((x) => x !== p.slug) })} />
                          {p.name} <span style={{ color: 'var(--tx3)' }}>{tl(p.price)}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
                <button className="btn ghost sm" onClick={() => setEdit({ ...edit, slots: [...edit.slots, { label: '', slugs: [], qty: 1 }] })}><Plus size={14} /> Yuva ekle</button>
                <small className="muted">Bir yuvada birden çok ürün işaretlersen müşteri aralarından seçer (örn. “herhangi bir tote”). Adet, o yuvadan kaç tane alınacağıdır (örn. kavanozda 3).</small>
              </div>
              {(() => {
                const n = normalOf(edit);
                return Number.isFinite(n) && n > 0 ? <p style={{ gridColumn: '1 / -1', margin: 0, fontSize: 13 }}>Ürünlerin normal toplamı <b>{tl(n)}</b>{edit.price > 0 && edit.price < n ? <> · indirim <b>{tl(n - edit.price)}</b> (%{Math.round(((n - edit.price) / n) * 1000) / 10})</> : null} <span style={{ color: 'var(--tx3)' }}>(her yuvada en ucuz ürün baz alınır)</span></p> : null;
              })()}
              <label className="chk" style={{ gridColumn: '1 / -1' }}><input type="checkbox" checked={edit.active} onChange={(e) => setEdit({ ...edit, active: e.target.checked })} /> Satışta (kapalıyken müşteri görmez ve indirim uygulanmaz)</label>
              <div style={{ gridColumn: '1 / -1' }}><button className="btn" disabled={busy} onClick={save}>{busy ? 'Kaydediliyor…' : 'Kaydet'}</button></div>
            </div>
          </section>
        )}
      </div></div>
      {node}
    </>
  );
}
