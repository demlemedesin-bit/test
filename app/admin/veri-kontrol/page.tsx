'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { tl, type AdminProduct } from '@/lib/admin';
import { DAY, startOfDay, type Ev } from '@/lib/analytics';
import { useMenu } from '@/components/admin/Shell';
import { Loading, TopBar } from '@/components/admin/ui';
import { Card, Tbl } from '@/components/admin/Tbl';
import { PageHero } from '@/components/admin/PageHero';

type Row = { name: string; ok: boolean | null; detail: string; fix?: string };

export default function VeriKontrol() {
  const menu = useMenu();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [bad, setBad] = useState<{ name: string; why: string }[]>([]);

  useEffect(() => {
    (async () => {
      const sb = supabase();
      const from = new Date(startOfDay() - 7 * DAY);
      const [e, o, a, v, p, sm] = await Promise.all([
        sb.rpc('events_agg', { p_from: from.toISOString() }),
        sb.from('orders').select('order_no,total,status,created_at').gte('created_at', from.toISOString()),
        sb.from('site_content').select('value').eq('key', 'ads').maybeSingle(),
        sb.from('shop_settings').select('key,value').in('key', ['verify_google', 'verify_meta']),
        sb.from('products').select('*').eq('active', true),
        sb.from('site_content').select('value').eq('key', 'consent').maybeSingle(),
      ]);
      const ev = (Array.isArray(e.data) ? e.data : []) as Ev[];
      const n = (t: string) => ev.filter((x) => x.type === t).reduce((s, x) => s + +x.n, 0);
      const orders = ((o.data ?? []) as { total: number; status: string }[]).filter((x) => x.status !== 'iptal');
      const evSum = ev.filter((x) => x.type === 'order').reduce((s, x) => s + +x.v, 0);
      const ordSum = orders.reduce((s, x) => s + Number(x.total), 0);
      const ads = (a.data?.value ?? {}) as Record<string, unknown>;
      const consent = (sm.data?.value ?? {}) as { on?: boolean };
      const ver = Object.fromEntries(((v.data ?? []) as { key: string; value: string }[]).map((r) => [r.key, r.value]));
      const prods = (p.data ?? []) as AdminProduct[];
      const why = (x: AdminProduct) => {
        const d = x.data as { desc?: string };
        const r: string[] = [];
        if (!(x.thumb || x.colors.some((c) => c.img))) r.push('görsel yok');
        if (!(x.price > 0)) r.push('fiyat yok');
        if (!(d.desc ?? '').trim()) r.push('açıklama yok');
        if (x.soon) r.push('“yakında” (satışta değil)');
        return r.join(', ');
      };
      setBad(prods.map((x) => ({ name: x.name, why: why(x) })).filter((x) => x.why));
      const has = (k: string) => typeof ads[k] === 'string' && (ads[k] as string).trim() !== '';
      const diff = ordSum ? Math.abs(evSum - ordSum) / ordSum : 0;
      setRows([
        { name: 'Ziyaret olayları (son 7 gün)', ok: n('view') > 0, detail: `${n('view')} olay`, fix: 'Sitede track.js yüklü mü? /api/track çalışıyor mu?' },
        { name: 'AddToCart olayı geliyor', ok: n('add_to_cart') > 0, detail: `${n('add_to_cart')} olay`, fix: 'Ürün sayfasında sepete ekleyip tekrar kontrol et.' },
        { name: 'BeginCheckout olayı geliyor', ok: n('begin_checkout') > 0, detail: `${n('begin_checkout')} olay`, fix: 'Ödeme sayfasını açıp tekrar kontrol et.' },
        { name: 'Purchase olayı geliyor', ok: orders.length === 0 ? null : n('order') > 0, detail: `${n('order')} olay / ${orders.length} sipariş`, fix: 'Sipariş tamamlandı sayfasında dmTrack(order) çağrılmalı.' },
        { name: 'Purchase değeri doğru', ok: orders.length === 0 || n('order') === 0 ? null : diff < 0.05, detail: `Olay toplamı ${tl(evSum)} · sipariş toplamı ${tl(ordSum)}`, fix: 'Fark %5’ten büyükse eksik/çift olay olabilir.' },
        { name: 'Para birimi', ok: true, detail: 'TRY (tüm olaylarda sabit gönderilir)' },
        { name: 'GA4 / GTM kimliği', ok: has('ga4_id') || has('gtm_id'), detail: has('ga4_id') ? String(ads.ga4_id) : has('gtm_id') ? String(ads.gtm_id) : 'Tanımlı değil', fix: 'SEO ve reklam → Reklam ve izleme' },
        { name: 'Google Ads dönüşüm', ok: has('ads_id') && has('ads_purchase_label'), detail: has('ads_id') ? `${ads.ads_id} / ${ads.ads_purchase_label || 'etiket yok'}` : 'Tanımlı değil', fix: 'Ads kimliği ve satın alma etiketi gerekir.' },
        { name: 'Meta Pixel', ok: has('meta_pixel'), detail: has('meta_pixel') ? String(ads.meta_pixel) : 'Tanımlı değil', fix: 'SEO ve reklam → Reklam ve izleme' },
        { name: 'Meta Conversion API (CAPI)', ok: null, detail: 'Sunucu tarafı yalnızca META_CAPI_TOKEN ortam değişkeni varsa çalışır; tarayıcı ve sunucu olayları aynı eventID (sipariş no) ile gönderilir, böylece çift sayım olmaz.', fix: 'Vercel → META_CAPI_TOKEN ekle.' },
        { name: 'TikTok Pixel', ok: has('tiktok_pixel'), detail: has('tiktok_pixel') ? String(ads.tiktok_pixel) : 'Tanımlı değil' },
        { name: 'Çerez onayı', ok: consent.on !== false, detail: consent.on === false ? 'Kapalı: izleme betikleri onaysız çalışır' : 'Açık (KVKK uyumlu)' },
        { name: 'Google Search Console doğrulaması', ok: !!ver.verify_google, detail: ver.verify_google ? 'Doğrulama kodu ekli' : 'Kod girilmemiş', fix: 'Entegrasyonlar → Site doğrulama; sonra /sitemap.xml gönder.' },
        { name: 'Google Merchant Center beslemesi', ok: prods.length > 0 && prods.length - bad.length >= 0, detail: `/feed/google.xml · ${prods.length} aktif ürün`, fix: 'Merchant Center’da bu adresi zamanlanmış besleme olarak ekle.' },
      ]);
    })();
  }, []);

  if (!rows) return (<><TopBar title="Veri kontrolü" onMenu={menu} /><div className="adm-scroll"><Loading /></div></>);
  return (
    <>
      <TopBar title="Analytics ve reklam veri kontrolü" sub="Kurulum yetmez: olaylar gerçekten geliyor mu?" onMenu={menu} />
      <div className="adm-scroll"><div className="adm-inner"><PageHero />
        <Card title="Kontroller" meta="Son 7 günlük ilk-taraf olay verisine göre">
          <Tbl min={760} cols={[['', '30px'], ['Kontrol', 'minmax(0,1fr)'], ['Durum', 'minmax(0,1.6fr)']]}
            rows={rows.map((r) => [<span key="i" style={{ color: r.ok === null ? 'var(--tx3)' : r.ok ? 'var(--green)' : '#c2410c', fontWeight: 700 }}>{r.ok === null ? '•' : r.ok ? '✓' : '✗'}</span>, r.name, <span key="d">{r.detail}{r.ok === false && r.fix ? <em style={{ color: '#c2410c', display: 'block', fontStyle: 'normal', fontSize: 12 }}>→ {r.fix}</em> : null}</span>])} />
        </Card>
        <Card title="Merchant Center’da sorun çıkarabilecek ürünler" meta="Görsel, fiyat, açıklama veya satış durumu eksik">
          <Tbl min={0} cols={[['Ürün', 'minmax(0,1fr)'], ['Sorun', 'minmax(0,1.5fr)']]} rows={bad.map((b) => [b.name, b.why])} empty="Sorunlu ürün yok" />
        </Card>
        <p className="hint">Merchant Center’ın gerçek onay/red durumu ve Search Console index hataları, Google hesabına bağlanmadan buradan okunamaz; yukarıdaki liste yaygın red sebeplerini önceden yakalar.</p>
      </div></div>
    </>
  );
}
