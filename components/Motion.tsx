'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import './Motion.css';

// Kaydırınca belirecek bloklar (ilk ekrandakilere dokunulmaz → LCP ve ilk görünüm bozulmaz).
const BLOCKS = 'main.page > *, section.shop, section.konuk, section.demley, section.section, .sh-card, .more, .px-rev, .px-extra, .cart-rec, footer, .pf';
const CARDS = '.sh-card, .more-row > a, article';

/**
 * Site genelinde: görsellerin lazy-load + yumuşak belirmesi, bölümlerin kaydırınca belirmesi,
 * sayfa geçişlerinde üst ilerleme çizgisi. Yalnızca görünümü etkiler; içerik JS'siz de erişilebilir.
 */
export function Motion() {
  const path = usePathname();
  const bar = useRef<HTMLDivElement>(null);

  // Rota değişimi: ilerleme çizgisi
  useEffect(() => {
    const b = bar.current;
    if (!b) return;
    b.className = 'mo-bar end';
    return () => {
      if (!b) return;
      b.className = 'mo-bar';
      void b.offsetWidth;
      b.className = 'mo-bar run';
    };
  }, [path]);

  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const vh = window.innerHeight;

    // Görseller: yüklenince göster (data-ld), hata olsa da görünür kalsın
    const mark = (el: Element) => el.setAttribute('data-ld', '1');
    const imgDone = (e: Event) => e.target instanceof HTMLImageElement && mark(e.target);
    document.addEventListener('load', imgDone, true);
    document.addEventListener('error', imgDone, true);
    const scanImgs = () =>
      document.querySelectorAll<HTMLImageElement>('img[loading="lazy"]:not([data-ld])').forEach((im) => {
        if (im.complete && im.naturalWidth > 0) mark(im);
      });
    scanImgs();
    const imgFail = window.setTimeout(() => document.querySelectorAll('img[loading="lazy"]:not([data-ld])').forEach(mark), 6000);

    // Bölümler
    let io: IntersectionObserver | null = null;
    const timers: number[] = [];
    if (!reduce && 'IntersectionObserver' in window) {
      io = new IntersectionObserver(
        (es) =>
          es.forEach((e) => {
            if (!e.isIntersecting) return;
            const el = e.target as HTMLElement;
            io?.unobserve(el);
            el.setAttribute('data-rv', 'in');
          }),
        { threshold: 0.06, rootMargin: '0px 0px -6% 0px' },
      );
      const seen = new WeakSet<Element>();
      const scan = () => {
        let n = 0;
        document.querySelectorAll<HTMLElement>(BLOCKS).forEach((el) => {
          if (seen.has(el) || el.hasAttribute('data-rv')) return;
          seen.add(el);
          const r = el.getBoundingClientRect();
          if (r.top < vh * 0.95) return; // ilk ekran: hemen görünür kalsın
          if (r.left > window.innerWidth * 0.98 || r.right < 0) return; // yatay kaydırmalı satırlar: kendi kaydırması yönetir
          if (el.parentElement?.closest('[data-rv]')) return; // üst blok zaten beliriyor
          if (el.closest('.wl, dialog, [role="dialog"], [aria-hidden="true"]')) return;
          el.setAttribute('data-rv', el.matches(CARDS) ? 'card' : 'sec');
          el.style.setProperty('--rv-d', `${(n++ % 4) * 80}ms`);
          io?.observe(el);
        });
      };
      scan();
      timers.push(window.setTimeout(scan, 700), window.setTimeout(scan, 2000));
      // Güvenlik ağı: bir şey takılırsa 8 sn sonra hepsi açılsın
      timers.push(
        window.setTimeout(() => document.querySelectorAll('[data-rv]:not([data-rv="in"])').forEach((el) => el.setAttribute('data-rv', 'in')), 8000),
      );
    }
    const mo = new MutationObserver(() => scanImgs());
    mo.observe(document.body, { childList: true, subtree: true });

    return () => {
      document.removeEventListener('load', imgDone, true);
      document.removeEventListener('error', imgDone, true);
      window.clearTimeout(imgFail);
      timers.forEach(window.clearTimeout);
      io?.disconnect();
      mo.disconnect();
    };
  }, [path]);

  return <div ref={bar} className="mo-bar" aria-hidden="true" />;
}
