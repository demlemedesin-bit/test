'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, ExternalLink, RefreshCw, Save, Trash2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { dt, refreshSite } from '@/lib/admin';
import { useMenu } from '@/components/admin/Shell';
import { Confirm, Empty, Field, Loading, TopBar, useToast } from '@/components/admin/ui';
import { ImageInput } from '@/components/admin/Editors';
import { ConsentCard } from '@/components/Consent';
import {
  CHANGEFREQS,
  CHANGEFREQ_TR,
  ID_RULES,
  AI_BOTS,
  ALWAYS_DISALLOW,
  applyTemplate,
  baseUrl,
  organizationLd,
  parseAds,
  parseConsent,
  parseSeo,
  robotsText,
  validId,
  type Ads,
  type ConsentCfg,
  type IdKind,
  type Seo,
} from '@/lib/seo';
import './seo.css';

const TABS = ['Genel ve şablonlar', 'Kurumsal bilgi', 'Sitemap ve robots', 'Reklam ve izleme', '404 izleme', 'SEO denetimi'] as const;
type Tab = (typeof TABS)[number];
type Toast = (t: string, e?: boolean) => void;

type Form = {
  seo: Seo;
  social: string;
  exclude: string;
  extra_disallow: string;
  pr: { home: string; products: string; blog: string; pages: string };
  ads: Ads;
  consent: ConsentCfg;
};
type Up = (p: Partial<Form>) => void;

const lines = (s: string) => s.split('\n').map((x) => x.trim()).filter(Boolean);
const sv = (v: unknown) => (typeof v === 'string' || typeof v === 'number' ? String(v).trim() : '');

function seoRaw(f: Form): unknown {
  return { ...f.seo, org: { ...f.seo.org, social: lines(f.social) }, sitemap: { ...f.seo.sitemap, exclude: lines(f.exclude), priorities: f.pr }, robots: { ...f.seo.robots, extra_disallow: lines(f.extra_disallow) } };
}
const ADS_KINDS: IdKind[] = ['gtm_id', 'ga4_id', 'ads_id', 'ads_purchase_label', 'meta_pixel', 'tiktok_pixel', 'clarity_id', 'hotjar_id'];

