'use client';

import { useState, type ReactNode } from 'react';
import { ArrowDown, ArrowUp, ImagePlus, Plus, RotateCcw, Trash2 } from 'lucide-react';
import { uploadImage } from '@/lib/admin';

/** Görsel alanı: önizleme + yükleme (WebP'ye çevrilir) + adres. */
export function ImageInput({ value, onChange, onError, folder = 'site', round }: { value: string; onChange: (v: string) => void; onError?: (m: string) => void; folder?: string; round?: boolean }) {
  const [busy, setBusy] = useState(false);
  async function pick(f?: File) {
    if (!f) return;
    setBusy(true);
    try {
      onChange(await uploadImage(f, folder));
    } catch (e) {
      onError?.('Görsel yüklenemedi: ' + (e instanceof Error ? e.message : 'bilinmeyen hata'));
    }
    setBusy(false);
  }
  return (
    <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
      <label className="up" style={{ flexShrink: 0, borderRadius: round ? '50%' : undefined }} title="Görsel yükle">
        {value ? (
           
          <img src={value} alt="" />
        ) : (
          <ImagePlus size={20} />
        )}
        <input type="file" accept="image/*" onChange={(e) => pick(e.target.files?.[0])} />
      </label>
      <div style={{ flex: 1, minWidth: 0 }}>
        <input className="inp" value={value} onChange={(e) => onChange(e.target.value)} placeholder="Yükle ya da adres yapıştır" />
        {busy && <span className="hint">Yükleniyor…</span>}
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
