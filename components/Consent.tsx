'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { validId, type Ads, type ConsentCfg } from '@/lib/seo';
import './consent.css';

/**
 * Çerez onayı ve izleme betikleri.
 * Onay: localStorage['dm-consent'] = {analytics, marketing, ts}; değişince window 'dm-consent' olayı atılır.
 * Onay şartı açıkken (ads.consent_required) hiçbir üçüncü taraf betik onaydan önce yüklenmez.
 */
export type ConsentState = { analytics: boolean; marketing: boolean; ts: number };
const KEY = 'dm-consent';

export function readConsent(): ConsentState | null {
  try {
    const j = JSON.parse(localStorage.getItem(KEY) || 'null') as Partial<ConsentState> | null;
    if (j && typeof j === 'object') return { analytics: j.analytics === true, marketing: j.marketing === true, ts: Number(j.ts) || 0 };
  } catch {
    /* depolama kapalı olabilir */
  }
  return null;
}
function writeConsent(c: { analytics: boolean; marketing: boolean }) {
  const v: ConsentState = { ...c, ts: Date.now() };
  try {
    localStorage.setItem(KEY, JSON.stringify(v));
  } catch {
    /* kaydedilemese de bu oturumda geçerli */
  }
  window.dispatchEvent(new CustomEvent('dm-consent', { detail: v }));
}
/** Altbilgideki "Çerez ayarları" gibi bağlantılardan bandı yeniden açmak için. */
export const openConsentSettings = () => window.dispatchEvent(new Event('dm-consent-open'));

// ── Betik yükleyici ───────────────────────────────────────────────────
type DmAds = { ga4: boolean; gtm: boolean; ads: boolean; adsId: string; adsLabel: string; meta: boolean; tiktok: boolean };
type W = Window & { dmAds?: DmAds; dataLayer?: unknown[]; gtag?: (...a: unknown[]) => void; fbq?: (...a: unknown[]) => void; ttq?: { page?: () => void } };

const injected = new Set<string>();
function inline(key: string, code: string) {
  if (injected.has(key)) return;
  injected.add(key);
  const s = document.createElement('script');
  s.dataset.dm = key;
  s.text = code;
  document.head.appendChild(s);
}
function external(key: string, src: string) {
  if (injected.has(key)) return;
  injected.add(key);
  const s = document.createElement('script');
  s.async = true;
  s.src = src;
  s.dataset.dm = key;
  document.head.appendChild(s);
}

