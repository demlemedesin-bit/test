'use client';

import { useCallback, useEffect, useId, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import {
  allowedOnPath,
  deviceMatches,
  frequencyOk,
  inSchedule,
  isSubscribed,
  markSeen,
  pageMatches,
  parsePopups,
  safeUrl,
  trackPopup,
  type Popup,
} from '@/lib/popups';
import { NewsletterForm } from './NewsletterForm';
import './Popups.css';

// ── Ayarı oku (anon, tek seferlik; hata = hiçbir şey gösterme) ──
let cache: Promise<Popup[]> | null = null;
function loadPopups(): Promise<Popup[]> {
  if (cache) return cache;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return Promise.resolve([]);
  cache = fetch(`${url}/rest/v1/site_content?select=value&key=eq.popups&limit=1`, { headers: { apikey: key, Authorization: `Bearer ${key}` } })
    .then((r) => (r.ok ? r.json() : []))
    .then((rows: unknown) => (Array.isArray(rows) && rows[0] ? parsePopups((rows[0] as { value?: unknown }).value) : []))
    .catch(() => []);
  return cache;
}

const isMobile = () => {
  try {
    return window.matchMedia('(max-width: 767px)').matches || window.matchMedia('(pointer: coarse)').matches;
  } catch {
    return false;
  }
};

// ── Geri sayım ──
function Countdown({ to, onEnd }: { to: string; onEnd?: () => void }) {
  const target = new Date(to).getTime();
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const left = Math.max(0, target - now);
  const ended = left <= 0;
  useEffect(() => {
    if (ended) onEnd?.();
  }, [ended, onEnd]);
  if (Number.isNaN(target)) return null;
  if (ended) return <p className="dpop-ok">Kampanya sona erdi.</p>;
  const s = Math.floor(left / 1000);
  const parts: [number, string][] = [
    [Math.floor(s / 86400), 'gün'],
    [Math.floor((s % 86400) / 3600), 'saat'],
    [Math.floor((s % 3600) / 60), 'dk'],
    [s % 60, 'sn'],
  ];
  return (
    <div className="dpop-cd" role="timer" aria-label="Kalan süre">
      {parts.map(([n, l]) => (
        <div key={l}>
          <b>{String(n).padStart(2, '0')}</b>
          <span>{l}</span>
        </div>
      ))}
    </div>
  );
}

// ── Kupon ──
function Coupon({ code, onCopy }: { code: string; onCopy?: () => void }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      onCopy?.();
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }
  return (
    <div className="dpop-coupon">
      <span className="dpop-code" aria-label={`Kupon kodu ${code}`}>
        {code}
      </span>
      <button type="button" className="dpop-copy" onClick={copy}>
        {copied ? 'Kopyalandı' : 'Kopyala'}
      </button>
    </div>
  );
}

/**
 * Popup kartı (saf görünüm). Mağazada modal içinde, panelde canlı önizleme olarak kullanılır.
 * preview=true iken form gönderimi kapalıdır ve kupon her zaman görünür.
 */
export function PopupCard({ p, onClose, preview = false, titleId }: { p: Popup; onClose?: () => void; preview?: boolean; titleId?: string }) {
  const [subscribed, setSubscribed] = useState(false);
  const url = safeUrl(p.cta_url);
  const isNews = p.kind === 'newsletter';
  const showCoupon = !!p.coupon_code && (!isNews || subscribed || preview);
  const light = p.bg === 'cream';
  const [ended, setEnded] = useState(false);
  const ctaClick = (force = false) => {
    if (preview && !force) return;
    trackPopup(p.id, 'cta');
    onClose?.();
  };

  return (
    <div className={`dpop dpop--${p.bg}`}>
      {onClose && (
        <button type="button" className="dpop-x" onClick={onClose} aria-label="Kapat">
          <span aria-hidden="true">×</span>
        </button>
      )}
      {p.image && <img className="dpop-img" src={p.image} alt="" />}
      <div className="dpop-body">
        {p.title && (
          <h2 className="dpop-title" id={titleId}>
            {p.title}
          </h2>
        )}
        {p.text && <p className="dpop-text">{p.text}</p>}
        {p.kind === 'countdown' && p.countdown_to && <Countdown to={p.countdown_to} onEnd={() => setEnded(true)} />}

        {isNews && !subscribed && (
          <NewsletterForm
            source={`popup:${p.id}`.slice(0, 40)}
            consentText={p.consent_text}
            label={p.cta_label || 'Abone ol'}
            tone={light ? 'light' : 'dark'}
            disabled={preview}
            onSuccess={() => {
              setSubscribed(true);
              trackPopup(p.id, 'subscribe');
            }}
          />
        )}
        {isNews && subscribed && (
          <p className="dpop-ok" role="status">
            Teşekkürler! Aboneliğin alındı.{p.coupon_code ? ' Kupon kodun aşağıda.' : ''}
          </p>
        )}

        {showCoupon && <Coupon code={p.coupon_code} onCopy={() => trackPopup(p.id, 'copy')} />}

        {!isNews && p.cta_label && url && !ended && (
          <a className="dpop-cta" href={url} onClick={() => ctaClick()}>
            {p.cta_label}
          </a>
        )}
        {isNews && subscribed && p.cta_label && url && (
          <a className="dpop-cta" href={url} onClick={() => ctaClick(true)}>
            Alışverişe devam et
          </a>
        )}
        {onClose && isNews && !subscribed && (
          <button type="button" className="dpop-skip" onClick={onClose}>
            Teşekkürler, istemiyorum
          </button>
        )}
      </div>
    </div>
  );
}

