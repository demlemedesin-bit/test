'use client';

import { useCallback, useEffect, useState } from 'react';
import { ArrowDown, ArrowUp, ImagePlus, Package, Pencil, Plus, Trash2, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { refreshSite, slugify, tl, uploadImage, type AdminProduct, type Color } from '@/lib/admin';
import { useMenu } from '@/components/admin/Shell';
import { Confirm, Empty, Field, Loading, Panel, TopBar, useToast } from '@/components/admin/ui';

type Draft = {
  isNew: boolean;
  slug: string;
  slugTouched: boolean;
  name: string;
  category: string;
  shop_cat: AdminProduct['shop_cat'];
  price: string;
  stock: string;
  soon: boolean;
  active: boolean;
  badge: string;
  desc: string;
  sizes: string;
  colors: (Color & { isNew?: boolean })[];
  thumb: string;
  details: { t: string; v: string }[];
  data: AdminProduct['data'];
  sort: number;
};

const SHOP_CATS: [AdminProduct['shop_cat'], string][] = [
  ['sofra', 'Ev & Sofra'],
  ['giyim', 'Giyim'],
  ['aksesuar', 'Aksesuar'],
];

const blank = (sort: number): Draft => ({
  isNew: true, slug: '', slugTouched: false, name: '', category: 'Ev & Sofra', shop_cat: 'sofra', price: '', stock: '', soon: false, active: true,
  badge: '', desc: '', sizes: '', colors: [{ key: '', name: '', hex: '#EDE6D6', img: '', isNew: true }], thumb: '',
  details: [{ t: 'Malzeme', v: '' }, { t: 'Kargo & iade', v: 'Siparişin 2–4 iş gününde kargoda. 14 gün içinde koşulsuz iade.' }], data: {}, sort,
});

const toDraft = (p: AdminProduct): Draft => ({
  isNew: false, slug: p.slug, slugTouched: true, name: p.name, category: p.category, shop_cat: p.shop_cat, price: String(p.price), stock: p.stock == null ? '' : String(p.stock),
  soon: p.soon, active: p.active, badge: p.data?.badge ?? '', desc: p.data?.desc ?? '', sizes: (p.sizes ?? []).join(', '),
  colors: (p.colors ?? []).map((c) => ({ ...c, hex: c.hex || '#EDE6D6', img: c.img || '' })), thumb: p.thumb ?? '',
  details: (p.data?.details ?? []).map(([t, v]) => ({ t, v })), data: p.data ?? {}, sort: p.sort,
});

function Editor({ init, onClose, onSaved, toast }: { init: Draft; onClose: () => void; onSaved: () => void; toast: (t: string, e?: boolean) => void }) {
  const [d, setD] = useState<Draft>(init);
  const [busy, setBusy] = useState(false);
  const [up, setUp] = useState<string | null>(null);
  const [errs, setErrs] = useState<string[]>([]);
  const [ask, setAsk] = useState(false);
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((s) => ({ ...s, [k]: v }));

  const setColor = (i: number, patch: Partial<Color>) => setD((s) => ({ ...s, colors: s.colors.map((c, j) => (j === i ? { ...c, ...patch } : c)) }));

  async function pick(file: File | undefined, target: 'thumb' | number) {
    if (!file) return;
    if (!/^image\//.test(file.type)) return toast('Yalnızca görsel dosyası yükleyebilirsin.', true);
    setUp(String(target));
    try {
      const url = await uploadImage(file, d.slug || slugify(d.name) || 'yeni');
      if (target === 'thumb') set('thumb', url);
      else setColor(target, { img: url });
    } catch {
      toast('Görsel yüklenemedi. Boyutu 5 MB altında bir görsel dene.', true);
    }
    setUp(null);
  }

  async function save() {
    const e: string[] = [];
    const slug = d.slug.trim();
    const price = Number(d.price.replace(',', '.'));
    const stock = d.stock.trim() === '' ? null : Number(d.stock);
    if (d.name.trim().length < 2) e.push('Ürün adı gerekli.');
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) e.push('Adres (slug) yalnızca küçük harf, rakam ve tire içerebilir.');
    if (d.price.trim() === '' || isNaN(price) || price < 0) e.push('Geçerli bir fiyat gir.');
    if (stock !== null && (!Number.isInteger(stock) || stock < 0)) e.push('Stok boş (sınırsız) ya da 0 veya daha büyük bir tam sayı olmalı.');
    if (!d.colors.length || d.colors.some((c) => !c.name.trim())) e.push('En az bir renk/seçenek ve her birine bir ad gerekli.');
    else if (d.colors.some((c) => !c.img)) e.push('Her renk için bir görsel yükle.');
    if (e.length) return setErrs(e);
    setErrs([]);

    // Renk anahtarları: mevcutlar sabit kalır (sepetlerde kullanılıyor), yeniler addan üretilir.
    const used = new Set(d.colors.filter((c) => c.key).map((c) => c.key));
    const colors: Color[] = d.colors.map((c) => {
      let key = c.key;
      if (!key) {
        const base = slugify(c.name) || 'secenek';
        key = base;
        let n = 2;
        while (used.has(key)) key = `${base}-${n++}`;
        used.add(key);
      }
      return { key, name: c.name.trim(), hex: c.hex, img: c.img };
    });
    const sizes = d.sizes.split(',').map((s) => s.trim()).filter(Boolean);
    if (new Set(sizes).size !== sizes.length) return setErrs(['Beden listesinde aynı değer iki kez yazılmış.']);

    const data = {
      ...d.data,
      desc: d.desc.trim(),
      badge: d.badge.trim() || undefined,
      details: d.details.filter((x) => x.t.trim() && x.v.trim()).map((x) => [x.t.trim(), x.v.trim()]),
      ...(sizes.length ? { size_label: d.data.size_label || 'Beden' } : {}),
    };
    const row = {
      slug, name: d.name.trim(), category: d.category.trim() || 'Ürün', shop_cat: d.shop_cat, price, stock, colors, sizes, soon: d.soon, active: d.active,
      thumb: d.thumb || colors[0].img, data, sort: d.sort,
    };
    setBusy(true);
    const { error } = d.isNew ? await supabase().from('products').insert(row) : await supabase().from('products').update(row).eq('slug', init.slug);
    if (error) {
      setBusy(false);
      return setErrs([error.code === '23505' ? 'Bu adresle (slug) başka bir ürün var.' : 'Kaydedilemedi: ' + error.message]);
    }
    await refreshSite();
    setBusy(false);
    toast(d.isNew ? 'Ürün eklendi, sitede yayında' : 'Kaydedildi, site güncellendi');
    onSaved();
    onClose();
  }

  async function remove() {
    setBusy(true);
    const { error } = await supabase().from('products').delete().eq('slug', init.slug);
    if (error) {
      setBusy(false);
      setAsk(false);
      return toast('Silinemedi.', true);
    }
    await refreshSite();
    setBusy(false);
    toast('Ürün silindi');
    onSaved();
    onClose();
  }

  return (
    <Panel
      wide
      onClose={onClose}
      title={d.isNew ? 'Yeni ürün' : d.name || 'Ürünü düzenle'}
      footer={
        <>
          {!d.isNew && (
            <button className="btn danger" style={{ marginRight: 'auto' }} onClick={() => setAsk(true)} disabled={busy}>
              <Trash2 size={15} /> Sil
            </button>
          )}
          <button className="btn ghost" onClick={onClose}>Vazgeç</button>
          <button className="btn" onClick={save} disabled={busy || up !== null}>
            {busy ? 'Kaydediliyor…' : 'Kaydet'}
          </button>
        </>
      }
    >
      {errs.length > 0 && (
        <div className="alert err">
          {errs.map((x) => (<div key={x}>{x}</div>))}
        </div>
      )}

      <div className="sec">
        <p className="sec-t">Temel bilgiler</p>
        <Field label="Ürün adı">
          <input
            className="inp"
            value={d.name}
            onChange={(e) => setD((s) => ({ ...s, name: e.target.value, slug: s.slugTouched ? s.slug : slugify(e.target.value) }))}
          />
        </Field>
        <Field label="Adres (slug)" hint={d.isNew ? 'Ürün sayfası: /urun/' + (d.slug || '…') : 'Yayındaki ürünün adresi değiştirilemez.'}>
          <input className="inp" value={d.slug} disabled={!d.isNew} onChange={(e) => setD((s) => ({ ...s, slug: slugify(e.target.value), slugTouched: true }))} />
        </Field>
        <div className="row2">
          <Field label="Fiyat (₺)">
            <input className="inp" inputMode="decimal" value={d.price} onChange={(e) => set('price', e.target.value)} placeholder="650" />
          </Field>
          <Field label="Stok" hint="Boş bırakırsan sınırsız. 0 = tükendi.">
            <input className="inp" inputMode="numeric" value={d.stock} onChange={(e) => set('stock', e.target.value)} placeholder="Sınırsız" />
          </Field>
        </div>
        <div className="row2">
          <Field label="Vitrin kategorisi" hint="Ana sayfadaki mağaza sekmesi">
            <select className="inp" value={d.shop_cat} onChange={(e) => set('shop_cat', e.target.value as AdminProduct['shop_cat'])}>
              {SHOP_CATS.map(([k, l]) => (<option key={k} value={k}>{l}</option>))}
            </select>
          </Field>
          <Field label="Ürün sayfasındaki kategori etiketi">
            <input className="inp" value={d.category} onChange={(e) => set('category', e.target.value)} />
          </Field>
        </div>
        <div className="row2">
          <label className="chk"><input type="checkbox" checked={d.active} onChange={(e) => set('active', e.target.checked)} /> Sitede yayında</label>
          <label className="chk"><input type="checkbox" checked={d.soon} onChange={(e) => set('soon', e.target.checked)} /> “Yakında” (satışa kapalı)</label>
        </div>
      </div>

      <div className="sec">
        <p className="sec-t">Açıklama</p>
        <Field label="Kısa açıklama"><textarea className="inp" value={d.desc} onChange={(e) => set('desc', e.target.value)} /></Field>
        <Field label="Rozet (isteğe bağlı)" hint="Örn. “Atölyede üretilir”"><input className="inp" value={d.badge} onChange={(e) => set('badge', e.target.value)} /></Field>
      </div>

      <div className="sec">
        <p className="sec-t">Renkler / seçenekler ve görseller</p>
        <div className="colors">
          {d.colors.map((c, i) => (
            <div className="color-row" key={i}>
              <label className="up" title="Görsel yükle">
                {c.img ? <img src={c.img} alt="" /> : up === String(i) ? <span className="spin" /> : <ImagePlus size={20} />}
                <input type="file" accept="image/*" onChange={(e) => { pick(e.target.files?.[0], i); e.target.value = ''; }} />
              </label>
              <input className="inp" placeholder="Renk adı (örn. Krem)" value={c.name} onChange={(e) => setColor(i, { name: e.target.value })} />
              <input className="hex" type="color" value={c.hex} onChange={(e) => setColor(i, { hex: e.target.value })} aria-label="Renk" />
              <button type="button" className="icon-btn" onClick={() => set('colors', d.colors.filter((_, j) => j !== i))} disabled={d.colors.length === 1} aria-label="Kaldır">
                <X size={16} />
              </button>
            </div>
          ))}
        </div>
        <button type="button" className="btn ghost sm" style={{ marginTop: 10 }} onClick={() => set('colors', [...d.colors, { key: '', name: '', hex: '#EDE6D6', img: '', isNew: true }])}>
          <Plus size={14} /> Renk ekle
        </button>
        <p className="hint" style={{ marginTop: 8 }}>Tek seçenekli ürünlerde tek satır bırak. Görseller otomatik küçültülüp WebP’ye çevrilir.</p>
      </div>

      <div className="sec">
        <p className="sec-t">Bedenler</p>
        <Field label="Beden listesi (virgülle)" hint="Örn. S, M, L, XL. Doluysa müşteri beden seçmeden sepete ekleyemez. Beden yoksa boş bırak.">
          <input className="inp" value={d.sizes} onChange={(e) => set('sizes', e.target.value)} placeholder="S, M, L, XL" />
        </Field>
      </div>

      <div className="sec">
        <p className="sec-t">Ana sayfa kart görseli</p>
        <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
          <label className="up" style={{ width: 84, height: 84 }}>
            {d.thumb || d.colors[0]?.img ? <img src={d.thumb || d.colors[0].img} alt="" /> : up === 'thumb' ? <span className="spin" /> : <ImagePlus size={22} />}
            <input type="file" accept="image/*" onChange={(e) => { pick(e.target.files?.[0], 'thumb'); e.target.value = ''; }} />
          </label>
          <p className="hint" style={{ margin: 0 }}>Boş bırakırsan ilk rengin görseli kullanılır.</p>
          {d.thumb && <button className="link-btn" onClick={() => set('thumb', '')}>Sıfırla</button>}
        </div>
      </div>

      <div className="sec">
        <p className="sec-t">Detaylar (ürün sayfasındaki açılır başlıklar)</p>
        {d.details.map((x, i) => (
          <div className="pair" key={i}>
            <input className="inp" placeholder="Başlık" value={x.t} onChange={(e) => set('details', d.details.map((y, j) => (j === i ? { ...y, t: e.target.value } : y)))} />
            <textarea className="inp" style={{ minHeight: 44 }} placeholder="Metin" value={x.v} onChange={(e) => set('details', d.details.map((y, j) => (j === i ? { ...y, v: e.target.value } : y)))} />
            <button type="button" className="icon-btn" onClick={() => set('details', d.details.filter((_, j) => j !== i))} aria-label="Kaldır"><X size={16} /></button>
          </div>
        ))}
        <button type="button" className="btn ghost sm" onClick={() => set('details', [...d.details, { t: '', v: '' }])}><Plus size={14} /> Satır ekle</button>
      </div>

      {ask && (
        <Confirm title="Ürün silinsin mi?" text="Ürün siteden kalkar. Geçmiş siparişler etkilenmez. Geçici olarak gizlemek için “Sitede yayında” kutusunu kapatman yeterli." confirmText="Evet, sil" busy={busy} onCancel={() => setAsk(false)} onConfirm={remove} />
      )}
    </Panel>
  );
}

export default function Products() {
  const menu = useMenu();
  const [list, setList] = useState<AdminProduct[] | null>(null);
  const [err, setErr] = useState('');
  const [edit, setEdit] = useState<Draft | null>(null);
  const { show, node } = useToast();

  const load = useCallback(async () => {
    const { data, error } = await supabase().from('products').select('*').order('sort').order('name');
    if (error) return setErr('Ürünler yüklenemedi. Sayfayı yenile.');
    setErr('');
    setList((data ?? []) as AdminProduct[]);
  }, []);
  useEffect(() => {
    const t = setTimeout(load, 0);
    return () => clearTimeout(t);
  }, [load]);

  async function move(i: number, dir: -1 | 1) {
    if (!list) return;
    const a = list[i];
    const b = list[i + dir];
    if (!b) return;
    // sıra numaraları eşitse bile yer değişsin
    const sa = dir === 1 ? b.sort + (a.sort === b.sort ? 1 : 0) : b.sort;
    const sb2 = a.sort;
    const r1 = await supabase().from('products').update({ sort: sa }).eq('slug', a.slug);
    const r2 = await supabase().from('products').update({ sort: sb2 }).eq('slug', b.slug);
    if (r1.error || r2.error) return show('Sıra değiştirilemedi.', true);
    await refreshSite();
    load();
  }

  async function toggle(p: AdminProduct) {
    const { error } = await supabase().from('products').update({ active: !p.active }).eq('slug', p.slug);
    if (error) return show('Güncellenemedi.', true);
    await refreshSite();
    show(p.active ? 'Ürün gizlendi' : 'Ürün yayında');
    load();
  }

  const nextSort = (list?.reduce((m, p) => Math.max(m, p.sort), 0) ?? 0) + 10;

  return (
    <>
      <TopBar title="Ürünler" sub={list ? `${list.length} ürün` : ''} onMenu={menu}>
        <button className="btn" onClick={() => setEdit(blank(nextSort))}><Plus size={15} /> Yeni ürün</button>
      </TopBar>
      <div className="adm-scroll">
        <div className="adm-inner">
          {err && <div className="alert err">{err}</div>}
          <div className="card">
            {!list ? (
              <Loading />
            ) : list.length === 0 ? (
              <Empty title="Henüz ürün yok" text="“Yeni ürün” ile ilk ürünü ekle." icon={<Package size={30} strokeWidth={1.5} />} />
            ) : (
              <div className="tbl">
                <div className="tr hd cols-prods"><span /><span>Ürün</span><span>Fiyat</span><span>Stok</span><span>Durum</span><span>Sıra</span><span /></div>
                {list.map((p, i) => (
                  <div className="tr cols-prods" key={p.slug}>
                    <img className="thumb" src={p.thumb || p.colors?.[0]?.img} alt="" />
                    <span className="cell-clip">
                      <b className="cell-strong">{p.name}</b>
                      <span className="cell-muted" style={{ display: 'block' }}>/urun/{p.slug}</span>
                    </span>
                    <span className="num">{tl(Number(p.price))}</span>
                    <span className="hide-m">
                      {p.stock == null ? <span className="cell-muted">Sınırsız</span> : p.stock === 0 ? <span className="badge b-red">Tükendi</span> : <span className={`num${p.stock <= 5 ? '' : ''}`} style={p.stock <= 5 ? { color: 'var(--amber)' } : undefined}>{p.stock} adet</span>}
                    </span>
                    <span className="hide-m">
                      <button className={`badge ${!p.active ? 'b-gray' : p.soon ? 'b-amber' : 'b-green'}`} style={{ border: 'none', cursor: 'pointer' }} onClick={() => toggle(p)} title="Yayın durumunu değiştir">
                        {!p.active ? 'Gizli' : p.soon ? 'Yakında' : 'Yayında'}
                      </button>
                    </span>
                    <span className="hide-m" style={{ display: 'flex', gap: 2 }}>
                      <button className="icon-btn" onClick={() => move(i, -1)} disabled={i === 0} aria-label="Yukarı"><ArrowUp size={15} /></button>
                      <button className="icon-btn" onClick={() => move(i, 1)} disabled={i === list.length - 1} aria-label="Aşağı"><ArrowDown size={15} /></button>
                    </span>
                    <span style={{ textAlign: 'right' }}>
                      <button className="btn ghost sm" onClick={() => setEdit(toDraft(p))}><Pencil size={13} /> Düzenle</button>
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <p className="cell-muted" style={{ marginTop: 14 }}>Kaydettiğin her değişiklik siteye anında yansır. Sıra, ana sayfadaki mağaza şeridinin sırasıdır.</p>
        </div>
      </div>
      {edit && <Editor key={edit.slug || 'yeni'} init={edit} toast={show} onClose={() => setEdit(null)} onSaved={load} />}
      {node}
    </>
  );
}
