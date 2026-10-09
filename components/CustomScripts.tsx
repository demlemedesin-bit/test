'use client';
import { useEffect } from 'react';
import type { Scripts } from '@/lib/design';

/** Panelden eklenen özel betikler (Tasarım → Betikler). need_consent açıksa pazarlama çerezi onayından sonra yüklenir. */
function inject(html: string, where: 'head' | 'body') {
  if (!html.trim()) return;
  const tpl = document.createElement('template');
  tpl.innerHTML = html;
  const host = where === 'head' ? document.head : document.body;
  tpl.content.childNodes.forEach((n) => {
    if (n.nodeName === 'SCRIPT') {
      const o = n as HTMLScriptElement;
      const s = document.createElement('script');
      for (const a of Array.from(o.attributes)) s.setAttribute(a.name, a.value);
      s.text = o.text;
      host.appendChild(s);
    } else host.appendChild(n.cloneNode(true));
  });
}
export function CustomScripts({ cfg }: { cfg: Scripts }) {
  useEffect(() => {
    if (location.pathname.startsWith('/admin')) return;
    let done = false;
    const run = () => {
      if (done) return;
      if (cfg.need_consent) {
        try {
          const c = JSON.parse(localStorage.getItem('dm-consent') || 'null');
          if (!c?.marketing) return;
        } catch { return; }
      }
      done = true;
      inject(cfg.head, 'head');
      inject(cfg.body_end, 'body');
    };
    run();
    window.addEventListener('dm-consent', run);
    return () => window.removeEventListener('dm-consent', run);
  }, [cfg]);
  return null;
}
