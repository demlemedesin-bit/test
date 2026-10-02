'use client';

import { useState, type DragEvent, type ReactNode } from 'react';
import { ArrowDown, ArrowUp, ImagePlus, Plus, RotateCcw, Trash2 } from 'lucide-react';
import { uploadImageDetailed } from '@/lib/admin';
import { checkImageFile, fmtBytes, gainText, getMediaSettings } from '@/lib/media';
import { Spinner } from './ui';

/** Görsel alanı: önizleme + yükleme (ayarlara göre sıkıştırılır) + sürükle-bırak + adres. */
export function ImageInput({ value, onChange, onError, folder = 'site', round }: { value: string; onChange: (v: string) => void; onError?: (m: string) => void; folder?: string; round?: boolean }) {
  const [busy, setBusy] = useState(false);
  const [over, setOver] = useState(false);
  const [info, setInfo] = useState('');
  const [err, setErr] = useState('');
  async function pick(f?: File) {
    if (!f || busy) return;
    setErr('');
    setInfo('');
    setBusy(true);
    try {
      const s = await getMediaSettings();
      checkImageFile(f, s);
      const r = await uploadImageDetailed(f, folder, s);
      onChange(r.url);
      setInfo(r.untouched ? `${fmtBytes(r.after)} (olduğu gibi yüklendi)` : gainText(r.before, r.after));
    } catch (e) {
      const m = e instanceof Error ? e.message : 'bilinmeyen hata';
      setErr(m);
      onError?.(m);
    }
    setBusy(false);
  }
  function drop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) pick(f);
  }
  return (
    <div
      style={{ display: 'flex', gap: 12, alignItems: 'center', borderRadius: 14, outline: over ? '2px dashed var(--ac)' : undefined, outlineOffset: 4, background: over ? 'var(--ac3)' : undefined }}
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={drop}
    >
      <label className="up" style={{ flexShrink: 0, borderRadius: round ? '50%' : undefined, opacity: busy ? 0.6 : 1 }} title="Görsel yükle ya da sürükle">
        {busy ? (
          <Spinner size={18} />
        ) : value ? (
           
          <img src={value} alt="" />
        ) : (
          <ImagePlus size={20} />
        )}
        <input
          type="file"
          accept="image/*"
          disabled={busy}
          onChange={(e) => {
            pick(e.target.files?.[0]);
            e.target.value = '';
          }}
        />
      </label>
      <div style={{ flex: 1, minWidth: 0 }}>
        <input className="inp" value={value} onChange={(e) => onChange(e.target.value)} placeholder="Yükle, sürükle ya da adres yapıştır" />
        {busy && <span className="hint">Sıkıştırılıp yükleniyor…</span>}
        {!busy && err && <span className="hint" style={{ color: 'var(--red)' }}>{err}</span>}
        {!busy && !err && info && <span className="hint" style={{ color: 'var(--green)' }}>{info}</span>}
      </div>
    </div>
  );
}

/** Yukarı / aşağı / sil düğmeleri. */
export function RowTools({ i, n, move, remove }: { i: number; n: number; move: (d: number) => void; remove: () => void }) {
  return (
    <div style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
      <button type="button" className="icon-btn" disabled={i === 0} onClick={() => move(-1)} title="Yukarı"><ArrowUp size={15} /></button>
      <button type="button" className="icon-btn" disabled={i === n - 1} onClick={() => move(1)} title="Aşağı"><ArrowDown size={15} /></button>
      <button type="button" className="icon-btn" onClick={remove} title="Sil"><Trash2 size={15} /></button>
    </div>
  );
}

export const moved = <T,>(a: T[], i: number, d: number): T[] => {
  const j = i + d;
  if (j < 0 || j >= a.length) return a;
  const b = a.slice();
  [b[i], b[j]] = [b[j], b[i]];
  return b;
};
export const setAt = <T,>(a: T[], i: number, v: Partial<T>): T[] => a.map((x, k) => (k === i ? { ...x, ...v } : x));
export const without = <T,>(a: T[], i: number): T[] => a.filter((_, k) => k !== i);

export function AddBtn({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" className="btn ghost sm" onClick={onClick}>
      <Plus size={14} /> {children}
    </button>
  );
}

export function ResetBtn({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" className="icon-btn" onClick={onClick} title="Varsayılana dön">
      <RotateCcw size={14} />
    </button>
  );
}
