'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { isSubscribed } from '@/lib/popups';
import { D } from './Display';
import { NewsletterForm } from './NewsletterForm';
import './Popups.css';
import './Welcome.css';

const KEY = 'demleme-welcome';
// Yalnızca ilk karşılama sayfaları; alışveriş, ödeme, hesap ve panel akışlarına karışmaz.
const SKIP = ['/admin', '/odeme', '/sepet', '/hesabim', '/giris', '/kayit', '/siparis', '/sifre', '/sifremi', '/t/', '/api', '/kvkk', '/gizlilik', '/cerez', '/kullanim', '/mesafeli', '/kargo', '/acik-riza'];

function shouldShow(path: string): boolean {
  if (SKIP.some((p) => path.startsWith(p))) return false;
  try {
    if (navigator.webdriver) return false; // otomasyon / test
    if (isSubscribed()) return false;
    if (window.localStorage.getItem(KEY)) return false;
  } catch {
    return false;
  }
  return true;
}

/**
 * İlk ziyarette sayfayı tam ekran kaplayan e-bülten karşılaması.
 * Kapatılınca (veya abone olunca) bir daha gösterilmez; perde yukarı kayarak açılır.
 */
export function Welcome() {
  const path = usePathname() || '/';
  const [open, setOpen] = useState(false);
  const [out, setOut] = useState(false);
  const [done, setDone] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const checked = useRef(false);

  useEffect(() => {
    if (checked.current) return;
    checked.current = true;
    if (shouldShow(path)) setOpen(true);
  }, [path]);

  const close = useCallback(() => {
    try {
      window.localStorage.setItem(KEY, String(Date.now()));
    } catch {
      /* sessizce geç */
    }
    setOut(true);
    window.setTimeout(() => setOpen(false), 950);
  }, []);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    ref.current?.querySelector<HTMLElement>('input[type=email]')?.focus({ preventScroll: true });
    const key = (e: KeyboardEvent) => e.key === 'Escape' && close();
    document.addEventListener('keydown', key);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener('keydown', key);
    };
  }, [open, close]);

  if (!open) return null;
  const s = (i: number) => ({ '--i': i }) as React.CSSProperties;
  return (
    <div ref={ref} className={`wl${out ? ' is-out' : ''}`} role="dialog" aria-modal="true" aria-labelledby="wl-h">
      <div className="wl-bg" aria-hidden="true">
        <span className="wl-blob wl-b1" />
        <span className="wl-blob wl-b2" />
        <span className="wl-blob wl-b3" />
        <span className="wl-grain" />
      </div>
      <button type="button" className="wl-x" onClick={close} aria-label="Kapat">
        <span aria-hidden="true">×</span>
      </button>
      <div className="wl-in">
        <div className="wl-mascot wl-s" style={s(0)} aria-hidden="true">
          <div className="wl-steam">
            <i />
            <i />
            <i />
          </div>
          <img src="/icon.png" alt="" width={132} height={132} decoding="async" />
        </div>
        <p className="wl-kick wl-s" style={s(1)}>
          Demleme bülteni
        </p>
        <h1 className="wl-h wl-s" id="wl-h" style={s(2)}>
          {[['Demlenmiş', 0], ['haberler', 0], ['kapına', 1], ['gelsin', 0]].map(([w, em], k) => (
            <span key={k}>
              <span className="wl-w">{em ? <em><D>{w as string}</D></em> : <D>{w as string}</D>}</span>{' '}
            </span>
          ))}
        </h1>
        <p className="wl-p wl-s" style={s(3)}>
          Yeni bölümler, konuklar ve ürün duyuruları önce sana gelsin. Bültene katıl, hiçbirini kaçırma.
        </p>
        <div className="wl-form wl-s" style={s(4)}>
          {done ? (
            <p className="wl-ok" role="status">
              Teşekkürler! Aboneliğin alındı. İyi gezintiler ☕
            </p>
          ) : (
            <NewsletterForm source="welcome" label="Bültene katıl" tone="light" onSuccess={() => { setDone(true); window.setTimeout(close, 1800); }} />
          )}
        </div>
        {!done && (
          <button type="button" className="wl-skip wl-s" style={s(5)} onClick={close}>
            Şimdilik geç, siteyi gezeyim
          </button>
        )}
      </div>
    </div>
  );
}
