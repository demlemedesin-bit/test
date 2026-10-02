'use client';

import { useEffect, useState } from 'react';
import './AnnounceBar.css';

export type AnnounceData = { on: boolean; text: string; url: string; bg: 'ink' | 'accent' | 'cream' };

const KEY = 'dm-announce-x';
const safeUrl = (u: string) => (/^(\/(?![/\\])|https?:\/\/|mailto:|tel:)/i.test(u.trim()) ? u.trim() : '');

/** Kapatılabilir duyuru şeridi. Kapatma yalnızca o oturum için (sessionStorage) ve yalnızca o metin için geçerlidir. */
export function AnnounceBar({ a, preview }: { a: AnnounceData; preview?: boolean }) {
  const [gone, setGone] = useState(false);
  const text = a.text.trim();

  useEffect(() => {
    if (preview) return;
    const x = setTimeout(() => {
      try {
        setGone(sessionStorage.getItem(KEY) === text);
      } catch {
        /* depolama kapalıysa şerit görünür kalır */
      }
    }, 0);
    return () => clearTimeout(x);
  }, [text, preview]);

  if (!a.on || !text || gone) return null;
  const url = safeUrl(a.url);
  const ext = /^https?:/i.test(url);

  function close() {
    setGone(true);
    try {
      sessionStorage.setItem(KEY, text);
    } catch {
      /* sessizce geç */
    }
  }

  return (
    <div className={`ann${a.bg === 'accent' ? ' ann--accent' : a.bg === 'cream' ? ' ann--cream' : ''}`} role="region" aria-label="Duyuru">
      <span>
        {url ? (
          <a href={url} {...(ext ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>
            {text}
          </a>
        ) : (
          text
        )}
      </span>
      {!preview && (
        <button type="button" className="ann-x" onClick={close} aria-label="Duyuruyu kapat">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>
      )}
    </div>
  );
}
