'use client';

import { useEffect } from 'react';

/**
 * Yönetim panelindeki kısa listeli <select>'leri (2–5 seçenek) buton grubuna çevirir.
 * Gerçek select gizli kalır; butona basınca değer ve "change" olayı React'e iletilir, form mantığı değişmez.
 * Uzun listeler ve tablo içindeki küçük seçiciler açılır liste olarak (özel stille) kalır.
 */
const setVal = (el: HTMLSelectElement, v: string) => {
  const set = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value')?.set;
  set?.call(el, v);
  el.dispatchEvent(new Event('change', { bubbles: true }));
};

function eligible(s: HTMLSelectElement): boolean {
  if (s.dataset.noseg !== undefined || s.multiple) return false;
  const n = s.options.length;
  if (n < 2 || n > 5) return false;
  if (s.closest('.tr, .tbl, td, th, .tools, .tb')) return false;
  const total = Array.from(s.options).reduce((a, o) => a + o.text.length, 0);
  return total <= 64;
}

function build(s: HTMLSelectElement) {
  if (s.dataset.seg === '1') return;
  s.dataset.seg = '1';
  const box = document.createElement('div');
  box.className = 'seg seg-auto';
  box.setAttribute('role', 'group');
  if (s.getAttribute('aria-label')) box.setAttribute('aria-label', s.getAttribute('aria-label') as string);
  s.style.display = 'none';
  s.after(box);
  fill(s, box);
}

function fill(s: HTMLSelectElement, box: HTMLElement) {
  const sig = Array.from(s.options).map((o) => o.value + '' + o.text).join('');
  if (box.dataset.sig !== sig) {
    box.dataset.sig = sig;
    box.innerHTML = '';
    Array.from(s.options).forEach((o) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = o.text;
      b.dataset.v = o.value;
      b.addEventListener('click', () => { if (!s.disabled) setVal(s, o.value); });
      box.appendChild(b);
    });
  }
  Array.from(box.children).forEach((c) => {
    const b = c as HTMLButtonElement;
    const on = b.dataset.v === s.value;
    if (b.classList.contains('on') !== on) b.classList.toggle('on', on);
    b.setAttribute('aria-pressed', on ? 'true' : 'false');
    if (b.disabled !== s.disabled) b.disabled = s.disabled;
  });
}

function sweep() {
  document.querySelectorAll<HTMLSelectElement>('.adm select').forEach((s) => {
    if (s.dataset.seg === '1') {
      const box = s.nextElementSibling as HTMLElement | null;
      if (box && box.classList.contains('seg-auto')) {
        if (!eligible(s)) { s.style.display = ''; box.remove(); s.dataset.seg = ''; } else fill(s, box);
      } else { s.style.display = ''; s.dataset.seg = ''; }
    } else if (eligible(s)) build(s);
  });
}

export function SelectSeg() {
  useEffect(() => {
    sweep();
    const mo = new MutationObserver(() => requestAnimationFrame(sweep));
    mo.observe(document.body, { childList: true, subtree: true });
    const t = setInterval(sweep, 400);
    return () => { mo.disconnect(); clearInterval(t); };
  }, []);
  return null;
}
