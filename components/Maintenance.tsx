'use client';

import { usePathname } from 'next/navigation';
import './Maintenance.css';

// Panel ve giriş açık kalır; yönetici bakım modunu kapatabilsin.
const OPEN = ['/admin', '/giris', '/api'];

/** Bakım modu: tüm ziyaretçilere "Demleniyor" yükleme ekranı gösterir. */
export function Maintenance({ on }: { on: boolean }) {
  const path = usePathname() || '/';
  if (!on || OPEN.some((p) => path.startsWith(p))) return null;
  return (
    <div className="mnt" role="status" aria-live="polite">
      <div className="mnt-in">
        <svg className="mnt-cup" viewBox="0 0 120 120" aria-hidden="true">
          <path className="mnt-steam s1" d="M44 40c-6-8 6-12 0-22" />
          <path className="mnt-steam s2" d="M60 40c-6-8 6-12 0-22" />
          <path className="mnt-steam s3" d="M76 40c-6-8 6-12 0-22" />
          <path d="M26 52h68v14a34 34 0 0 1-34 34 34 34 0 0 1-34-34z" fill="currentColor" />
          <path d="M94 58h6a10 10 0 0 1 0 20h-9" fill="none" stroke="currentColor" strokeWidth="6" strokeLinecap="round" />
          <rect x="30" y="106" width="60" height="6" rx="3" fill="currentColor" opacity=".35" />
        </svg>
        <p className="mnt-t">
          Demleniyor<span className="mnt-d">.</span><span className="mnt-d">.</span><span className="mnt-d">.</span>
        </p>
      </div>
    </div>
  );
}