export default function SeoAdmin() {
  const menu = useMenu();
  const { show, node } = useToast();
  const [tab, setTab] = useState<Tab>(TABS[0]);
  const [f, setF] = useState<Form | null>(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [origin] = useState(() => (typeof window === 'undefined' ? '' : window.location.origin));

  const load = useCallback(async () => {
    const { data, error } = await supabase().from('site_content').select('key, value').in('key', ['seo', 'ads', 'consent', 'texts']);
    if (error) return setErr('Ayarlar yüklenemedi: ' + error.message);
    const m = Object.fromEntries((data ?? []).map((r) => [r.key as string, r.value as unknown]));
    const t = (m.texts && typeof m.texts === 'object' ? m.texts : {}) as Record<string, unknown>;
    const seo = parseSeo(m.seo);
    const hasAds = !!m.ads && typeof m.ads === 'object';
    const r = (hasAds ? m.ads : {}) as Record<string, unknown>;
    const legacyGa = sv(t.ga_id);
    const legacyPx = sv(t.pixel_id);
    // Ham değerler gösterilir (bozuk kimlik silinmesin, kullanıcı düzeltsin); eski alanlar boşsa onlardan doldurulur
    const ads: Ads = {
      gtm_id: sv(r.gtm_id),
      ga4_id: sv(r.ga4_id) || legacyGa,
      ads_id: sv(r.ads_id),
      ads_purchase_label: sv(r.ads_purchase_label),
      meta_pixel: sv(r.meta_pixel) || legacyPx,
      tiktok_pixel: sv(r.tiktok_pixel),
      clarity_id: sv(r.clarity_id),
      hotjar_id: sv(r.hotjar_id),
      // ads satırı yoksa eski kurulumda GA/Pixel onaysız çalışıyordu: onay şartı bilerek açılmasın
      consent_required: typeof r.consent_required === 'boolean' ? r.consent_required : !(legacyGa || legacyPx),
    };
    setF({
      seo,
      social: seo.org.social.join('\n'),
      exclude: seo.sitemap.exclude.join('\n'),
      extra_disallow: seo.robots.extra_disallow.join('\n'),
      pr: { home: String(seo.sitemap.priorities.home), products: String(seo.sitemap.priorities.products), blog: String(seo.sitemap.priorities.blog), pages: String(seo.sitemap.priorities.pages) },
      ads,
      consent: parseConsent(m.consent),
    });
  }, []);
  useEffect(() => {
    const x = setTimeout(load, 0);
    return () => clearTimeout(x);
  }, [load]);

  const up: Up = useCallback((p) => setF((s) => (s ? { ...s, ...p } : s)), []);

  async function save() {
    if (!f) return;
    const clean = parseSeo(seoRaw(f));
    const raw = f.seo;
    if (raw.title_template.trim() && !raw.title_template.includes('%s')) return show('Başlık şablonu “%s” içermeli (örn. %s · Demleme).', true);
    if (raw.canonical_host.trim() && !clean.canonical_host) return show('Ana alan adı geçersiz (örn. www.demleme.com).', true);
    if (raw.twitter.trim() && !clean.twitter) return show('X (Twitter) kullanıcı adı geçersiz (örn. demleme).', true);
    if (raw.org.email.trim() && !clean.org.email) return show('Kurumsal e-posta geçersiz.', true);
    if (raw.org.phone.trim() && !clean.org.phone) return show('Kurumsal telefon geçersiz (örn. +90 224 000 00 00).', true);
    if (lines(f.social).length !== clean.org.social.length) return show('Sosyal medya bağlantıları https:// ile başlayan tam adresler olmalı.', true);
    if (raw.locale.trim() && !/^[a-z]{2}_[A-Z]{2}$/.test(raw.locale.trim())) return show('Dil kodu tr_TR biçiminde olmalı.', true);
    for (const k of ADS_KINDS) {
      const v = f.ads[k].trim();
      if (v && !validId(k, v)) return show(`${ID_RULES[k].label} biçimi hatalı (örn. ${ID_RULES[k].example}).`, true);
    }
    if (f.ads.ads_purchase_label.trim() && !f.ads.ads_id.trim()) return show('Satın alma etiketi için Google Ads kimliği de gerekli.', true);
    setBusy(true);
    const ads = { ...Object.fromEntries(ADS_KINDS.map((k) => [k, f.ads[k].trim()])), consent_required: f.ads.consent_required };
    const now = new Date().toISOString();
    const { error } = await supabase()
      .from('site_content')
      .upsert([{ key: 'seo', value: clean, updated_at: now }, { key: 'ads', value: ads, updated_at: now }, { key: 'consent', value: parseConsent(f.consent), updated_at: now }], { onConflict: 'key' });
    if (error) {
      setBusy(false);
      return show('Kaydedilemedi: ' + error.message, true);
    }
    await refreshSite();
    setBusy(false);
    await load();
    show('Kaydedildi, site güncellendi');
  }

  const hasSettings = tab !== '404 izleme' && tab !== 'SEO denetimi';
  return (
    <>
      <TopBar title="SEO ve reklam" sub="Arama motoru, paylaşım, izleme kodları ve çerez onayı" onMenu={menu}>
        <a className="btn ghost" href="/" target="_blank" rel="noopener">Siteyi aç</a>
        {hasSettings && f && (
          <button className="btn" onClick={save} disabled={busy}>
            <Save size={15} /> {busy ? 'Kaydediliyor…' : 'Kaydet'}
          </button>
        )}
      </TopBar>
      <div className="adm-scroll">
        <div className="adm-inner" style={{ maxWidth: 1060 }}>
          <div className="tabs" style={{ marginBottom: 18 }}>
            {TABS.map((x) => (
              <button key={x} type="button" className={`tab${tab === x ? ' on' : ''}`} onClick={() => setTab(x)}>
                {x}
              </button>
            ))}
          </div>
          {!f ? (
            err ? <div className="alert err">{err}</div> : <Loading />
          ) : (
            <>
              {f.seo.noindex_site && tab !== 'Genel ve şablonlar' && (
                <div className="alert warn">Site şu an arama motorlarından gizli (noindex). Yayına çıkarken “Genel ve şablonlar” sekmesinden kapat.</div>
              )}
              {tab === 'Genel ve şablonlar' && <General f={f} up={up} origin={origin} />}
              {tab === 'Kurumsal bilgi' && <Org f={f} up={up} origin={origin} />}
              {tab === 'Sitemap ve robots' && <Maps f={f} up={up} origin={origin} />}
              {tab === 'Reklam ve izleme' && <AdsTab f={f} up={up} toast={show} />}
              {tab === '404 izleme' && <NotFound toast={show} />}
              {tab === 'SEO denetimi' && <Audit f={f} toast={show} />}
            </>
          )}
        </div>
      </div>
      {node}
    </>
  );
}

// ── Ortak parçalar ────────────────────────────────────────────────────
function Counter({ n, min, max }: { n: number; min: number; max: number }) {
  const ok = n >= min && n <= max;
  return (
    <div className={`sx-cnt ${n === 0 ? '' : ok ? 'ok' : 'bad'}`}>
      {n} karakter · önerilen {min}-{max}
      {n > 0 && !ok && (n < min ? ' (kısa)' : ' (uzun, kesilebilir)')}
    </div>
  );
}
const clip = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1).trimEnd() + '…' : s);
const host = (u: string) => u.replace(/^https?:\/\//, '');

function Check({ checked, onChange, children }: { checked: boolean; onChange: (v: boolean) => void; children: React.ReactNode }) {
  return (
    <label className="chk">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span>{children}</span>
    </label>
  );
}

// ── 1. Genel ve şablonlar ──────────────────────────────────────────────
function General({ f, up, origin }: { f: Form; up: Up; origin: string }) {
  const s = f.seo;
  const set = (p: Partial<Seo>) => up({ seo: { ...s, ...p } });
  const [sample, setSample] = useState('Örnek ürün adı');
  const clean = parseSeo(seoRaw(f));
  const base = baseUrl(clean, origin || 'https://site.example');
  const homeTitle = s.default_title.trim() || 'Demleme — Bir demin 40 yıllık hatırı var';
  const homeDesc = s.default_desc.trim() || 'Site açıklaması (İçerik → SEO alanından gelir)';
  const pageTitle = applyTemplate(clean, sample);
  return (
    <div className="sx-grid">
      <section className="card">
        <div className="card-h"><h2 className="card-t">Başlık, açıklama, paylaşım</h2></div>
        <div className="card-b">
          <Field label="Site adı" hint="Paylaşım kartlarında ve yapısal veride görünür">
            <input className="inp" value={s.site_name} onChange={(e) => set({ site_name: e.target.value })} maxLength={80} />
          </Field>
          <Field label="Başlık şablonu" hint="%s yerine sayfa başlığı gelir. Boşsa sayfalar kendi başlığını kullanır. Not: kodda “· Demleme” ekini zaten yazan sayfalar varsa şablonda tekrarlanır.">
            <input className="inp" value={s.title_template} onChange={(e) => set({ title_template: e.target.value })} placeholder="%s · Demleme" maxLength={120} />
          </Field>
          <Field label="Ana sayfa başlığı">
            <input className="inp" value={s.default_title} onChange={(e) => set({ default_title: e.target.value })} placeholder="Boşsa İçerik → SEO başlığı kullanılır" maxLength={200} />
            <Counter n={s.default_title.length} min={30} max={60} />
          </Field>
          <Field label="Varsayılan açıklama">
            <textarea className="inp" value={s.default_desc} onChange={(e) => set({ default_desc: e.target.value })} placeholder="Boşsa İçerik → SEO açıklaması kullanılır" maxLength={400} />
            <Counter n={s.default_desc.length} min={70} max={160} />
          </Field>
          <Field label="Paylaşım görseli (OG)" hint="1200×630 önerilir; sayfanın kendi görseli yoksa bu kullanılır">
            <ImageInput value={s.og_image} onChange={(v) => set({ og_image: v })} folder="seo" />
          </Field>
          <div className="row2">
            <Field label="X (Twitter) kullanıcı adı" hint="@ olmadan">
              <input className="inp" value={s.twitter} onChange={(e) => set({ twitter: e.target.value })} placeholder="demleme" />
            </Field>
            <Field label="Dil / bölge">
              <input className="inp" value={s.locale} onChange={(e) => set({ locale: e.target.value })} placeholder="tr_TR" />
            </Field>
          </div>
          <Field label="Ana alan adı (isteğe bağlı)" hint="Sitemap ve paylaşım bağlantıları bu alan adıyla üretilir, örn. www.demleme.com. Boşsa sitenin mevcut adresi kullanılır.">
            <input className="inp" value={s.canonical_host} onChange={(e) => set({ canonical_host: e.target.value })} placeholder="www.demleme.com" />
          </Field>
          <div style={{ borderTop: '1px solid var(--bdr)', paddingTop: 14 }}>
            <Check checked={s.noindex_site} onChange={(v) => set({ noindex_site: v })}>
              <b>Siteyi arama motorlarından gizle (noindex)</b>
            </Check>
            <div className={`alert ${s.noindex_site ? 'warn' : 'ok'}`} style={{ marginTop: 8, marginBottom: 0 }}>
              {s.noindex_site
                ? 'Açık: tüm sayfalara noindex eklenir, robots.txt her şeyi engeller ve sitemap boş döner. Yayına çıkmadan önce bunu KAPAT; yoksa site Google’da hiç görünmez.'
                : 'Kapalı: site arama motorlarına açık. Yayın öncesi test için açabilirsin.'}
            </div>
          </div>
        </div>
      </section>
      <div className="sx-sticky" style={{ display: 'grid', gap: 18 }}>
        <section className="card">
          <div className="card-h"><h2 className="card-t">Google sonucu</h2><span className="card-m">Ana sayfa</span></div>
          <div className="card-b">
            <div className="sx-g">
              <div className="u"><i>{(s.site_name || 'D').slice(0, 1).toUpperCase()}</i><span>{s.site_name || 'Site'}<br /><span className="m">{host(base)}</span></span></div>
              <div className="t">{clip(homeTitle, 60)}</div>
              <div className="d">{clip(homeDesc, 160)}</div>
            </div>
            <Field label="Örnek sayfa başlığı (şablon denemesi)">
              <input className="inp" value={sample} onChange={(e) => setSample(e.target.value)} style={{ marginTop: 14 }} />
            </Field>
            <div className="sx-g">
              <div className="t" style={{ margin: 0 }}>{clip(pageTitle, 60)}</div>
              <div className="m" style={{ fontSize: 12.5 }}>{host(base)}/…</div>
            </div>
          </div>
        </section>
        <section className="card">
          <div className="card-h"><h2 className="card-t">Sosyal paylaşım</h2><span className="card-m">WhatsApp, Instagram, X</span></div>
          <div className="card-b">
            <div className="sx-soc">
              <div className="im" style={s.og_image ? { backgroundImage: `url(${s.og_image})` } : undefined}>{!s.og_image && 'Paylaşım görseli yok'}</div>
              <div className="bd">
                <div className="dm">{host(base)}</div>
                <div className="tt">{clip(homeTitle, 70)}</div>
                <div className="ds">{clip(homeDesc, 110)}</div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

// ── 2. Kurumsal bilgi ──────────────────────────────────────────────────
function Org({ f, up, origin }: { f: Form; up: Up; origin: string }) {
  const o = f.seo.org;
  const set = (p: Partial<Seo['org']>) => up({ seo: { ...f.seo, org: { ...o, ...p } } });
  const clean = parseSeo(seoRaw(f));
  const ld = JSON.stringify(organizationLd(clean, baseUrl(clean, origin || 'https://site.example')), null, 2);
  return (
    <div className="sx-grid">
      <section className="card">
        <div className="card-h"><h2 className="card-t">Kurumsal bilgi (Organization)</h2><span className="card-m">Ana sayfadaki yapısal veriye girer</span></div>
        <div className="card-b">
          <div className="row2">
            <Field label="Marka adı"><input className="inp" value={o.name} onChange={(e) => set({ name: e.target.value })} placeholder={f.seo.site_name} /></Field>
            <Field label="Ticari unvan"><input className="inp" value={o.legal_name} onChange={(e) => set({ legal_name: e.target.value })} /></Field>
          </div>
          <Field label="Logo" hint="Kare ya da yatay, en az 112×112 px">
            <ImageInput value={o.logo} onChange={(v) => set({ logo: v })} folder="seo" />
          </Field>
          <div className="row2">
            <Field label="E-posta"><input className="inp" type="email" value={o.email} onChange={(e) => set({ email: e.target.value })} /></Field>
            <Field label="Telefon"><input className="inp" value={o.phone} onChange={(e) => set({ phone: e.target.value })} placeholder="+90 224 000 00 00" /></Field>
          </div>
          <Field label="Adres"><textarea className="inp" value={o.address} onChange={(e) => set({ address: e.target.value })} style={{ minHeight: 64 }} /></Field>
          <Field label="Şehir"><input className="inp" value={o.city} onChange={(e) => set({ city: e.target.value })} /></Field>
          <Field label="Sosyal medya hesapları" hint="Her satıra bir tam adres (https://…): Instagram, YouTube, X, TikTok…">
            <textarea className="inp" value={f.social} onChange={(e) => up({ social: e.target.value })} placeholder={'https://instagram.com/demleme\nhttps://youtube.com/@demleme'} />
          </Field>
        </div>
      </section>
      <section className="card sx-sticky">
        <div className="card-h"><h2 className="card-t">Üretilen yapısal veri</h2></div>
        <div className="card-b"><pre className="sx-pre">{ld}</pre></div>
      </section>
    </div>
  );
}

// ── 3. Sitemap ve robots ──────────────────────────────────────────────
function Maps({ f, up, origin }: { f: Form; up: Up; origin: string }) {
  const sm = f.seo.sitemap;
  const rb = f.seo.robots;
  const setSm = (p: Partial<Seo['sitemap']>) => up({ seo: { ...f.seo, sitemap: { ...sm, ...p } } });
  const setRb = (p: Partial<Seo['robots']>) => up({ seo: { ...f.seo, robots: { ...rb, ...p } } });
  const setPr = (k: keyof Form['pr'], v: string) => up({ pr: { ...f.pr, [k]: v } });
  const clean = parseSeo(seoRaw(f));
  const base = baseUrl(clean, origin || 'https://site.example');
  const PR: [keyof Form['pr'], string][] = [['home', 'Ana sayfa'], ['products', 'Ürünler'], ['blog', 'Blog'], ['pages', 'Sayfalar']];
  return (
    <div className="sx-grid">
      <div style={{ display: 'grid', gap: 18 }}>
        <section className="card">
          <div className="card-h"><h2 className="card-t">Sitemap</h2><a className="btn ghost sm" href="/sitemap.xml" target="_blank" rel="noopener"><ExternalLink size={13} /> /sitemap.xml</a></div>
          <div className="card-b">
            <Check checked={sm.include_products} onChange={(v) => setSm({ include_products: v })}>Ürünleri ekle</Check>
            <Check checked={sm.include_pages} onChange={(v) => setSm({ include_pages: v })}>Sayfaları ekle</Check>
            <Check checked={sm.include_blog} onChange={(v) => setSm({ include_blog: v })}>Blog yazılarını ekle</Check>
            <Check checked={sm.include_images} onChange={(v) => setSm({ include_images: v })}>Görselleri ekle (ürün ve blog görselleri)</Check>
            <div className="row2" style={{ marginTop: 12 }}>
              <Field label="Güncelleme sıklığı">
                <select className="inp" value={sm.changefreq} onChange={(e) => setSm({ changefreq: e.target.value as Seo['sitemap']['changefreq'] })}>
                  {CHANGEFREQS.map((c) => <option key={c} value={c}>{CHANGEFREQ_TR[c]}</option>)}
                </select>
              </Field>
              <div />
            </div>
            <div className="row2">
              {PR.map(([k, l]) => (
                <Field key={k} label={`Öncelik: ${l}`} hint="0 ile 1 arası">
                  <input className="inp" type="number" min={0} max={1} step={0.1} value={f.pr[k]} onChange={(e) => setPr(k, e.target.value)} />
                </Field>
              ))}
            </div>
            <Field label="Sitemap dışında bırakılacak yollar" hint="Her satıra bir yol. Sonuna * koyarsan o ön ekle başlayan her şey çıkar (örn. /sayfa/gizli*)">
              <textarea className="inp" value={f.exclude} onChange={(e) => up({ exclude: e.target.value })} placeholder="/sayfa/ozel-kampanya" />
            </Field>
          </div>
        </section>
        <section className="card">
          <div className="card-h"><h2 className="card-t">robots.txt</h2><a className="btn ghost sm" href="/robots.txt" target="_blank" rel="noopener"><ExternalLink size={13} /> /robots.txt</a></div>
          <div className="card-b">
            <p className="hint" style={{ marginBottom: 10 }}>Her zaman engelli: {ALWAYS_DISALLOW.join('  ')}</p>
            <Field label="Ek engellenen yollar" hint="Her satıra bir yol">
              <textarea className="inp" value={f.extra_disallow} onChange={(e) => up({ extra_disallow: e.target.value })} placeholder="/ozel" />
            </Field>
            <Check checked={rb.block_ai_bots} onChange={(v) => setRb({ block_ai_bots: v })}>Yapay zekâ botlarını engelle ({AI_BOTS.join(', ')})</Check>
            <Field label="Ek kurallar (gelişmiş)" hint="Yalnızca User-agent / Allow / Disallow grupları işlenir. Örn: User-agent: AhrefsBot ve altına Disallow: /">
              <textarea className="inp" value={rb.extra_lines} onChange={(e) => setRb({ extra_lines: e.target.value })} style={{ fontFamily: 'ui-monospace, monospace', fontSize: 12.5 }} />
            </Field>
          </div>
        </section>
      </div>
      <div className="sx-sticky" style={{ display: 'grid', gap: 18 }}>
        <section className="card">
          <div className="card-h"><h2 className="card-t">robots.txt önizleme</h2><span className="card-m">kaydedince yayında</span></div>
          <div className="card-b"><pre className="sx-pre">{robotsText(clean, base)}</pre></div>
        </section>
        <section className="card">
          <div className="card-h"><h2 className="card-t">Search Console’a gönder</h2></div>
          <div className="card-b" style={{ fontSize: 13.5, lineHeight: 1.6 }}>
            <ol style={{ paddingLeft: 20, listStyle: 'decimal', display: 'grid', gap: 6 }}>
              <li><a href="https://search.google.com/search-console" target="_blank" rel="noopener" style={{ color: 'var(--ac)' }}>Google Search Console</a>’a gir ve siteni mülk olarak ekle (doğrulama kodu: Entegrasyonlar → Site doğrulama).</li>
              <li>Sol menüden <b>Site haritaları</b>’nı aç.</li>
              <li><b>sitemap.xml</b> yaz ve Gönder’e bas (tam adres: <code>{base}/sitemap.xml</code>).</li>
              <li>Durum “Başarılı” olunca ürün ve yazıların dizine girmesi birkaç gün sürebilir. Yeni içerik sitemap’e en geç 1 saatte düşer.</li>
              <li>Bing için Bing Webmaster Tools’tan aynı adresi gönder.</li>
            </ol>
          </div>
        </section>
      </div>
    </div>
  );
}

// ── 4. Reklam ve izleme ────────────────────────────────────────────────
const EVENTS: { ev: string; when: string; ga: string; ads: string; meta: string; tt: string }[] = [
  { ev: 'Sayfa görüntüleme', when: 'Her sayfa açılışı ve sayfa içi geçiş', ga: 'page_view', ads: 'Etiket kurulumu', meta: 'PageView', tt: 'page' },
  { ev: 'Ürün görüntüleme', when: 'Ürün sayfası açılınca', ga: 'view_item', ads: '—', meta: 'ViewContent', tt: 'ViewContent' },
  { ev: 'Sepete ekleme', when: '“Sepete ekle” tıklanınca', ga: 'add_to_cart', ads: '—', meta: 'AddToCart', tt: 'AddToCart' },
  { ev: 'Ödemeye başlama', when: 'Ödeme sayfası açılınca', ga: 'begin_checkout', ads: '—', meta: 'InitiateCheckout', tt: 'InitiateCheckout' },
  { ev: 'Satın alma', when: 'Sipariş tamamlanınca (tutar, TRY, sipariş no)', ga: 'purchase', ads: 'conversion (etiket gerekir)', meta: 'Purchase', tt: 'CompletePayment' },
];

function AdsTab({ f, up, toast }: { f: Form; up: Up; toast: Toast }) {
  const a = f.ads;
  const c = f.consent;
  const setA = (p: Partial<Ads>) => up({ ads: { ...a, ...p } });
  const setC = (p: Partial<ConsentCfg>) => up({ consent: { ...c, ...p } });
  const [an, setAn] = useState(true);
  const [mk, setMk] = useState(true);
  const [pvSettings, setPvSettings] = useState(true);
  const state = (k: IdKind) => (a[k].trim() === '' ? 'off' : validId(k, a[k]) ? 'ok' : 'bad');
  const badge = (k: IdKind) => {
    const s = state(k);
    return <span className={`badge ${s === 'ok' ? 'b-green' : s === 'bad' ? 'b-red' : 'b-gray'}`}>{s === 'ok' ? 'Geçerli' : s === 'bad' ? 'Biçim hatalı' : 'Kapalı'}</span>;
  };
  const idField = (k: IdKind, hint?: string) => (
    <div className="sx-idrow" key={k}>
      <Field label={ID_RULES[k].label} hint={hint ?? `Örn. ${ID_RULES[k].example}`}>
        <input className="inp" value={a[k]} onChange={(e) => setA({ [k]: e.target.value } as Partial<Ads>)} placeholder={ID_RULES[k].example} autoComplete="off" spellCheck={false} />
      </Field>
      {badge(k)}
    </div>
  );
  const on = (k: IdKind) => state(k) === 'ok';
  const yes = (v: boolean, t: string) => (v ? <span className="yes">{t}</span> : <span className="no">—</span>);
  const needsConsentBanner = a.consent_required && !c.on && ADS_KINDS.some((k) => on(k));
  void toast;
  return (
    <div style={{ display: 'grid', gap: 18 }}>
      <section className="card">
        <div className="card-h"><h2 className="card-t">İzleme kimlikleri</h2><span className="card-m">Boş ya da biçimi hatalı kimlik = kapalı</span></div>
        <div className="card-b">
          <div className="row2">
            {idField('ga4_id')}
            {idField('gtm_id', 'GA4’ü GTM içinden de kurduysan ikisini birden doldurma; olaylar iki kez sayılır.')}
            {idField('ads_id')}
            {idField('ads_purchase_label', 'Ads → Hedefler → Dönüşümler → Etiket kurulumu → “Etiket” kısmı')}
            {idField('meta_pixel')}
            {idField('tiktok_pixel')}
            {idField('clarity_id')}
            {idField('hotjar_id')}
          </div>
        </div>
      </section>

      <section className="card">
        <div className="card-h"><h2 className="card-t">Hangi olaylar nereye gider?</h2><span className="card-m">Çerez onayı olmadan hiçbirine çağrı yapılmaz</span></div>
        <div style={{ overflowX: 'auto' }}>
          <table className="sx-ev">
            <thead><tr><th>Olay</th><th>Ne zaman</th><th>GA4 / GTM</th><th>Google Ads</th><th>Meta</th><th>TikTok</th></tr></thead>
            <tbody>
              {EVENTS.map((e) => (
                <tr key={e.ev}>
                  <td><b>{e.ev}</b></td>
                  <td>{e.when}</td>
                  <td>{yes(on('ga4_id') || on('gtm_id'), e.ga)}</td>
                  <td>{e.ads === '—' ? <span className="no">—</span> : yes(on('ads_id') && (e.ev !== 'Satın alma' || on('ads_purchase_label')), e.ads)}</td>
                  <td>{yes(on('meta_pixel'), e.meta)}</td>
                  <td>{yes(on('tiktok_pixel'), e.tt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="card-b" style={{ borderTop: '1px solid var(--bdr)', fontSize: 13.5, lineHeight: 1.6 }}>
          <b>Test modu.</b> Kodları kaydettikten sonra siteyi aç, çerez bandında “Kabul et”e bas ve şu araçlarla olayları canlı izle: GA4 → Yönetici → DebugView, Tag Manager → Önizleme, Meta Events Manager → Olayları Test Et, TikTok Events Manager → Test Events. Reddedersen hiçbir üçüncü taraf betik yüklenmez; kendi ziyaret takibimiz (Takip sayfası) çalışmaya devam eder. Clarity ve Hotjar yalnızca “Analitik”, Google Ads / Meta / TikTok “Pazarlama” onayıyla yüklenir; GA4 “Analitik”, GTM herhangi bir onayla yüklenir.
        </div>
      </section>

      <div className="sx-grid">
        <section className="card">
          <div className="card-h"><h2 className="card-t">Çerez onayı</h2></div>
          <div className="card-b">
            <Check checked={a.consent_required} onChange={(v) => setA({ consent_required: v })}>
              <b>İzleme betikleri için onay iste</b> (kapalıysa betikler izin sorulmadan yüklenir)
            </Check>
            <Check checked={c.on} onChange={(v) => setC({ on: v })}>
              <b>Çerez bandını göster</b>
            </Check>
            {needsConsentBanner && <div className="alert warn" style={{ marginTop: 8 }}>Onay isteniyor ama çerez bandı kapalı: ziyaretçi onay veremeyeceği için izleme betikleri hiç yüklenmez. Bandı aç ya da onay şartını kapat.</div>}
            <div style={{ marginTop: 12 }}>
              <Field label="Başlık"><input className="inp" value={c.title} onChange={(e) => setC({ title: e.target.value })} maxLength={80} /></Field>
              <Field label="Metin"><textarea className="inp" value={c.text} onChange={(e) => setC({ text: e.target.value })} maxLength={600} /></Field>
              <Field label="Politika bağlantısı" hint="Örn. /gizlilik-politikasi ya da /kvkk"><input className="inp" value={c.policy_url} onChange={(e) => setC({ policy_url: e.target.value })} /></Field>
              <div className="row3">
                <Field label="Kabul düğmesi"><input className="inp" value={c.accept_label} onChange={(e) => setC({ accept_label: e.target.value })} maxLength={30} /></Field>
                <Field label="Red düğmesi"><input className="inp" value={c.reject_label} onChange={(e) => setC({ reject_label: e.target.value })} maxLength={30} /></Field>
                <Field label="Ayarlar düğmesi"><input className="inp" value={c.settings_label} onChange={(e) => setC({ settings_label: e.target.value })} maxLength={30} /></Field>
              </div>
              <p className="hint">Ziyaretçiler tercihini sonradan değiştirebilsin diye altbilgiye “Çerez ayarları” bağlantısı koyabilirsin: tıklayınca <code>window.dispatchEvent(new Event(&apos;dm-consent-open&apos;))</code> çalıştıran bir düğme bandı yeniden açar.</p>
            </div>
          </div>
        </section>
        <section className="card sx-sticky">
          <div className="card-h"><h2 className="card-t">Bant önizleme</h2>
            <label className="chk" style={{ marginLeft: 'auto', padding: 0 }}><input type="checkbox" checked={pvSettings} onChange={(e) => setPvSettings(e.target.checked)} /> Ayarlar açık</label>
          </div>
          <div className="card-b">
            <div className="sx-ckprev">
              <ConsentCard cfg={parseConsent(c)} settings={pvSettings} an={an} mk={mk} onAn={setAn} onMk={setMk} onAccept={() => {}} onReject={() => {}} onToggleSettings={() => setPvSettings(true)} onSave={() => {}} isStatic />
            </div>
            <p className="hint" style={{ marginTop: 8 }}>Önizleme etkileşimlidir ama hiçbir şey kaydetmez.</p>
          </div>
        </section>
      </div>
    </div>
  );
}

// ── 5. 404 izleme ──────────────────────────────────────────────────────
type NfRow = { path: string; hits: number; referrer: string | null; first_seen: string; last_seen: string };
const okTarget = (t: string) => (/^\/(?![/\\])/.test(t) && !/\s/.test(t)) || /^https?:\/\/[^\s]+$/i.test(t);

function NotFound({ toast }: { toast: Toast }) {
  const [rows, setRows] = useState<NfRow[] | null>(null);
  const [err, setErr] = useState('');
  const [sort, setSort] = useState<'hits' | 'last_seen' | 'path'>('hits');
  const [open, setOpen] = useState('');
  const [target, setTarget] = useState('');
  const [busy, setBusy] = useState(false);
  const [clear, setClear] = useState(false);

  const load = useCallback(async () => {
    const { data, error } = await supabase().from('not_found_log').select('path,hits,referrer,first_seen,last_seen').limit(1500);
    if (error) return setErr('404 kayıtları yüklenemedi: ' + error.message);
    setErr('');
    setRows((data ?? []) as NfRow[]);
  }, []);
  useEffect(() => {
    const x = setTimeout(load, 0);
    return () => clearTimeout(x);
  }, [load]);

  const sorted = useMemo(() => {
    const r = [...(rows ?? [])];
    r.sort((a, b) => (sort === 'hits' ? b.hits - a.hits : sort === 'last_seen' ? b.last_seen.localeCompare(a.last_seen) : a.path.localeCompare(b.path, 'tr')));
    return r;
  }, [rows, sort]);

  async function redirect(p: string) {
    const to = target.trim();
    if (!okTarget(to)) return toast('Hedef “/” ile başlayan bir site içi yol ya da tam adres (https://…) olmalı.', true);
    if (to === p) return toast('Hedef, kaynakla aynı olamaz.', true);
    setBusy(true);
    const r = await supabase().from('redirects').upsert({ from_path: p, to_path: to, permanent: true, active: true }, { onConflict: 'from_path' });
    if (r.error) {
      setBusy(false);
      return toast('Yönlendirme kaydedilemedi: ' + r.error.message, true);
    }
    const d = await supabase().from('not_found_log').delete().eq('path', p);
    setBusy(false);
    setOpen('');
    setTarget('');
    toast(d.error ? 'Yönlendirme oluştu ama 404 kaydı silinemedi.' : 'Yönlendirme oluşturuldu (en geç 1 dk içinde etkin olur)', !!d.error);
    refreshSite();
    load();
  }
  async function wipe() {
    setBusy(true);
    const { error } = await supabase().from('not_found_log').delete().like('path', '/%');
    setBusy(false);
    setClear(false);
    if (error) return toast('Temizlenemedi: ' + error.message, true);
    toast('404 kayıtları temizlendi');
    load();
  }
  async function drop(p: string) {
    const { error } = await supabase().from('not_found_log').delete().eq('path', p);
    if (error) return toast(error.message, true);
    load();
  }

  return (
    <section className="card">
      <div className="card-h">
        <h2 className="card-t">Bulunamayan adresler</h2>
        <span className="card-m">Ziyaretçilerin 404’e düştüğü yollar</span>
        <div className="sx-row-inline" style={{ marginLeft: 12 }}>
          <select className="inp" style={{ width: 'auto', padding: '6px 10px' }} value={sort} onChange={(e) => setSort(e.target.value as typeof sort)} aria-label="Sırala">
            <option value="hits">En çok denenen</option>
            <option value="last_seen">En son görülen</option>
            <option value="path">Yola göre</option>
          </select>
          <button className="btn ghost sm" onClick={load}><RefreshCw size={13} /> Yenile</button>
          <button className="btn danger sm" onClick={() => setClear(true)} disabled={!rows?.length}><Trash2 size={13} /> Temizle</button>
        </div>
      </div>
      {err && <div className="alert err" style={{ margin: 16 }}>{err}</div>}
      {!rows ? (
        !err && <Loading />
      ) : rows.length === 0 ? (
        <Empty title="404 kaydı yok" text="Ziyaretçiler olmayan bir adrese girdiğinde burada listelenir." />
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <div className="tbl">
            <div className="tr hd sx-404"><span>Yol</span><span>Sayı</span><span>Geldiği yer</span><span>Son görülme</span><span /></div>
            {sorted.map((r) => (
              <div key={r.path}>
                <div className="tr sx-404">
                  <span style={{ overflowWrap: 'anywhere', fontFamily: 'ui-monospace, monospace', fontSize: 12.5 }}>{r.path}</span>
                  <b>{r.hits}</b>
                  <span style={{ overflowWrap: 'anywhere', fontSize: 12.5, color: 'var(--tx3)' }}>{r.referrer || '—'}</span>
                  <span style={{ fontSize: 12.5, color: 'var(--tx3)' }}>{dt(r.last_seen)}</span>
                  <span style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                    <button className="btn ghost sm" onClick={() => { setOpen(open === r.path ? '' : r.path); setTarget(''); }}>Yönlendirme oluştur</button>
                    <button className="icon-btn" title="Kaydı sil" aria-label="Kaydı sil" onClick={() => drop(r.path)}><Trash2 size={15} /></button>
                  </span>
                </div>
                {open === r.path && (
                  <div className="sx-row-inline" style={{ padding: '0 20px 14px', borderBottom: '1px solid var(--bdr)' }}>
                    <ArrowRight size={16} color="var(--tx3)" />
                    <input className="inp" style={{ flex: 1, minWidth: 220 }} autoFocus value={target} onChange={(e) => setTarget(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && redirect(r.path)} placeholder="Hedef yol, örn. /urun/cay-bardagi" aria-label="Hedef yol" />
                    <button className="btn sm" disabled={busy} onClick={() => redirect(r.path)}>{busy ? 'Bekle…' : 'Kaydet (kalıcı 301)'}</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
      {clear && <Confirm title="404 kayıtları temizlensin mi?" text="Listedeki tüm kayıtlar silinir. Oluşturduğun yönlendirmelere dokunulmaz." confirmText="Temizle" onConfirm={wipe} onCancel={() => setClear(false)} busy={busy} />}
    </section>
  );
}

// ── 6. SEO denetimi ────────────────────────────────────────────────────
type Problem = { t: string; w: number };
type Item = { kind: 'Ürün' | 'Sayfa' | 'Yazı'; slug: string; name: string; live: boolean; problems: Problem[]; fix: string; url: string };
type PRow = { slug: string; name: string; active: boolean; thumb: string | null; colors: { img?: string }[] | null; data: { seo_title?: string; seo_desc?: string; desc?: string } | null };
type GRow = { slug: string; title: string; seo_title: string; seo_desc: string; published: boolean };
type BRow = { slug: string; title: string; excerpt: string; cover: string | null; seo_title: string; seo_desc: string; published: boolean; published_at: string | null };

const T_MIN = 30, T_MAX = 60, D_MIN = 70, D_MAX = 160;

function check(title: string, desc: string, image: boolean | null, dup: boolean): Problem[] {
  const p: Problem[] = [];
  if (!title) p.push({ t: 'Başlık yok', w: 30 });
  else if (title.length < T_MIN) p.push({ t: `Başlık kısa (${title.length}; en az ${T_MIN})`, w: 8 });
  else if (title.length > T_MAX) p.push({ t: `Başlık uzun (${title.length}; en çok ${T_MAX})`, w: 8 });
  if (!desc) p.push({ t: 'Açıklama yok', w: 25 });
  else if (desc.length < D_MIN) p.push({ t: `Açıklama kısa (${desc.length}; en az ${D_MIN})`, w: 8 });
  else if (desc.length > D_MAX) p.push({ t: `Açıklama uzun (${desc.length}; en çok ${D_MAX})`, w: 8 });
  if (dup) p.push({ t: 'Başlık başka bir sayfayla aynı (kopya)', w: 20 });
  if (image === false) p.push({ t: 'Görsel yok', w: 12 });
  return p;
}

function Audit({ f, toast }: { f: Form; toast: Toast }) {
  const [items, setItems] = useState<Item[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [all, setAll] = useState(false);

  const run = useCallback(async () => {
    setBusy(true);
    const sb = supabase();
    const [p, g, b] = await Promise.all([
      sb.from('products').select('slug,name,active,thumb,colors,data'),
      sb.from('pages').select('slug,title,seo_title,seo_desc,published'),
      sb.from('posts').select('slug,title,excerpt,cover,seo_title,seo_desc,published,published_at'),
    ]);
    setBusy(false);
    if (p.error || g.error || b.error) return toast('Tarama başarısız: ' + (p.error?.message || g.error?.message || b.error?.message), true);
    const raw: Omit<Item, 'problems'>[] & { title: string; desc: string; img: boolean | null }[] = [] as never;
    const list: { base: Omit<Item, 'problems'>; title: string; desc: string; img: boolean | null }[] = [];
    for (const r of (p.data ?? []) as PRow[]) {
      const d = r.data ?? {};
      list.push({
        base: { kind: 'Ürün', slug: r.slug, name: r.name, live: r.active, fix: '/admin/urunler', url: `/urun/${r.slug}` },
        title: (d.seo_title ?? '').trim() || r.name.trim(),
        desc: (d.seo_desc ?? '').trim() || (d.desc ?? '').trim(),
        img: !!(r.thumb || r.colors?.some((c) => c.img)),
      });
    }
    for (const r of (g.data ?? []) as GRow[])
      list.push({ base: { kind: 'Sayfa', slug: r.slug, name: r.title, live: r.published, fix: '/admin/sayfalar', url: `/sayfa/${r.slug}` }, title: (r.seo_title ?? '').trim() || r.title.trim(), desc: (r.seo_desc ?? '').trim(), img: null });
    for (const r of (b.data ?? []) as BRow[])
      list.push({
        base: { kind: 'Yazı', slug: r.slug, name: r.title, live: r.published, fix: '/admin/sayfalar', url: `/blog/${r.slug}` },
        title: (r.seo_title ?? '').trim() || r.title.trim(),
        desc: (r.seo_desc ?? '').trim() || (r.excerpt ?? '').trim(),
        img: !!r.cover,
      });
    void raw;
    const count = new Map<string, number>();
    for (const x of list) if (x.base.live) count.set(x.title.toLowerCase(), (count.get(x.title.toLowerCase()) ?? 0) + 1);
    setItems(list.map((x) => ({ ...x.base, problems: x.base.live ? check(x.title, x.desc, x.img, !!x.title && (count.get(x.title.toLowerCase()) ?? 0) > 1) : [] })));
  }, [toast]);
  useEffect(() => {
    const x = setTimeout(run, 0);
    return () => clearTimeout(x);
  }, [run]);

  // Ayar eksikleri (kaydedilmemiş form dahil)
  const settings = useMemo(() => {
    const s = parseSeo(seoRaw(f));
    const o: Problem[] = [];
    if (s.noindex_site) o.push({ t: 'Site arama motorlarından gizli (noindex açık)', w: 40 });
    if (!s.default_title && !s.title_template) o.push({ t: 'Ana sayfa başlığı ve başlık şablonu tanımlı değil', w: 4 });
    if (!s.default_desc) o.push({ t: 'Varsayılan açıklama boş', w: 5 });
    if (!s.og_image) o.push({ t: 'Paylaşım görseli (OG) yok', w: 6 });
    if (!s.org.name && !s.org.legal_name) o.push({ t: 'Kurumsal bilgi (Organization) doldurulmamış', w: 4 });
    if (!s.org.logo) o.push({ t: 'Kurumsal logo yok', w: 3 });
    if (!s.org.social.length) o.push({ t: 'Sosyal medya hesabı eklenmemiş', w: 2 });
    if (!s.canonical_host) o.push({ t: 'Ana alan adı (canonical) tanımlı değil; özel alan adı kullanıyorsan ekle', w: 2 });
    if (!s.sitemap.include_products && !s.sitemap.include_pages && !s.sitemap.include_blog) o.push({ t: 'Sitemap’te ürün, sayfa ve blog kapalı', w: 10 });
    if (!f.ads.ga4_id.trim() && !f.ads.gtm_id.trim()) o.push({ t: 'Analitik (GA4 ya da GTM) kurulu değil', w: 3 });
    return o;
  }, [f]);

  if (!items) return busy ? <Loading text="Site taranıyor…" /> : null;
  const live = items.filter((x) => x.live);
  const scoreOf = (x: Item) => Math.max(0, 100 - x.problems.reduce((t, p) => t + p.w, 0));
  const avg = live.length ? live.reduce((t, x) => t + scoreOf(x), 0) / live.length : 100;
  const penalty = Math.min(45, settings.reduce((t, p) => t + p.w, 0));
  const score = Math.max(0, Math.round(avg - penalty));
  const tone = score >= 80 ? 'b-green' : score >= 55 ? 'b-amber' : 'b-red';
  const bad = items.filter((x) => x.problems.length || (all && !x.live) || (!x.live)).sort((a, b) => scoreOf(a) - scoreOf(b));
  const shown = (all ? items : bad.filter((x) => x.problems.length || !x.live)).slice().sort((a, b) => scoreOf(a) - scoreOf(b));
  const missDesc = live.filter((x) => x.problems.some((p) => p.t.startsWith('Açıklama yok'))).length;
  const missImg = live.filter((x) => x.problems.some((p) => p.t === 'Görsel yok')).length;
  const dups = live.filter((x) => x.problems.some((p) => p.t.includes('kopya'))).length;
  const hidden = items.length - live.length;

  return (
    <div style={{ display: 'grid', gap: 18 }}>
      <section className="card">
        <div className="card-b sx-score">
          <span className="n">{score}</span>
          <div style={{ flex: 1, minWidth: 220 }}>
            <span className={`badge ${tone}`}>{score >= 80 ? 'İyi' : score >= 55 ? 'Geliştirilebilir' : 'Acil ilgi gerek'}</span>
            <p style={{ color: 'var(--tx2)', fontSize: 13.5, marginTop: 8 }}>
              {live.length} yayındaki içerik tarandı: {missDesc} açıklamasız, {dups} kopya başlıklı, {missImg} görselsiz{hidden ? `; ${hidden} içerik yayında değil` : ''}. Skor, içerik başına puanların ortalamasından ayar eksikleri düşülerek bulunur.
            </p>
          </div>
          <button className="btn ghost" onClick={run} disabled={busy}><RefreshCw size={14} /> {busy ? 'Taranıyor…' : 'Yeniden tara'}</button>
        </div>
      </section>

      <section className="card">
        <div className="card-h"><h2 className="card-t">SEO ayarı eksikleri</h2><span className="card-m">Kaydedilmemiş değişiklikler dahil</span></div>
        {settings.length === 0 ? (
          <Empty title="Ayarlar tam" text="Genel SEO ayarlarında eksik görünmüyor." />
        ) : (
          <div className="card-b">
            <ul style={{ paddingLeft: 18, listStyle: 'disc', display: 'grid', gap: 5, fontSize: 13.5, color: 'var(--tx2)' }}>
              {settings.map((p) => <li key={p.t}>{p.t}</li>)}
            </ul>
          </div>
        )}
      </section>

      <section className="card">
        <div className="card-h">
          <h2 className="card-t">İçerik sorunları</h2>
          <label className="chk" style={{ marginLeft: 'auto', padding: 0 }}><input type="checkbox" checked={all} onChange={(e) => setAll(e.target.checked)} /> Sorunsuzları da göster</label>
        </div>
        {shown.length === 0 ? (
          <Empty title="Sorun yok" text="Taranan içeriklerde eksik ya da uyarı bulunamadı." />
        ) : (
          <div>
            {shown.map((x) => (
              <div key={x.kind + x.slug} className="sx-iss">
                <div>
                  <b style={{ overflowWrap: 'anywhere' }}>{x.name}</b>
                  <div className="sub"><span className="badge plain b-gray" style={{ marginRight: 6 }}>{x.kind}</span>{x.url}</div>
                </div>
                <div>
                  {!x.live ? <span className="badge b-gray">Yayında değil</span> : x.problems.length === 0 ? <span className="badge b-green">Sorunsuz</span> : <ul>{x.problems.map((p) => <li key={p.t}>{p.t}</li>)}</ul>}
                </div>
                <div style={{ textAlign: 'right' }}>
                  <Link className="btn ghost sm" href={x.fix}>Düzelt <ArrowRight size={13} /></Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