function apply(ads: Ads, allowA: boolean, allowM: boolean) {
  const w = window as unknown as W;
  const gtmOk = validId('gtm_id', ads.gtm_id) && (allowA || allowM);
  const ga4Ok = validId('ga4_id', ads.ga4_id) && allowA;
  const clarityOk = validId('clarity_id', ads.clarity_id) && allowA;
  const hotjarOk = validId('hotjar_id', ads.hotjar_id) && allowA;
  const awOk = validId('ads_id', ads.ads_id) && allowM;
  const metaOk = validId('meta_pixel', ads.meta_pixel) && allowM;
  const ttOk = validId('tiktok_pixel', ads.tiktok_pixel) && allowM;

  if (gtmOk) {
    inline('gtm', `window.dataLayer=window.dataLayer||[];window.dataLayer.push({'gtm.start':new Date().getTime(),event:'gtm.js'});(function(){var j=document.createElement('script');j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id=${ads.gtm_id}';document.head.appendChild(j)})();`);
  }
  // gtag.js: GA4 ve/veya Google Ads için tek kurulum
  if (ga4Ok || awOk) {
    const first = ga4Ok ? ads.ga4_id : ads.ads_id;
    inline('gtag-init', `window.dataLayer=window.dataLayer||[];window.gtag=function(){window.dataLayer.push(arguments)};gtag('js',new Date());`);
    external('gtag-js', `https://www.googletagmanager.com/gtag/js?id=${first}`);
    if (ga4Ok) inline('gtag-ga4', `gtag('config','${ads.ga4_id}');`);
    if (awOk) inline('gtag-ads', `gtag('config','${ads.ads_id}');`);
  }
  if (metaOk) {
    inline('meta', `!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,document,'script','https://connect.facebook.net/en_US/fbevents.js');fbq('init','${ads.meta_pixel}');fbq('track','PageView');`);
  }
  if (ttOk) {
    inline('tiktok', `!function(w,d,t){w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie"];ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);ttq.instance=function(t){for(var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e};ttq.load=function(e,n){var i="https://analytics.tiktok.com/i18n/pixel/events.js";ttq._i=ttq._i||{};ttq._i[e]=[];ttq._i[e]._u=i;ttq._t=ttq._t||{};ttq._t[e]=+new Date;ttq._o=ttq._o||{};ttq._o[e]=n||{};var o=document.createElement("script");o.type="text/javascript";o.async=!0;o.src=i+"?sdkid="+e+"&lib="+t;var a=document.getElementsByTagName("script")[0];a.parentNode.insertBefore(o,a)};ttq.load('${ads.tiktok_pixel}');ttq.page()}(window,document,'ttq');`);
  }
  if (clarityOk) {
    inline('clarity', `(function(c,l,a,r,i,t,y){c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y)})(window,document,"clarity","script","${ads.clarity_id}");`);
  }
  if (hotjarOk) {
    inline('hotjar', `(function(h,o,t,j,a,r){h.hj=h.hj||function(){(h.hj.q=h.hj.q||[]).push(arguments)};h._hjSettings={hjid:${Number(ads.hotjar_id)},hjsv:6};a=o.getElementsByTagName('head')[0];r=o.createElement('script');r.async=1;r.src=t+h._hjSettings.hjid+j+h._hjSettings.hjsv;a.appendChild(r)})(window,document,'https://static.hotjar.com/c/hotjar-','.js?sv=');`);
  }
  // Onay sonradan geri alınırsa GA4 ölçümünü durdur
  if (validId('ga4_id', ads.ga4_id)) (w as unknown as Record<string, unknown>)['ga-disable-' + ads.ga4_id] = !ga4Ok;

  // track.js bu bayraklara bakar: onaysız / yüklenmemiş hizmete çağrı gitmez
  w.dmAds = { ga4: ga4Ok, gtm: gtmOk, ads: awOk, adsId: ads.ads_id, adsLabel: ads.ads_purchase_label, meta: metaOk, tiktok: ttOk };
  window.dispatchEvent(new Event('dm-ads-loaded'));
}

/** Geçerli kimlikleri, onay durumuna göre yükler. Onay değişince (dm-consent) yeniden değerlendirir. */
export function AdsLoader({ ads }: { ads: Ads }) {
  const path = usePathname();
  useEffect(() => {
    const run = () => {
      const c = ads.consent_required ? readConsent() : { analytics: true, marketing: true };
      apply(ads, !!c?.analytics, !!c?.marketing);
    };
    run();
    window.addEventListener('dm-consent', run);
    window.addEventListener('storage', run);
    return () => {
      window.removeEventListener('dm-consent', run);
      window.removeEventListener('storage', run);
    };
  }, [ads]);

  // Sayfa içi geçişlerde (App Router) Meta / TikTok sayfa görüntülemesi
  const prev = useRef(path);
  useEffect(() => {
    if (prev.current === path) return;
    prev.current = path;
    const w = window as unknown as W;
    try {
      if (w.dmAds?.meta) w.fbq?.('track', 'PageView');
      if (w.dmAds?.tiktok) w.ttq?.page?.();
    } catch {
      /* sessizce geç */
    }
  }, [path]);
  return null;
}

