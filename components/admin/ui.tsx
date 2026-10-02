'use client';

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { CheckCircle2, X, AlertTriangle, Inbox } from 'lucide-react';
import { Sparkline, useCountUp } from './Charts';
import { AdminTools } from './Tools';

export const STATUS_TONE: Record<string, string> = {
  odeme_bekleniyor: 'b-amber',
  hazirlaniyor: 'b-blue',
  kargoda: 'b-ac',
  teslim_edildi: 'b-green',
  iptal: 'b-gray',
};

export function Spinner({ size = 18 }: { size?: number }) {
  return <span className="spin" style={{ width: size, height: size }} aria-label="Yükleniyor" />;
}

export function Loading({ text = 'Yükleniyor…' }: { text?: string }) {
  return (
    <div aria-busy="true" aria-label={text}>
      <div className="kpis">{[0, 1, 2, 3].map((i) => <div key={i} className="skel" style={{ height: 112, borderRadius: 16 }} />)}</div>
      <div className="skel" style={{ height: 260, borderRadius: 16 }} />
    </div>
  );
}

export function Empty({ title, text, icon, action }: { title: string; text?: string; icon?: ReactNode; action?: ReactNode }) {
  return (
    <div className="empty">
      <div className="empty-ic"><i /><span>{icon ?? <Inbox size={28} strokeWidth={1.6} />}</span></div>
      <b>{title}</b>
      {text && <span className="empty-t">{text}</span>}
      {action && <div className="empty-a">{action}</div>}
    </div>
  );
}

export function TopBar({ title, sub, children, onMenu }: { title: string; sub?: string; children?: ReactNode; onMenu?: () => void }) {
  return (
    <header className="topbar">
      <button type="button" className="tb-burger" onClick={onMenu} aria-label="Menü">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="M4 7h16M4 12h16M4 17h16" />
        </svg>
      </button>
      <h1 className="tb-title">
        {title}
        {sub && <span className="tb-sub">{sub}</span>}
      </h1>
      <div className="tb-right">{children}<AdminTools /></div>
    </header>
  );
}

export function Kpi({ label, value, sub, tone, icon, spark, trend }: { label: string; value: string; sub?: string; tone: 'ac' | 'green' | 'amber' | 'blue' | 'red'; icon: ReactNode; spark?: number[]; trend?: number }) {
  // "₺12.400" / "%3,2" / "48" → sayı kısmı animasyonla artar
  const m = value.match(/^([^\d-]*)(-?[\d.]+)(?:,(\d+))?(.*)$/);
  const num = m ? parseFloat(m[2].replace(/\./g, '') + (m[3] ? '.' + m[3] : '')) : NaN;
  const anim = useCountUp(isFinite(num) ? num : 0);
  const dec = m?.[3]?.length ?? 0;
  const shown = m && isFinite(num) ? `${m[1]}${anim.toLocaleString('tr-TR', { minimumFractionDigits: dec, maximumFractionDigits: dec })}${m[4]}` : value;
  return (
    <div className={`kpi fade-in kpi-${tone}`}>
      <div className="kpi-top">
        <span className="kpi-label">{label}</span>
        <span className={`kpi-ic tone-${tone}`}>{icon}</span>
      </div>
      <div className="kpi-val">{shown}</div>
      <div className="kpi-foot">
        {sub && <div className="kpi-sub">{sub}</div>}
        {trend !== undefined && isFinite(trend) && <span className={`kpi-tr ${trend >= 0 ? 'up' : 'dn'}`}>{trend >= 0 ? '▲' : '▼'} {Math.abs(trend).toFixed(0)}%</span>}
        {spark && spark.length > 1 && <span className="kpi-sp"><Sparkline data={spark} color={`var(--${tone === 'ac' ? 'ac' : tone})`} /></span>}
      </div>
    </div>
  );
}

export function Panel({ title, onClose, children, footer, wide }: { title: ReactNode; onClose: () => void; children: ReactNode; footer?: ReactNode; wide?: boolean }) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [onClose]);
  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <aside className={`panel${wide ? ' wide' : ''}`} role="dialog" aria-modal="true">
        <div className="ph">
          <h2 style={{ flex: 1 }}>{title}</h2>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Kapat">
            <X size={18} />
          </button>
        </div>
        <div className="pb">{children}</div>
        {footer && <div className="pf">{footer}</div>}
      </aside>
    </div>
  );
}

export function Confirm({ title, text, confirmText = 'Evet', danger = true, onConfirm, onCancel, busy }: { title: string; text: string; confirmText?: string; danger?: boolean; onConfirm: () => void; onCancel: () => void; busy?: boolean }) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === 'Escape' && onCancel();
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [onCancel]);
  return (
    <div className="overlay center" style={{ zIndex: 120 }} onMouseDown={(e) => e.target === e.currentTarget && onCancel()}>
      <div className="dialog" role="alertdialog" aria-modal="true">
        <div className={`kpi-ic ${danger ? 'tone-red' : 'tone-amber'}`} style={{ width: 44, height: 44, marginBottom: 14 }}>
          <AlertTriangle size={21} />
        </div>
        <h3 style={{ fontSize: 16.5, fontWeight: 700, marginBottom: 6 }}>{title}</h3>
        <p style={{ color: 'var(--tx2)', marginBottom: 20 }}>{text}</p>
        <div style={{ display: 'flex', gap: 10 }}>
          <button type="button" className="btn ghost block" onClick={onCancel}>
            Vazgeç
          </button>
          <button type="button" className={`btn block${danger ? '' : ''}`} style={danger ? { background: 'var(--red)' } : undefined} onClick={onConfirm} disabled={busy}>
            {busy ? 'Bekle…' : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

export function useToast() {
  const [t, setT] = useState<{ text: string; err?: boolean } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const show = useCallback((text: string, err = false) => {
    setT({ text, err });
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setT(null), err ? 5000 : 2600);
  }, []);
  const node = t ? (
    <div className={`toast${t.err ? ' err' : ''}`} role="status">
      {t.err ? <AlertTriangle size={16} /> : <CheckCircle2 size={16} />}
      {t.text}
    </div>
  ) : null;
  return { show, node };
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="fld">
      <span className="lbl">{label}</span>
      {children}
      {hint && <span className="hint">{hint}</span>}
    </label>
  );
}
