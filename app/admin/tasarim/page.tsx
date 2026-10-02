'use client';

import { useEffect, useState } from 'react';
import { Plus, Save, Trash2, ArrowUp, ArrowDown, Copy, Power, AlignLeft, AlignCenter, AlignRight, Percent, Truck, Sparkles, CalendarClock } from 'lucide-react';
import { ImageSlot } from '@/components/admin/DropZone';
import { supabase } from '@/lib/supabase';
import { refreshSite } from '@/lib/admin';
import { useMenu } from '@/components/admin/Shell';
import { Empty, Field, Loading, TopBar, useToast } from '@/components/admin/ui';
import { ImageInput } from '@/components/admin/Editors';
import { Tabs } from '@/components/admin/Tbl';
import { BannerPreview, PlacementMap, bannerState } from '@/components/admin/Preview';
import { emptyBanner, parseBanners, parseScripts, toIso, toLocalInput, type Banner, type Scripts } from '@/lib/design';
import { PageHero } from '@/components/admin/PageHero';

const TABS = [['banner', 'Ana sayfa banner'], ['script', 'Özel betikler'], ['harita', 'Sitede nerede görünür?']] as const;

export default function Tasarim() {
  const menu = useMenu();
  const { show, node } = useToast();
  const [tab, setTab] = useState<(typeof TABS)[number][0]>('banner');
  const [bn, setBn] = useState<Banner[] | null>(null);
  const [sc, setSc] = useState<Scripts | null>(null);
  const [sel, setSel] = useState(0);
  const [busy, setBusy] = useState(false);
  const [now] = useState(() => Date.now());
  const [dk, setDk] = useState(0);

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

  const TPL: { label: string; desc: string; icon: React.ReactNode; make: () => Partial<Banner> }[] = [
    { label: 'İndirim kampanyası', desc: 'Yüzde indirim duyurusu ve alışverişe yönlendiren buton.', icon: <Percent size={22} />, make: () => ({ name: 'İndirim bannerı', title: 'Seçili ürünlerde %20 indirim', text: 'Kampanya sınırlı süre geçerli.', cta_label: 'Alışverişe başla', url: '/urunler', align: 'left' }) },
    { label: 'Yeni ürün', desc: 'Yeni gelen ürünü öne çıkarır.', icon: <Sparkles size={22} />, make: () => ({ name: 'Yeni ürün', title: 'Yeni geldi', text: 'Sofrana yakışacak yeni parçayı keşfet.', cta_label: 'İncele', url: '/urunler', align: 'left' }) },
    { label: 'Ücretsiz kargo', desc: 'Kargo avantajını duyurur.', icon: <Truck size={22} />, make: () => ({ name: 'Ücretsiz kargo', title: 'Ücretsiz kargo fırsatı', text: 'Belirli tutarın üzerindeki siparişlerde kargo bizden.', cta_label: 'Ürünlere göz at', url: '/urunler', align: 'center' }) },
    { label: 'Süreli fırsat', desc: 'Bitiş tarihli, 7 gün sonra kendiliğinden kalkan banner.', icon: <CalendarClock size={22} />, make: () => ({ name: 'Süreli fırsat', title: 'Bu haftaya özel', text: 'Fırsat sürenin sonunda kalkar.', cta_label: 'Fırsatı yakala', url: '/urunler', align: 'left', starts_at: new Date().toISOString(), ends_at: new Date(Date.now() + 7 * 864e5).toISOString() }) },
    { label: 'Boş banner', desc: 'Sıfırdan kendin kurgula.', icon: <Plus size={22} />, make: () => ({}) },
  ];
  const addBanner = (p: Partial<Banner>) => { setBn((l) => [...(l ?? []), { ...emptyBanner(), ...p }]); setSel((bn ?? []).length); setDk((k) => k + 1); };
  const gallery = (
    <div className="tpl-grid">
      {TPL.map((t) => (
        <button key={t.label} type="button" className={`tpl${t.label === 'Boş banner' ? ' tpl-blank' : ''}`} onClick={() => addBanner(t.make())}>
          <span className="tpl-i">{t.icon}</span><b>{t.label}</b><small>{t.desc}</small><span className="tpl-add"><Plus size={14} /> Ekle</span>
        </button>
      ))}
    </div>
  );

  return (
    <>
      <TopBar title="Sayfa tasarımı" sub="Banner yönetimi ve özel betikler" onMenu={menu}>
        <button className="btn" onClick={save} disabled={busy}><Save size={15} /> {busy ? 'Kaydediliyor…' : 'Kaydet'}</button>
      </TopBar>
      <div className="adm-scroll"><div className="adm-inner" style={{ maxWidth: 1000 }}><PageHero />
        <Tabs items={TABS} value={tab} onChange={setTab} />
        {tab === 'banner' && (
          !bn.length ? (
            <section className="card"><div className="card-h"><h2 className="card-t">Bir şablonla başla</h2><span className="card-m">Birine dokun, banner metni hazır gelsin; görselini eklemen yeterli</span></div><div className="card-b">{gallery}</div></section>
          ) : (
            <>
              <div className="pu-tabs">
                {bn.map((x, i) => (
                  <button key={x.id} type="button" className={`pu-tab${i === sel ? ' on' : ''}`} onClick={() => setSel(i)}>
                    <i className={bannerState(x, now).tone === 'b-green' ? 'dot on' : 'dot'} />{x.name || 'Adsız'}
                    <span className={`badge plain ${bannerState(x, now).tone}`}>{bannerState(x, now).label}</span>
                  </button>
                ))}
                <details className="pu-new" key={dk}><summary className="btn ghost"><Plus size={14} /> Yeni banner</summary><div className="pu-new-p">{gallery}</div></details>
              </div>
              {b && (
                <div className="pu-grid">
                  <div className="pu-form">
                    <section className="card"><div className="card-h"><h2 className="card-t">İçerik</h2>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button className="btn ghost" onClick={() => mv(-1)} aria-label="Öne al"><ArrowUp size={14} /></button><button className="btn ghost" onClick={() => mv(1)} aria-label="Geriye al"><ArrowDown size={14} /></button>
                        <button className="btn ghost" onClick={() => { setBn((l) => [...(l ?? []), { ...b, id: 'b' + Date.now().toString(36), name: (b.name || 'Banner') + ' (kopya)', on: false }]); setSel(bn.length); }}><Copy size={14} /> Kopyala</button>
                        <button className="btn ghost" onClick={() => { setBn((l) => (l ?? []).filter((_, i) => i !== sel)); setSel(0); }}><Trash2 size={14} /> Sil</button>
                      </div></div>
                      <div className="card-b">
                        <div className={`alert ${bannerState(b, now).tone === 'b-green' ? 'ok' : 'warn'}`} style={{ marginBottom: 14 }}>{bannerState(b, now).label}: {bannerState(b, now).why}</div>
                        <button type="button" className={`pu-power${b.on ? ' on' : ''}`} aria-pressed={b.on} onClick={() => up({ on: !b.on })}><Power size={16} /> {b.on ? 'Yayında' : 'Kapalı, yayına almak için dokun'}</button>
                        <Field label="İç ad"><input className="inp" value={b.name} onChange={(e) => up({ name: e.target.value })} /></Field>
                        <div className="row2">
                          <Field label="Masaüstü görseli" hint="Önerilen 1600×500"><ImageSlot value={b.image} onChange={(v) => up({ image: v })} onError={(m) => show(m, true)} folder="banner" size={120} /></Field>
                          <Field label="Mobil görseli (isteğe bağlı)" hint="Önerilen 800×800"><ImageSlot value={b.mobile_image} onChange={(v) => up({ mobile_image: v })} onError={(m) => show(m, true)} folder="banner" size={120} /></Field>
                        </div>
                        <Field label="Başlık"><input className="inp" value={b.title} onChange={(e) => up({ title: e.target.value })} /></Field>
                        <Field label="Metin"><input className="inp" value={b.text} onChange={(e) => up({ text: e.target.value })} /></Field>
                        <div className="row2">
                          <Field label="Buton yazısı"><input className="inp" value={b.cta_label} onChange={(e) => up({ cta_label: e.target.value })} /></Field>
                          <Field label="Bağlantı"><input className="inp" placeholder="/urunler veya https://…" value={b.url} onChange={(e) => up({ url: e.target.value })} /></Field>
                        </div>
                        <Field label="Yazı hizası">
                          <div className="seg" role="group">{([['left', 'Sol', AlignLeft], ['center', 'Orta', AlignCenter], ['right', 'Sağ', AlignRight]] as const).map(([k, l, Ic]) => <button key={k} type="button" className={b.align === k ? 'on' : ''} aria-pressed={b.align === k} onClick={() => up({ align: k })}><Ic size={14} style={{ verticalAlign: -2, marginRight: 6 }} />{l}</button>)}</div>
                        </Field>
                      </div></section>
                    <section className="card"><div className="card-h"><h2 className="card-t">Yayın zamanı</h2><span className="card-m">Süre dolunca banner kendiliğinden kalkar</span></div><div className="card-b">
                      <div className="seg" role="group" style={{ marginBottom: 12 }}>
                        {[['Hemen', 0], ['Bugünden 7 gün', 7], ['30 gün', 30]].map(([l, d]) => <button key={l as string} type="button" onClick={() => up({ starts_at: d ? new Date().toISOString() : '', ends_at: d ? new Date(Date.now() + (d as number) * 864e5).toISOString() : '' })}>{l}</button>)}
                      </div>
                      <div className="row2">
                        <Field label="Başlangıç"><input className="inp" type="datetime-local" value={toLocalInput(b.starts_at)} onChange={(e) => up({ starts_at: toIso(e.target.value) })} /></Field>
                        <Field label="Bitiş"><input className="inp" type="datetime-local" value={toLocalInput(b.ends_at)} onChange={(e) => up({ ends_at: toIso(e.target.value) })} /></Field>
                      </div>
                    </div></section>
                  </div>
                  <aside className="pu-prev"><section className="card"><div className="card-h"><h2 className="card-t">Canlı önizleme</h2><span className="card-m">Sitede böyle görünür</span></div><div className="card-b"><BannerPreview banner={b} /></div></section></aside>
                </div>
              )}
            </>
          )
        )}
        {tab === 'harita' && <PlacementMap />}
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
