'use client';

import { useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, ShoppingBag, Package, Users, Settings, FileText, Megaphone, LogOut, ExternalLink, BadgePercent, BarChart3, ShoppingCart, Newspaper, Plug, ShieldCheck, Search, ImageIcon, Star, LayoutTemplate, MailPlus, Boxes, Calculator, Headphones, Timer, Gauge, PaintBucket, Undo2, Activity } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { authMessage } from '@/lib/auth';
import { useAdmin, usePendingCounts } from '@/lib/admin';
import { Spinner } from './ui';

const NAV: { g: string; items: { href: string; label: string; Icon: typeof Users; perm?: string; badge?: boolean }[] }[] = [
  { g: 'Genel', items: [{ href: '/admin', label: 'Genel bakış', Icon: LayoutDashboard }] },
  {
    g: 'Mağaza',
    items: [
      { href: '/admin/siparisler', label: 'Siparişler', Icon: ShoppingBag, badge: true, perm: 'orders' },
      { href: '/admin/urunler', label: 'Ürünler', Icon: Package, perm: 'products' },
      { href: '/admin/musteriler', label: 'Müşteriler', Icon: Users, perm: 'customers' },
      { href: '/admin/sepetler', label: 'Terk edilen sepetler', Icon: ShoppingCart, perm: 'customers' },
      { href: '/admin/kalite', label: 'Ürün kalitesi', Icon: Gauge, perm: 'products' },
      { href: '/admin/iadeler', label: 'İade ve değişim', Icon: Undo2, perm: 'orders' },
      { href: '/admin/depo', label: 'Depo', Icon: Boxes, perm: 'warehouse' },
      { href: '/admin/muhasebe', label: 'Muhasebe', Icon: Calculator, perm: 'accounting' },
      { href: '/admin/destek', label: 'Müşteri hizmetleri', Icon: Headphones, perm: 'support' },
    ],
  },
  {
    g: 'Pazarlama',
    items: [
      { href: '/admin/kampanyalar', label: 'Kampanya ve indirim', Icon: BadgePercent, perm: 'campaigns' },
      { href: '/admin/takip', label: 'Takip (UTM)', Icon: Megaphone, perm: 'tracking' },
      { href: '/admin/sureli', label: 'Süreli kampanya', Icon: Timer, perm: 'campaigns' },
      { href: '/admin/raporlar', label: 'Raporlar', Icon: BarChart3, perm: 'reports' },
      { href: '/admin/analiz', label: 'Analiz', Icon: Activity, perm: 'reports' },
      { href: '/admin/vitrin', label: 'Vitrin ve popup', Icon: LayoutTemplate, perm: 'content' },
      { href: '/admin/popuplar', label: 'Popuplar', Icon: LayoutTemplate, perm: 'content' },
      { href: '/admin/abonelikler', label: 'Bülten ve stok haberi', Icon: MailPlus, perm: 'customers' },
    ],
  },
  {
    g: 'İçerik',
    items: [
      { href: '/admin/icerik', label: 'Site içeriği', Icon: FileText, perm: 'content' },
      { href: '/admin/sayfalar', label: 'Sayfa, blog, yönlendirme', Icon: Newspaper, perm: 'content' },
      { href: '/admin/yorumlar', label: 'Ürün yorumları', Icon: Star, perm: 'content' },
      { href: '/admin/seo', label: 'SEO ve reklam', Icon: Search, perm: 'content' },
      { href: '/admin/tasarim', label: 'Sayfa tasarımı', Icon: PaintBucket, perm: 'content' },
      { href: '/admin/medya', label: 'Medya', Icon: ImageIcon, perm: 'content' },
    ],
  },
  {
    g: 'Sistem',
    items: [
      { href: '/admin/veri-kontrol', label: 'Veri kontrolü', Icon: Activity, perm: 'integrations' },
      { href: '/admin/entegrasyonlar', label: 'Entegrasyonlar', Icon: Plug, perm: 'integrations' },
      { href: '/admin/sistem', label: 'Kullanıcılar ve kayıtlar', Icon: ShieldCheck, perm: 'system' },
      { href: '/admin/ayarlar', label: 'Ayarlar', Icon: Settings, perm: 'system' },
    ],
  },
];

/** Bir yola girmek için gereken yetki (en uzun önek eşleşir). */
function needPerm(path: string): string | undefined {
  let best: { len: number; perm?: string } = { len: -1 };
  for (const g of NAV) for (const i of g.items) if (i.perm && (path === i.href || path.startsWith(i.href + '/')) && i.href.length > best.len) best = { len: i.href.length, perm: i.perm };
  return best.perm;
}

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
  const { user, loading, admin, perms, isAdmin } = useAdmin();
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const counts = usePendingCounts(admin && perms.includes('orders'));

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
  const need = needPerm(path);
  const blocked = !!need && !perms.includes(need);
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
          {NAV.map((g) => ({ ...g, items: g.items.filter((i) => !i.perm || perms.includes(i.perm)) })).filter((g) => g.items.length).map((g) => (
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
            <span>{isAdmin ? 'Yönetici' : 'Ekip üyesi'}</span>
          </div>
          <button className="sb-out" onClick={() => supabase().auth.signOut()} title="Çıkış yap" aria-label="Çıkış yap">
            <LogOut size={16} />
          </button>
        </div>
      </aside>
      <MenuCtx.Provider value={() => setOpen(true)}>
        <div className="adm-main">
          {blocked ? (
            <div className="empty" style={{ margin: 'auto' }}>
              <ShieldCheck size={30} strokeWidth={1.5} />
              <b>Bu sayfaya erişim yetkin yok</b>
              <span>Gerekirse yöneticiden yetki iste.</span>
            </div>
          ) : (
            children
          )}
        </div>
      </MenuCtx.Provider>
    </div>
  );
}

import { createContext, useContext } from 'react';
const MenuCtx = createContext<() => void>(() => {});
export const useMenu = () => useContext(MenuCtx);
