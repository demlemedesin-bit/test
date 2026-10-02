'use client';

import { useRef, useState, type DragEvent } from 'react';
import { ArrowLeft, ArrowRight, ImagePlus, Link2, UploadCloud, X } from 'lucide-react';
import { uploadImageDetailed } from '@/lib/admin';
import { checkImageFile, fmtBytes, getMediaSettings } from '@/lib/media';
import { Spinner } from './ui';

async function send(f: File, folder: string): Promise<{ url: string; note: string }> {
  const s = await getMediaSettings();
  checkImageFile(f, s);
  const r = await uploadImageDetailed(f, folder, s);
  return { url: r.url, note: r.untouched ? fmtBytes(r.after) : `${fmtBytes(r.before)} → ${fmtBytes(r.after)}` };
}
const msg = (e: unknown) => (e instanceof Error ? e.message : 'Yüklenemedi');
const isImg = (f: File) => /^image\//.test(f.type);

/** Tek görsel kutusu: tıkla, sürükle-bırak ya da adres yapıştır. Önizleme, kaldır ve sıkıştırma bilgisi içerir. */
export function ImageSlot({ value, onChange, folder, onError, size = 96, label }: { value: string; onChange: (v: string) => void; folder: string; onError?: (m: string) => void; size?: number; label?: string }) {
  const [busy, setBusy] = useState(false);
  const [over, setOver] = useState(false);
  const [url, setUrl] = useState(false);
  const [note, setNote] = useState('');
  const file = useRef<HTMLInputElement>(null);
  async function pick(f?: File) {
    if (!f || busy) return;
    if (!isImg(f)) return onError?.('Yalnızca görsel dosyası yükleyebilirsin.');
    setBusy(true);
    try {
      const r = await send(f, folder);
      onChange(r.url);
      setNote(r.note);
    } catch (e) {
      onError?.(msg(e));
    }
    setBusy(false);
  }
  function drop(e: DragEvent) {
    e.preventDefault();
    setOver(false);
    pick(e.dataTransfer.files?.[0]);
  }
  return (
    <div style={{ width: size }}>
      <div
        className="slot"
        role="button"
        tabIndex={0}
        aria-label={label || 'Görsel yükle'}
        title="Tıkla ya da görseli buraya sürükle"
        onClick={() => file.current?.click()}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), file.current?.click())}
        onDragOver={(e) => { e.preventDefault(); setOver(true); }}
        onDragLeave={() => setOver(false)}
        onDrop={drop}
        style={{ width: size, height: size, borderColor: over ? 'var(--ac)' : undefined, background: over ? 'var(--ac3)' : undefined }}
      >
        {busy ? <Spinner size={20} /> : value ? <img src={value} alt="" /> : <span className="slot-h"><UploadCloud size={20} /><small>Sürükle<br />ya da tıkla</small></span>}
        {value && !busy && (
          <button type="button" className="slot-x" aria-label="Görseli kaldır" onClick={(e) => { e.stopPropagation(); onChange(''); setNote(''); }}><X size={13} /></button>
        )}
        <input ref={file} type="file" accept="image/*" hidden onChange={(e) => { pick(e.target.files?.[0]); e.target.value = ''; }} />
      </div>
      <button type="button" className="slot-u" onClick={() => setUrl((v) => !v)}><Link2 size={12} /> Adres</button>
      {url && <input className="inp" style={{ marginTop: 6, fontSize: 12, padding: '6px 8px' }} placeholder="https://…" value={value} onChange={(e) => onChange(e.target.value.trim())} />}
      {note && <span className="hint" style={{ color: 'var(--green)', display: 'block' }}>{note}</span>}
    </div>
  );
}

/** Çoklu görsel alanı: birden fazla dosyayı sürükleyip bırak; sırala, kaldır. */
export function GalleryInput({ value, onChange, folder, onError, max = 10 }: { value: string[]; onChange: (v: string[]) => void; folder: string; onError?: (m: string) => void; max?: number }) {
  const [busy, setBusy] = useState(0);
  const [over, setOver] = useState(false);
  const file = useRef<HTMLInputElement>(null);
  const cur = useRef(value);
  cur.current = value;
  async function many(list: FileList | File[]) {
    const fs = Array.from(list).filter(isImg);
    if (!fs.length) return onError?.('Yalnızca görsel dosyası yükleyebilirsin.');
    const room = max - cur.current.length;
    if (room <= 0) return onError?.(`En fazla ${max} görsel eklenebilir.`);
    if (fs.length > room) onError?.(`En fazla ${max} görsel eklenebilir; ilk ${room} tanesi yüklenecek.`);
    setBusy((n) => n + Math.min(fs.length, room));
    await Promise.all(
      fs.slice(0, room).map(async (f) => {
        try {
          const r = await send(f, folder);
          cur.current = [...cur.current, r.url];
          onChange(cur.current);
        } catch (e) {
          onError?.(`${f.name}: ${msg(e)}`);
        }
        setBusy((n) => n - 1);
      }),
    );
  }
  const mv = (i: number, d: -1 | 1) => { const a = [...value]; const j = i + d; if (j < 0 || j >= a.length) return; [a[i], a[j]] = [a[j], a[i]]; onChange(a); };
  return (
    <div>
      <div
        className="gal-drop"
        onDragOver={(e) => { e.preventDefault(); setOver(true); }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => { e.preventDefault(); setOver(false); many(e.dataTransfer.files); }}
        onClick={() => file.current?.click()}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), file.current?.click())}
        style={{ borderColor: over ? 'var(--ac)' : undefined, background: over ? 'var(--ac3)' : undefined }}
      >
        <UploadCloud size={26} />
        <b>Görselleri buraya sürükle ya da tıkla</b>
        <span>Birden fazla dosya seçebilirsin · otomatik küçültülür ve WebP’ye çevrilir · en fazla {max}</span>
        <input ref={file} type="file" accept="image/*" multiple hidden onChange={(e) => { if (e.target.files) many(e.target.files); e.target.value = ''; }} />
      </div>
      {(value.length > 0 || busy > 0) && (
        <div className="gal-grid">
          {value.map((u, i) => (
            <div className="gal-it" key={u + i}>
              <img src={u} alt="" />
              <div className="gal-bar">
                <button type="button" aria-label="Sola" onClick={() => mv(i, -1)} disabled={i === 0}><ArrowLeft size={13} /></button>
                <button type="button" aria-label="Sağa" onClick={() => mv(i, 1)} disabled={i === value.length - 1}><ArrowRight size={13} /></button>
                <button type="button" aria-label="Kaldır" onClick={() => onChange(value.filter((_, j) => j !== i))}><X size={13} /></button>
              </div>
            </div>
          ))}
          {Array.from({ length: busy }).map((_, i) => <div className="gal-it gal-wait" key={'w' + i}><Spinner size={18} /></div>)}
        </div>
      )}
      {value.length === 0 && busy === 0 && <p className="hint" style={{ marginTop: 6 }}><ImagePlus size={12} style={{ verticalAlign: -2 }} /> Renk görsellerine ek olarak ürün sayfasında küçük resim şeridinde gösterilir.</p>}
    </div>
  );
}
