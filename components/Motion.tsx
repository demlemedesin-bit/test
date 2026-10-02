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
const TR = /[ŞşĞğİıi]/;
const TR_MAP: Record<string, [string, string]> = { Ş: ['S', 'tg-ced'], ş: ['s', 'tg-ced'], Ğ: ['G', 'tg-brv'], ğ: ['g', 'tg-brv'], İ: ['I', 'tg-dot'], i: ['I', 'tg-dot'], ı: ['I', ''] };

/** Strenuous'ta Ş ş Ğ ğ İ ı yok: bu fontla yazılan metindeki harfleri çizilmiş karşılıklarıyla tamamlar (sitenin her yerinde, sonradan gelen metinde de). */
function fixGlyphs(root: Node) {
  if (!(root instanceof Element) && root.nodeType !== 3) return;
  const base = root.nodeType === 3 ? root.parentElement : (root as Element);
  if (!base) return;
  const cache = new Map<Element, boolean>();
  const isDisplay = (el: Element) => {
    let v = cache.get(el);
    if (v === undefined) {
      v = /strenuous/i.test(getComputedStyle(el).fontFamily.split(',')[0] || '');
      cache.set(el, v);
    }
    return v;
  };
  const w = document.createTreeWalker(root.nodeType === 3 ? (root.parentElement as Node) : root, NodeFilter.SHOW_TEXT);
  const hits: Text[] = [];
  let n: Node | null;
  while ((n = w.nextNode())) {
    const t = n as Text;
    const el = t.parentElement;
    if (!el || !TR.test(t.nodeValue || '') || el.closest('script,style,textarea,input,.tg,[data-no-tg]')) continue;
    if (isDisplay(el)) hits.push(t);
  }
  hits.forEach((t) => {
    const frag = document.createDocumentFragment();
    (t.nodeValue || '').split(/([ŞşĞğİıi])/).forEach((part) => {
      const m = TR_MAP[part];
      if (m) {
        const sp = document.createElement('span');
        sp.className = `tg ${m[1]}`.trim();
        sp.setAttribute('data-ch', part);
        sp.textContent = m[0];
        frag.appendChild(sp);
      } else if (part) frag.appendChild(document.createTextNode(part));
    });
    t.replaceWith(frag);
  });
}

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
    let gt = 0;
    const pend = new Set<Node>();
    const flush = () => {
      pend.forEach((nd) => nd.isConnected && fixGlyphs(nd));
      pend.clear();
    };
    const mo = new MutationObserver((ms) => {
      scanImgs();
      ms.forEach((m) => m.addedNodes.forEach((nd) => (nd.nodeType === 1 || nd.nodeType === 3) && pend.add(nd)));
      if (pend.size) {
        window.clearTimeout(gt);
        gt = window.setTimeout(flush, 30);
      }
    });
    mo.observe(document.body, { childList: true, subtree: true });
    timers.push(window.setTimeout(() => fixGlyphs(document.body), 60));
    // yazı tipi geç yüklenirse (hesaplanan font değişir) bir kez daha tara
    document.fonts?.ready.then(() => fixGlyphs(document.body));

    return () => {
      document.removeEventListener('load', imgDone, true);
      document.removeEventListener('error', imgDone, true);
      window.clearTimeout(imgFail);
      window.clearTimeout(gt);
      timers.forEach(window.clearTimeout);
      io?.disconnect();
      mo.disconnect();
    };
  }, [path]);

  return <div ref={bar} className="mo-bar" aria-hidden="true" />;
}
