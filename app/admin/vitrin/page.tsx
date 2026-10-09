'use client';

import { useEffect, useState } from 'react';
import { Save } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { refreshSite } from '@/lib/admin';
import { useMenu } from '@/components/admin/Shell';
import { Field, Loading, TopBar, useToast } from '@/components/admin/ui';
import { STOREFRONT_DEFAULTS, STOREFRONT_KEY, toStorefront, type Storefront } from '@/lib/storefront';
import { PageHero } from '@/components/admin/PageHero';

const Sw = ({ v, on, label, hint }: { v: boolean; on: (b: boolean) => void; label: string; hint?: string }) => (
  <div className="fld">
    <label className="chk"><input type="checkbox" checked={v} onChange={(e) => on(e.target.checked)} /> {label}</label>
    {hint && <span className="hint">{hint}</span>}
  </div>
);

export default function Vitrin() {
  const menu = useMenu();
  const { show, node } = useToast();
  const [s, setS] = useState<Storefront | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase().from('site_content').select('value').eq('key', STOREFRONT_KEY).maybeSingle().then(({ data }) => setS(toStorefront(data?.value)));
  }, []);

  async function save() {
    if (!s) return;
    setBusy(true);
    const { error } = await supabase().from('site_content').upsert({ key: STOREFRONT_KEY, value: s, updated_at: new Date().toISOString() }, { onConflict: 'key' });
    if (!error) await refreshSite();
    setBusy(false);
    show(error ? 'Kaydedilemedi: ' + error.message : 'Kaydedildi', !!error);
  }
  if (!s) return (<><TopBar title="Vitrin" onMenu={menu} /><div className="adm-scroll"><Loading /></div></>);
  const set = <K extends keyof Storefront>(k: K, v: Storefront[K]) => setS((o) => ({ ...(o ?? STOREFRONT_DEFAULTS), [k]: v }));

  return (
    <>
      <TopBar title="Vitrin modülleri" sub="Ürün sayfası, sepet ve mağaza özellikleri" onMenu={menu}>
        <a className="btn ghost" href="/admin/popuplar">Popuplar</a>
        <button className="btn" onClick={save} disabled={busy}><Save size={15} /> {busy ? 'Kaydediliyor…' : 'Kaydet'}</button>
      </TopBar>
      <div className="adm-scroll"><div className="adm-inner" style={{ maxWidth: 860 }}><PageHero />
        <section className="card"><div className="card-h"><h2 className="card-t">Ürün önerileri</h2></div><div className="card-b">
          <Sw v={s.related_on} on={(b) => set('related_on', b)} label="“Bunu da beğenebilirsin” bölümü (ürün sayfası)" />
          <Field label="Başlık"><input className="inp" value={s.related_title} onChange={(e) => set('related_title', e.target.value)} /></Field>
          <Field label="Gösterilecek ürün sayısı"><input className="inp" type="number" min={1} max={8} value={s.related_count} onChange={(e) => set('related_count', Math.max(1, Math.min(8, Number(e.target.value) || 1)))} /></Field>
          <Field label="Seçim"><select className="inp" value={s.related_mode} onChange={(e) => set('related_mode', e.target.value as 'auto' | 'manual' | 'together')}><option value="together">Birlikte alınanlar (satış verisinden, yetmezse otomatik)</option><option value="auto">Otomatik (diğer ürünler)</option><option value="manual">Elle seçilen (ürün verisindeki related)</option></select></Field>
        </div></section>
        <section className="card" style={{ marginTop: 16 }}><div className="card-h"><h2 className="card-t">Sepet</h2></div><div className="card-b">
          <Sw v={s.upsell_cart_on} on={(b) => set('upsell_cart_on', b)} label="Sepette “Şunları da ekle” çapraz satış" />
          <Field label="Başlık"><input className="inp" value={s.upsell_title} onChange={(e) => set('upsell_title', e.target.value)} /></Field>
          <Field label="Ürün sayısı"><input className="inp" type="number" min={1} max={6} value={s.upsell_count} onChange={(e) => set('upsell_count', Math.max(1, Math.min(6, Number(e.target.value) || 1)))} /></Field>
          <Sw v={s.ship_bar_on} on={(b) => set('ship_bar_on', b)} label="Ücretsiz kargoya kalan tutar çubuğu" />
        </div></section>
        <section className="card" style={{ marginTop: 16 }}><div className="card-h"><h2 className="card-t">Diğer modüller</h2></div><div className="card-b">
          <Sw v={s.reviews_on} on={(b) => set('reviews_on', b)} label="Ürün yorumları ve puanlar" hint="Yorumlar Ürün yorumları sayfasından onaylanır." />
          <Sw v={s.recent_on} on={(b) => set('recent_on', b)} label="Son baktığın ürünler" />
          <Sw v={s.stock_alert_on} on={(b) => set('stock_alert_on', b)} label="Stokta yok ürünlerde “Gelince haber ver”" />
          <Sw v={s.wishlist_on} on={(b) => set('wishlist_on', b)} label="Favoriler (kalp)" />
          <Field label="“Yeni” rozeti kaç gün gösterilsin"><input className="inp" type="number" min={0} value={s.badges.new_days} onChange={(e) => set('badges', { new_days: Math.max(0, Number(e.target.value) || 0) })} /></Field>
        </div></section>
      </div></div>
      {node}
    </>
  );
}
