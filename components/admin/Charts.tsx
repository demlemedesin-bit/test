'use client';
import { useEffect, useId, useRef, useState } from 'react';

/** Sayıyı 0'dan hedefe kaydıran animasyon (Kpi için). */
export function useCountUp(target: number, duration = 900) {
  const [v, setV] = useState(0);
  useEffect(() => {
    if (!isFinite(target)) return;
    const t0 = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const p = Math.min((now - t0) / duration, 1);
      setV(target * (1 - Math.pow(1 - p, 3)));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return v;
}

export function Sparkline({ data, color = 'var(--ac)', w = 84, h = 30 }: { data: number[]; color?: string; w?: number; h?: number }) {
  const id = useId().replace(/:/g, '');
  if (data.length < 2) return null;
  const mx = Math.max(...data), mn = Math.min(...data), rg = mx - mn || 1, st = w / (data.length - 1);
  const pts = data.map((v, i) => [i * st, h - 3 - ((v - mn) / rg) * (h - 7)]);
  const line = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
  const last = pts[pts.length - 1];
  return (
    <svg width={w} height={h} style={{ display: 'block', overflow: 'visible' }} aria-hidden="true">
      <defs><linearGradient id={id} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={color} stopOpacity=".35" /><stop offset="100%" stopColor={color} stopOpacity="0" /></linearGradient></defs>
      <path d={`${line} L${w},${h} L0,${h} Z`} fill={`url(#${id})`} />
      <path d={line} stroke={color} strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={last[0]} cy={last[1]} r="2.6" fill={color} />
    </svg>
  );
}

export type Pt = { label: string; value: number; note?: string };

/** Yumuşak alan grafiği: gradyan dolgu, çizim animasyonu, imleçle ipucu. */
export function AreaChart({ data, height = 220, fmt = (n: number) => String(Math.round(n)), color = 'var(--ac)' }: { data: Pt[]; height?: number; fmt?: (n: number) => string; color?: string }) {
  const id = useId().replace(/:/g, '');
  const box = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(640);
  const [hi, setHi] = useState<number | null>(null);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setW(el.clientWidth || 640));
    ro.observe(el);
    setW(el.clientWidth || 640);
    return () => ro.disconnect();
  }, []);
  const pad = { l: 8, r: 8, t: 14, b: 24 };
  const iw = Math.max(w - pad.l - pad.r, 10), ih = height - pad.t - pad.b;
  const mx = Math.max(...data.map((d) => d.value), 1);
  const x = (i: number) => pad.l + (data.length < 2 ? iw / 2 : (i / (data.length - 1)) * iw);
  const y = (v: number) => pad.t + ih - (v / mx) * ih;
  const P = data.map((d, i) => [x(i), y(d.value)] as const);
  const path = P.reduce((s, p, i) => {
    if (!i) return `M${p[0]},${p[1]}`;
    const q = P[i - 1], cx = (q[0] + p[0]) / 2;
    return `${s} C${cx},${q[1]} ${cx},${p[1]} ${p[0]},${p[1]}`;
  }, '');
  const area = P.length ? `${path} L${P[P.length - 1][0]},${pad.t + ih} L${P[0][0]},${pad.t + ih} Z` : '';
  const grid = [0, 0.25, 0.5, 0.75, 1];
  const step = Math.max(1, Math.ceil(data.length / 8));
  function move(e: React.MouseEvent) {
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const i = Math.round(((e.clientX - r.left - pad.l) / iw) * (data.length - 1));
    setHi(Math.max(0, Math.min(data.length - 1, i)));
  }
  return (
    <div ref={box} className="ac-wrap" style={{ height }} onMouseMove={move} onMouseLeave={() => setHi(null)}>
      <svg width={w} height={height} role="img" aria-label="Grafik">
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={color} stopOpacity=".38" /><stop offset="100%" stopColor={color} stopOpacity="0" /></linearGradient>
        </defs>
        {grid.map((g) => <line key={g} x1={pad.l} x2={w - pad.r} y1={pad.t + ih * (1 - g)} y2={pad.t + ih * (1 - g)} stroke="var(--bdr)" strokeDasharray={g ? '3 5' : undefined} />)}
        <path d={area} fill={`url(#${id})`} className="ac-area" />
        <path d={path} fill="none" stroke={color} strokeWidth="2.4" strokeLinecap="round" className="ac-line" pathLength={1} />
        {data.map((d, i) => (i % step === 0 ? <text key={i} x={x(i)} y={height - 6} fontSize="10.5" fill="var(--tx3)" textAnchor="middle">{d.label}</text> : null))}
        {hi != null && P[hi] && (
          <g>
            <line x1={P[hi][0]} x2={P[hi][0]} y1={pad.t} y2={pad.t + ih} stroke={color} strokeOpacity=".35" />
            <circle cx={P[hi][0]} cy={P[hi][1]} r="5" fill="var(--s1)" stroke={color} strokeWidth="2.4" />
          </g>
        )}
      </svg>
      {hi != null && P[hi] && (
        <div className="ac-tip" style={{ left: Math.min(Math.max(P[hi][0], 70), w - 70), top: Math.max(P[hi][1] - 58, 0) }}>
          <b>{fmt(data[hi].value)}</b><span>{data[hi].label}{data[hi].note ? ` · ${data[hi].note}` : ''}</span>
        </div>
      )}
    </div>
  );
}

export type Seg = { label: string; value: number; color: string };
export function Donut({ segs, size = 150, center }: { segs: Seg[]; size?: number; center?: { big: string; small: string } }) {
  const total = segs.reduce((n, s) => n + s.value, 0);
  const r = size / 2 - 11, c = 2 * Math.PI * r;
  let off = 0;
  return (
    <div className="dn-wrap">
      <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
        <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }} role="img" aria-label="Dağılım">
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--s3)" strokeWidth="14" />
          {total > 0 && segs.filter((s) => s.value > 0).map((s) => {
            const len = (s.value / total) * c;
            const el = <circle key={s.label} cx={size / 2} cy={size / 2} r={r} fill="none" stroke={s.color} strokeWidth="14" strokeDasharray={`${Math.max(len - 2, 0)} ${c}`} strokeDashoffset={-off} strokeLinecap="round" className="dn-seg" />;
            off += len;
            return el;
          })}
        </svg>
        {center && <div className="dn-c"><b>{center.big}</b><span>{center.small}</span></div>}
      </div>
      <ul className="dn-leg">
        {segs.map((s) => <li key={s.label}><i style={{ background: s.color }} />{s.label}<b>{s.value}</b></li>)}
      </ul>
    </div>
  );
}

export function HBars({ rows, fmt = (n: number) => String(n) }: { rows: { label: string; value: number }[]; fmt?: (n: number) => string }) {
  const mx = Math.max(...rows.map((r) => r.value), 1);
  return (
    <div className="hb">
      {rows.map((r, i) => (
        <div className="hb-r" key={r.label + i}>
          <span className="hb-l">{r.label}</span><b>{fmt(r.value)}</b>
          <div className="hb-t"><i style={{ width: `${(r.value / mx) * 100}%`, animationDelay: `${i * 70}ms` }} /></div>
        </div>
      ))}
    </div>
  );
}
