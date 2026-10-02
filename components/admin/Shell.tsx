'use client';

import { useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, ShoppingBag, Package, Users, Settings, LogOut, ExternalLink } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { authMessage } from '@/lib/auth';
import { useAdmin, usePendingCounts } from '@/lib/admin';
import { Spinner } from './ui';

const NAV = [
  { g: 'Genel', items: [{ href: '/admin', label: 'Genel bakış', Icon: LayoutDashboard }] },
  {
    g: 'Mağaza',
    items: [
      { href: '/admin/siparisler', label: 'Siparişler', Icon: ShoppingBag, badge: true },
      { href: '/admin/urunler', label: 'Ürünler', Icon: Package },
      { href: '/admin/musteriler', label: 'Müşteriler', Icon: Users },
    ],
  },
  { g: 'Sistem', items: [{ href: '/admin/ayarlar', label: 'Ayarlar', Icon: Settings }] },
];

function Login({ denied, email }: { denied?: boolean; email?: string }) {
  const [e, setE] = useState('');
  const [p, setP] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(ev: React.FormEvent) {
    ev.preventDefault();
    setErr('');
    if (!e.trim() || !p) return setErr('E-posta ve şifreni gir.');
    setBusy(true);
    const { error } = await supabase().auth.signInWithPassword({ email: e.trim(), password: p });
    setBusy(false);
    if (error) setErr(authMessage(error));
  }

  return (
    <div className="login">
      <div className="login-art">
        <h2>Demleme,<br />masanın arkası.</h2>
        <p>Siparişler, ürünler ve mağaza ayarları tek yerde. Panelde yaptığın değişiklik siteye anında yansır.</p>
      </div>
      <div className="login-form">
        <div className="login-box">
          <div className="sb-mark" style={{ marginBottom: 22 }}>D</div>
          {denied ? (
            <>
              <h1>Yetkin yok</h1>
              <p>
                <b>{email}</b> hesabı yönetici değil. Yönetici hesabıyla giriş yapmalısın.
              </p>
              <button className="btn ghost block" onClick={() => supabase().auth.signOut()}>
                Çıkış yap
              </button>
            </>
          ) : (
            <form onSubmit={submit} noValidate>
              <h1>Yönetim paneli</h1>
              <p>Yönetici hesabınla giriş yap.</p>
              {err && <div className="alert err">{err}</div>}
              <label className="fld">
                <span className="lbl">E-posta</span>
                <input className="inp" type="email" autoComplete="email" value={e} onChange={(x) => setE(x.target.value)} />
              </label>
              <label className="fld">
                <span className="lbl">Şifre</span>
                <input className="inp" type="password" autoComplete="current-password" value={p} onChange={(x) => setP(x.target.value)} />
              </label>
              <button className="btn block" type="submit" disabled={busy} style={{ marginTop: 6, padding: '11px 16px' }}>
                {busy ? 'Giriş yapılıyor…' : 'Giriş yap'}
              </button>
              <p style={{ marginTop: 18, fontSize: 12.5 }}>
                Hesabın yok mu? Önce <a href="/kayit" style={{ color: 'var(--ac)', fontWeight: 600 }}>sitede kayıt ol</a>; yönetici e-postası tanımlıysa yetki otomatik verilir.
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

export function AdminShell({ children }: { children: ReactNode }) {
  const { user, loading, admin } = useAdmin();
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const counts = usePendingCounts(admin);

  useEffect(() => {
    const t = setTimeout(() => setOpen(false), 0);
    return () => clearTimeout(t);
  }, [path]);

  if (loading)
    return (
      <div className="splash">
        <Spinner size={26} />
      </div>
    );
  if (!user) return <Login />;
  if (!admin) return <Login denied email={user.email} />;

  const name = (user.user_metadata?.full_name as string) || user.email?.split('@')[0] || 'Yönetici';
  const init = name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
  const active = (h: string) => (h === '/admin' ? path === h : path.startsWith(h));

  return (
    <div className="adm-wrap">
      {open && <div className="drawer-back" onClick={() => setOpen(false)} />}
      <aside className={`sb${open ? ' open' : ''}`}>
        <div className="sb-logo">
          <div className="sb-mark">D</div>
          <div>
            <p className="sb-name">Demleme</p>
            <p className="sb-sub">Yönetim paneli</p>
          </div>
        </div>
        <nav className="sb-nav">
          {NAV.map((g) => (
            <div key={g.g}>
              <p className="sb-group">{g.g}</p>
              {g.items.map(({ href, label, Icon, ...rest }) => (
                <Link key={href} href={href} className={`sb-item${active(href) ? ' active' : ''}`}>
                  <Icon size={17} strokeWidth={1.9} />
                  {label}
                  {'badge' in rest && counts.pay + counts.ship > 0 && (
                    <span className="sb-pill" title={`${counts.pay} ödeme bekliyor · ${counts.ship} hazırlanacak`}>
                      {counts.pay + counts.ship}
                    </span>
                  )}
                </Link>
              ))}
            </div>
          ))}
          <p className="sb-group">Site</p>
          <a className="sb-item" href="/" target="_blank" rel="noopener">
            <ExternalLink size={17} strokeWidth={1.9} />
            Siteyi aç
          </a>
        </nav>
        <div className="sb-foot">
          <div className="sb-av">{init}</div>
          <div className="sb-who">
            <b>{name}</b>
            <span>Yönetici</span>
          </div>
          <button className="sb-out" onClick={() => supabase().auth.signOut()} title="Çıkış yap" aria-label="Çıkış yap">
            <LogOut size={16} />
          </button>
        </div>
      </aside>
      <MenuCtx.Provider value={() => setOpen(true)}>
        <div className="adm-main">{children}</div>
      </MenuCtx.Provider>
    </div>
  );
}

import { createContext, useContext } from 'react';
const MenuCtx = createContext<() => void>(() => {});
export const useMenu = () => useContext(MenuCtx);