// ── Bant ──────────────────────────────────────────────────────────────
/** Bandın görünümü (panelde önizleme için de kullanılır). */
export function ConsentCard({
  cfg,
  settings,
  an,
  mk,
  onAn,
  onMk,
  onAccept,
  onReject,
  onToggleSettings,
  onSave,
  isStatic,
}: {
  cfg: ConsentCfg;
  settings: boolean;
  an: boolean;
  mk: boolean;
  onAn: (v: boolean) => void;
  onMk: (v: boolean) => void;
  onAccept: () => void;
  onReject: () => void;
  onToggleSettings: () => void;
  onSave: () => void;
  isStatic?: boolean;
}) {
  return (
    <div className={`ck${isStatic ? ' ck--static' : ''}`}>
      <section className="ck-card" role="region" aria-labelledby="ck-t" aria-describedby="ck-d">
        <h2 id="ck-t">{cfg.title}</h2>
        <p id="ck-d">
          {cfg.text}{' '}
          <a href={cfg.policy_url} target={/^https?:/i.test(cfg.policy_url) ? '_blank' : undefined} rel="noopener">
            Çerez ve gizlilik politikası
          </a>
        </p>
        {settings && (
          <div className="ck-opts">
            <label className="ck-opt">
              <input type="checkbox" checked disabled />
              <div>
                <b>Gerekli çerezler</b>
                <span>Sepet, oturum ve güvenlik için gerekir; kapatılamaz.</span>
              </div>
            </label>
            <label className="ck-opt">
              <input type="checkbox" checked={an} onChange={(e) => onAn(e.target.checked)} />
              <div>
                <b>Analitik</b>
                <span>Ziyaretlerin nasıl kullanıldığını anlamamıza yardım eder (Google Analytics, Clarity, Hotjar).</span>
              </div>
            </label>
            <label className="ck-opt">
              <input type="checkbox" checked={mk} onChange={(e) => onMk(e.target.checked)} />
              <div>
                <b>Pazarlama</b>
                <span>Reklamların işe yarayıp yaramadığını ölçer (Google Ads, Meta, TikTok).</span>
              </div>
            </label>
          </div>
        )}
        <div className="ck-act">
          <button type="button" className="ck-btn ck-btn--solid" onClick={settings ? onSave : onAccept}>
            {settings ? 'Seçimi kaydet' : cfg.accept_label}
          </button>
          <button type="button" className="ck-btn" onClick={onReject}>
            {cfg.reject_label}
          </button>
          {!settings && (
            <button type="button" className="ck-btn" onClick={onToggleSettings} aria-expanded={settings}>
              {cfg.settings_label}
            </button>
          )}
        </div>
      </section>
    </div>
  );
}

export function ConsentBanner({ cfg }: { cfg: ConsentCfg }) {
  const [open, setOpen] = useState(false);
  const [settings, setSettings] = useState(false);
  const [an, setAn] = useState(false);
  const [mk, setMk] = useState(false);

  useEffect(() => {
    if (!cfg.on) return;
    const t = setTimeout(() => {
      const c = readConsent();
      if (!c) setOpen(true);
    }, 0);
    const reopen = () => {
      const c = readConsent();
      setAn(!!c?.analytics);
      setMk(!!c?.marketing);
      setSettings(true);
      setOpen(true);
    };
    window.addEventListener('dm-consent-open', reopen);
    return () => {
      clearTimeout(t);
      window.removeEventListener('dm-consent-open', reopen);
    };
  }, [cfg.on]);

  if (!cfg.on || !open) return null;
  const done = (a: boolean, m: boolean) => {
    writeConsent({ analytics: a, marketing: m });
    setOpen(false);
    setSettings(false);
  };
  return (
    <ConsentCard
      cfg={cfg}
      settings={settings}
      an={an}
      mk={mk}
      onAn={setAn}
      onMk={setMk}
      onAccept={() => done(true, true)}
      onReject={() => done(false, false)}
      onToggleSettings={() => setSettings(true)}
      onSave={() => done(an, mk)}
    />
  );
}
