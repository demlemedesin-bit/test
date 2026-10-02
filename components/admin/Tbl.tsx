'use client';
import type { ReactNode } from 'react';

/** Basit tablo: cols = [başlık, genişlik], rows = hücre dizileri. */
export function Tbl({ cols, rows, empty = 'Kayıt yok', min }: { cols: [string, string][]; rows: ReactNode[][]; empty?: string; min?: number }) {
  const g = cols.map((c) => c[1]).join(' ');
  return (
    <div style={{ overflowX: 'auto' }}>
      <div className="tbl" style={{ minWidth: min ?? cols.length * 90 }}>
        <div className="tr hd" style={{ gridTemplateColumns: g }}>{cols.map((c) => <span key={c[0]}>{c[0]}</span>)}</div>
        {rows.length === 0 && <div className="tr" style={{ color: 'var(--tx3)' }}>{empty}</div>}
        {rows.map((r, i) => (
          <div className="tr" key={i} style={{ gridTemplateColumns: g }}>{r.map((c, j) => <span key={j} style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' }}>{c}</span>)}</div>
        ))}
      </div>
    </div>
  );
}

export function Delta({ cur, prev, invert }: { cur: number; prev: number; invert?: boolean }) {
  if (!prev && !cur) return <span style={{ color: 'var(--tx3)' }}>—</span>;
  const v = prev ? ((cur - prev) / prev) * 100 : 100;
  const good = invert ? v <= 0 : v >= 0;
  return <span style={{ color: Math.abs(v) < 0.5 ? 'var(--tx3)' : good ? 'var(--green)' : '#c2410c', fontWeight: 600, fontSize: 12 }}>{v >= 0 ? '▲' : '▼'} %{Math.abs(v).toFixed(0)}</span>;
}

export function Tabs<T extends string>({ items, value, onChange }: { items: readonly (readonly [T, string])[]; value: T; onChange: (v: T) => void }) {
  return (
    <div className="tabs" style={{ marginBottom: 16 }}>
      {items.map(([k, l]) => <button key={k} type="button" className={`tab${value === k ? ' on' : ''}`} onClick={() => onChange(k)}>{l}</button>)}
    </div>
  );
}

export function Card({ title, meta, children }: { title: string; meta?: ReactNode; children: ReactNode }) {
  return (
    <section className="card" style={{ marginBottom: 16 }}>
      <div className="card-h"><h2 className="card-t">{title}</h2>{meta && <span className="card-m">{meta}</span>}</div>
      <div className="card-b" style={{ padding: 0 }}>{children}</div>
    </section>
  );
}
export const n1 = (n: number) => n.toLocaleString('tr-TR', { maximumFractionDigits: 1 });
