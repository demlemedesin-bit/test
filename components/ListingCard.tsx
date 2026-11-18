'use client';

import { useState } from 'react';

type Col = { key?: string; name?: string; hex?: string; img?: string; imgs?: string[]; life?: string; thumb?: string };
export type LCProduct = {
  slug: string; name: string; thumb: string; cat: string; price: string; was?: string; salePct?: number; left?: number;
  out?: boolean; soon?: boolean; badge?: string; sub?: string; showColors?: boolean; colors: Col[];
};

const photos = (k?: Col) => [...new Set([k?.img || '', ...(k?.imgs ?? []), k?.life || ''].filter(Boolean))].slice(0, 6);

export default function ListingCard({ p }: { p: LCProduct }) {
  const [i, setI] = useState(0);
  const k = p.colors[i];
  const main = (i === 0 ? p.thumb : k?.thumb || k?.img) || p.thumb;
  const gal = photos(k);
  const sale = p.was && !p.out && !p.soon;
  const sw = (p.showColors ?? p.colors.length > 1) && p.colors.length > 1;
  return (
    <div className="ls-card">
      <a href={`/urun/${p.slug}`} className="ls-lnk">
        <span className={`ls-img${gal.length ? ' has-gal' : ''}`}>
          {main ? <img className="ls-main" src={main} alt={p.name} loading="lazy" /> : null}
          {gal.length ? <span className="ls-gal" key={i}>{gal.map((u) => <img key={u} src={u} alt={p.name} loading="lazy" draggable={false} />)}</span> : null}
          {sale && p.salePct ? <span className="ls-pct">-%{p.salePct}</span> : null}
          {p.out ? <span className="ls-tag">Tükendi</span> : p.soon ? <span className="ls-tag">Yakında</span> : p.badge ? <span className="ls-tag">{p.badge}</span> : null}
        </span>
        <span className="ls-name">{p.name}</span>
        {p.sub ? <span className="ls-sub">{p.sub}</span> : null}
      </a>
      {sw ? (
        <span className="ls-sw" role="group" aria-label="Renk seç">
          {p.colors.slice(0, 6).map((c, j) => (
            <button key={c.key || j} type="button" className={j === i ? 'is-on' : ''} style={{ ['--c' as string]: c.hex || '#ccc' }} title={c.name} aria-label={c.name} aria-pressed={j === i}
              onMouseEnter={() => setI(j)} onClick={() => setI(j)} />
          ))}
          {p.colors.length > 6 ? <em>+{p.colors.length - 6}</em> : null}
        </span>
      ) : null}
      <a href={`/urun/${p.slug}`} className="ls-lnk">
        <span className="ls-cat">{p.cat}</span>
        <span className="ls-price">
          {sale ? <s>{p.was}</s> : null}
          <b className={sale ? 'sale' : ''}>{p.price}</b>
        </span>
        {p.left && !p.out ? <span className="ls-low">Son {p.left} adet</span> : null}
      </a>
    </div>
  );
}
