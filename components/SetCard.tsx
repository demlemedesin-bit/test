'use client';

import { useMemo, useState } from 'react';
import { readCart, writeCart, lineKey, MAX_QTY, type CartItem } from '@/lib/cart';
import { setSaving, type SetView } from '@/lib/setsConst';
import './Sets.css';

const tl = (n: number) => '₺' + n.toLocaleString('tr-TR', { minimumFractionDigits: Number.isInteger(n) ? 0 : 2, maximumFractionDigits: 2 });

/** Set kartı: ürün görselleri yanyana, ürün/renk seçimi ve "Sete ekle". Sepete set içindeki ürünler normal satır olarak eklenir; set indirimi sepette otomatik uygulanır. */
export default function SetCard({ v }: { v: SetView }) {
  const units = useMemo(() => v.slots.flatMap((s, si) => Array.from({ length: s.qty }, (_, k) => ({ si, k, label: s.label }))), [v.slots]);
  const [pick, setPick] = useState<number[]>(() => units.map(() => 0));
  const [done, setDone] = useState(false);

  const chosen = units.map((u, i) => v.slots[u.si].opts[Math.min(pick[i] ?? 0, v.slots[u.si].opts.length - 1)]);
  const normal = chosen.reduce((n, o) => n + o.price, 0);
  const save = Math.max(0, normal - v.price);
  const pct = normal > 0 ? Math.round((save / normal) * 1000) / 10 : 0;
  const hasPick = v.slots.some((s) => s.opts.length > 1);
  const { pct: basePct } = setSaving(v);

  function add() {
    const cart = readCart();
    for (const o of chosen) {
      const line: CartItem = { slug: o.slug, color: o.color, size: '', name: o.label, price: tl(o.price), qty: 1, img: o.img || undefined };
      const key = lineKey(line);
      const at = cart.findIndex((c) => lineKey(c) === key);
      if (at >= 0) cart[at] = { ...cart[at], qty: Math.min(MAX_QTY, cart[at].qty + 1) };
      else cart.push(line);
    }
    writeCart(cart);
    setDone(true);
    setTimeout(() => setDone(false), 4000);
  }

  return (
    <article className="st-card" id={v.slug}>
      <div className={`st-tiles st-n${Math.min(chosen.length, 4)}`}>
        {chosen.map((o, i) => (
          <span key={i} className="st-tilewrap">
            {i > 0 ? <i className="st-plus" aria-hidden="true">+</i> : null}
            <span className="st-tile">{o.img ? <img src={o.img} alt={o.label} loading="lazy" /> : null}</span>
          </span>
        ))}
        {pct > 0 || basePct > 0 ? <span className="st-pct">-%{String(pct || basePct).replace('.', ',')}</span> : null}
      </div>
      <h3 className="st-name">{v.name}</h3>
      {v.subtitle ? <p className="st-sub">{v.subtitle}</p> : null}
      <p className="st-pill">{v.slots.map((s) => `${s.qty > 1 ? s.qty + '× ' : ''}${s.label || s.opts[0]?.label}`).join(' + ')}</p>

      {hasPick || v.slots.some((s) => s.qty > 1) ? (
        <div className="st-pick">
          {units.map((u, i) => {
            const opts = v.slots[u.si].opts;
            return opts.length > 1 ? (
              <label key={i}>
                <span>{u.label || 'Ürün'}{v.slots[u.si].qty > 1 ? ` ${u.k + 1}` : ''}</span>
                <select value={Math.min(pick[i] ?? 0, opts.length - 1)} onChange={(e) => setPick((p) => p.map((x, j) => (j === i ? Number(e.target.value) : x)))}>
                  {opts.map((o, j) => <option key={o.slug + o.color} value={j}>{o.label}</option>)}
                </select>
              </label>
            ) : null;
          })}
        </div>
      ) : null}

      <p className="st-price">
        {save > 0 ? <s>{tl(normal)}</s> : null}
        <b>{tl(v.price)}</b>
        {save > 0 ? <em>{tl(save)} kazan</em> : null}
      </p>
      <button type="button" className="st-add" onClick={add}>{done ? 'Sepete eklendi ✓' : 'Sete ekle'}</button>
      {done ? <a className="st-go" href="/sepet">Sepete git →</a> : null}
    </article>
  );
}