const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]):not([tabindex="-1"]),select,textarea,[tabindex]:not([tabindex="-1"])';

function PopupModal({ p, onClose }: { p: Popup; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const titleId = useId();

  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const root = ref.current;
    const first = root?.querySelector<HTMLElement>(FOCUSABLE);
    (first ?? root)?.focus();
    function key(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key !== 'Tab' || !root) return;
      const items = Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((el) => el.offsetParent !== null || el === document.activeElement);
      if (!items.length) {
        e.preventDefault();
        root.focus();
        return;
      }
      const a = items[0];
      const z = items[items.length - 1];
      if (e.shiftKey && (document.activeElement === a || document.activeElement === root)) {
        e.preventDefault();
        z.focus();
      } else if (!e.shiftKey && document.activeElement === z) {
        e.preventDefault();
        a.focus();
      }
    }
    document.addEventListener('keydown', key);
    return () => {
      document.removeEventListener('keydown', key);
      document.body.style.overflow = overflow;
      try {
        prev?.focus();
      } catch {
        /* odak geri verilemese de sorun değil */
      }
    };
  }, [onClose]);

  return (
    <div
      ref={ref}
      className="dpop-ov"
      role="dialog"
      aria-modal="true"
      aria-labelledby={p.title ? titleId : undefined}
      aria-label={p.title ? undefined : p.name}
      tabIndex={-1}
      style={{ outline: 'none' }}
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <PopupCard p={p} onClose={onClose} titleId={titleId} />
    </div>
  );
}

/**
 * Mağaza popup'ları. Layout'a bir kez eklenir; ayarı kendisi okur. En fazla bir popup, sayfa başına en çok bir kez gösterilir.
 */
export function Popups() {
  const pathname = usePathname() || '/';
  const [list, setList] = useState<Popup[] | null>(null);
  const [active, setActive] = useState<{ p: Popup; path: string } | null>(null);
  const firedFor = useRef('');
  const open = active && active.path === pathname ? active.p : null;

  useEffect(() => {
    if (pathname.startsWith('/admin')) return;
    let off = false;
    loadPopups().then((l) => {
      if (!off) setList(l);
    });
    return () => {
      off = true;
    };
  }, [pathname]);

  useEffect(() => {
    if (!list || open || pathname.startsWith('/admin')) return;
    const now = Date.now();
    const mobile = isMobile();
    const subscribed = isSubscribed();
    const elig = list.filter(
      (p) =>
        p.on &&
        allowedOnPath(p.kind, pathname) &&
        pageMatches(p, pathname) &&
        deviceMatches(p, mobile) &&
        inSchedule(p, now) &&
        !(subscribed && p.hide_after_subscribe && (p.kind === 'newsletter' || p.kind === 'exit')),
    );
    if (!elig.length) return;

    const show = (p: Popup, byClick = false) => {
      if (!byClick && firedFor.current === pathname) return;
      if (!byClick) firedFor.current = pathname;
      markSeen(p.id);
      trackPopup(p.id, 'view');
      setActive({ p, path: pathname });
    };

    const cleanups: (() => void)[] = [];
    if (firedFor.current !== pathname) {
      for (const p of elig) {
        if (p.trigger === 'click' || !frequencyOk(p, now)) continue;
        const delay = Math.max(0, p.delay_s) * 1000;
        if (p.trigger === 'delay' || (p.trigger === 'exit' && mobile)) {
          const t = setTimeout(() => show(p), delay);
          cleanups.push(() => clearTimeout(t));
        } else if (p.trigger === 'scroll') {
          const pct = () => {
            const max = document.documentElement.scrollHeight - window.innerHeight;
            return max > 0 ? (window.scrollY / max) * 100 : 0;
          };
          if (document.documentElement.scrollHeight - window.innerHeight <= 40) {
            // Kaydırılamayan sayfada süreye düş
            const t = setTimeout(() => show(p), Math.max(delay, 5000));
            cleanups.push(() => clearTimeout(t));
          } else {
            const onScroll = () => {
              if (pct() >= p.scroll_pct) show(p);
            };
            window.addEventListener('scroll', onScroll, { passive: true });
            cleanups.push(() => window.removeEventListener('scroll', onScroll));
          }
        } else if (p.trigger === 'exit') {
          const armedAt = Date.now() + 3000;
          const onLeave = (e: MouseEvent) => {
            if (e.clientY <= 0 && Date.now() >= armedAt) show(p);
          };
          document.documentElement.addEventListener('mouseleave', onLeave);
          cleanups.push(() => document.documentElement.removeEventListener('mouseleave', onLeave));
        }
      }
    }

    const clickable = elig.filter((p) => p.trigger === 'click');
    if (clickable.length) {
      const onClick = (e: MouseEvent) => {
        const el = (e.target as Element | null)?.closest?.('[data-popup-open]');
        if (!el) return;
        const id = el.getAttribute('data-popup-open') || '';
        const p = id ? clickable.find((x) => x.id === id) : clickable[0];
        if (p) {
          e.preventDefault();
          show(p, true);
        }
      };
      document.addEventListener('click', onClick);
      cleanups.push(() => document.removeEventListener('click', onClick));
    }
    return () => cleanups.forEach((c) => c());
  }, [list, open, pathname]);

  const close = useCallback(() => {
    if (open) trackPopup(open.id, 'close');
    setActive(null);
  }, [open]);

  if (!open) return null;
  return <PopupModal key={open.id} p={open} onClose={close} />;
}
