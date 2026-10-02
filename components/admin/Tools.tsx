'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Bell, Moon, Search, Sun } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAdmin } from '@/lib/admin';

export function applyTheme(t: 'dark' | 'light') {
  const el = document.querySelector('.adm');
  if (el) el.setAttribute('data-theme', t);
  try { localStorage.setItem('adm-theme', t); } catch { /* sessizce geç */ }
}
export function initTheme() {
  let t: string | null = null;
  try { t = localStorage.getItem('adm-theme'); } catch { /* sessizce geç */ }
  applyTheme(t === 'light' ? 'light' : 'dark');
}

type N = { text: string; href: string; n: number; tone: string };

function Bell_() {
  const { perms } = useAdmin();
  const [items, setItems] = useState<N[]>([]);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let off = false;
    const run = async () => {
      const sb = supabase();
      const c = (q: PromiseLike<{ count: number | null }>) => q.then((r) => r.count ?? 0, () => 0);
      const out: N[] = [];
      if (perms.includes('orders')) {
        const [pay, prep] = await Promise.all([
          c(sb.from('orders').select('id', { count: 'exact', head: true }).eq('status', 'odeme_bekleniyor')),
          c(sb.from('orders').select('id', { count: 'exact', head: true }).eq('status', 'hazirlaniyor')),
        ]);
        out.push({ text: 'ödemesi bekleyen sipariş', href: '/admin/siparisler?durum=odeme_bekleniyor', n: pay, tone: 'amber' }, { text: 'sipariş kargoya hazır', href: '/admin/siparisler?durum=hazirlaniyor', n: prep, tone: 'blue' });
      }
      if (perms.includes('content')) out.push({ text: 'yorum onay bekliyor', href: '/admin/yorumlar', n: await c(sb.from('reviews').select('id', { count: 'exact', head: true }).eq('approved', false)), tone: 'ac' });
      if (perms.includes('support') || perms.includes('customers')) out.push({ text: 'açık destek talebi', href: '/admin/destek', n: await c(sb.from('tickets').select('id', { count: 'exact', head: true }).eq('status', 'acik')), tone: 'red' });
      if (perms.includes('orders')) out.push({ text: 'iade talebi', href: '/admin/iadeler', n: await c(sb.from('returns').select('id', { count: 'exact', head: true }).eq('status', 'talep')), tone: 'amber' });
      if (!off) setItems(out.filter((x) => x.n > 0));
    };
    run();
    const t = setInterval(run, 90000);
    return () => { off = true; clearInterval(t); };
  }, [perms]);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);
  const total = items.reduce((n, x) => n + x.n, 0);
  return (
    <div className="bell" ref={ref}>
      <button type="button" className="tb-ic" onClick={() => setOpen((o) => !o)} aria-label="Bildirimler"><Bell size={17} />{total > 0 && <span className="bell-dot">{total > 99 ? '99+' : total}</span>}</button>
      {open && (
        <div className="bell-pop">
          <p>Bildirimler</p>
          {items.length === 0 && <span className="bell-empty">Yeni bildirim yok 🎉</span>}
          {items.map((x) => <Link key={x.text} href={x.href} onClick={() => setOpen(false)}><i className={`tone-${x.tone}`}>{x.n}</i>{x.text}</Link>)}
        </div>
      )}
    </div>
  );
}

export function AdminTools() {
  const [t, setT] = useState<'dark' | 'light'>('dark');
  useEffect(() => { const id = setTimeout(() => { const el = document.querySelector('.adm'); setT(el?.getAttribute('data-theme') === 'light' ? 'light' : 'dark'); }, 0); return () => clearTimeout(id); }, []);
  return (
    <>
      <button type="button" className="tb-search" onClick={() => window.dispatchEvent(new Event('adm-palette'))} aria-label="Ara"><Search size={15} /><span>Ara…</span><kbd>Ctrl K</kbd></button>
      <Bell_ />
      <button type="button" className="tb-ic" aria-label="Tema" onClick={() => { const n = t === 'dark' ? 'light' : 'dark'; applyTheme(n); setT(n); }}>{t === 'dark' ? <Sun size={17} /> : <Moon size={17} />}</button>
    </>
  );
}
