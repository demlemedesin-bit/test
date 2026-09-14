'use client';
import { useEffect, useState, useCallback } from 'react';
import { getCart, cartCount } from '@/lib/cart';
import { getUser } from '@/lib/auth';

const IconBag = () => (
  <svg viewBox="0 0 32 32" fill="none" width="26" height="26" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 8h20l-2 16H8L6 8z"/>
    <path d="M12 8c0-2.2 1.8-4 4-4s4 1.8 4 4"/>
    <circle cx="12" cy="16" r="1" fill="currentColor" stroke="none"/>
    <circle cx="20" cy="16" r="1" fill="currentColor" stroke="none"/>
  </svg>
);

const IconSearch = () => (
  <svg viewBox="0 0 32 32" fill="none" width="26" height="26" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
    <circle cx="14" cy="14" r="9"/>
    <path d="M20.5 20.5L28 28"/>
  </svg>
);

const IconInstagram = () => (
  <svg viewBox="0 0 32 32" fill="none" width="26" height="26" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="4" y="4" width="24" height="24" rx="7"/>
    <circle cx="16" cy="16" r="6"/>
    <circle cx="23" cy="9" r="1.2" fill="currentColor" stroke="none"/>
  </svg>
);

export default function NavBar() {
  const [count, setCount] = useState(0);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const updateCart = () => setCount(cartCount(getCart()));
    updateCart();
    window.addEventListener('cart-updated', updateCart);
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('cart-updated', updateCart);
      window.removeEventListener('scroll', onScroll);
    };
  }, []);

  const openCart = useCallback(() => {
    window.dispatchEvent(new Event('demleme:open-cart'));
  }, []);

  const iconBtn: React.CSSProperties = {
    background: 'none', border: 'none', cursor: 'pointer',
    padding: '6px', display: 'flex', alignItems: 'center',
    justifyContent: 'center', borderRadius: '10px',
    color: 'var(--ink)', transition: 'background .15s, transform .15s',
  };

  return (
    <>
      <nav style={{
        position: 'sticky', top: 0, zIndex: 300,
        background: scrolled ? 'rgba(247,243,233,0.9)' : 'var(--cream)',
        backdropFilter: scrolled ? 'blur(16px)' : 'none',
        WebkitBackdropFilter: scrolled ? 'blur(16px)' : 'none',
        borderBottom: '1px solid var(--line)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 24px', height: '60px', gap: '8px',
        transition: 'background .3s',
      }}>

        {/* Logo */}
        <a href="/" style={{ textDecoration: 'none', flexShrink: 0 }}>
          <span style={{ fontFamily: "'Kodchasan',sans-serif", fontSize: '1.4rem', fontWeight: 700, letterSpacing: '.05em', color: 'var(--ink)' }}>
            demleme
          </span>
        </a>

        {/* Desktop nav */}
        <ul className="nav-links-desktop" style={{ display: 'flex', listStyle: 'none', gap: '24px', margin: 0, padding: 0, alignItems: 'center' }}>
          {[['/', 'Ana Sayfa'], ['/#bu-hafta', 'YouTube'], ['/urunler', 'Ürünler'], ['/#demleyen', 'Ben Kimim'], ['/#anket', 'İletişim']].map(([href, label]) => (
            <li key={label}><a href={href} style={{ textDecoration: 'none', color: 'var(--ink)', fontWeight: 600, fontSize: '.85rem', opacity: .7 }}>{label}</a></li>
          ))}
        </ul>

        {/* İkonlar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '2px', flexShrink: 0 }}>

          {/* Sepet */}
          <button onClick={openCart} type="button" aria-label="Sepet" style={{ ...iconBtn, position: 'relative' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0,0,0,.06)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.transform = 'none'; }}>
            <IconBag />
            {count > 0 && (
              <span style={{ position: 'absolute', top: '3px', right: '3px', background: 'var(--rust)', color: '#fff', borderRadius: '50%', width: '15px', height: '15px', fontSize: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>
                {count}
              </span>
            )}
          </button>

          {/* Arama */}
          <button onClick={() => setSearchOpen(true)} type="button" aria-label="Ara" style={iconBtn}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0,0,0,.06)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.transform = 'none'; }}>
            <IconSearch />
          </button>

          {/* Instagram */}
          <a href="https://instagram.com/demleme" target="_blank" rel="noopener" aria-label="Instagram" style={{ ...iconBtn, textDecoration: 'none' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(0,0,0,.06)'; (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'none'; (e.currentTarget as HTMLElement).style.transform = 'none'; }}>
            <IconInstagram />
          </a>

          {/* Hamburger — 3 yatay çizgi asimetrik */}
          <button onClick={() => setDrawerOpen(true)} type="button" aria-label="Menü"
            style={{ background: 'var(--ink)', border: 'none', cursor: 'pointer', width: '42px', height: '42px', borderRadius: '12px', display: 'flex', flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'center', gap: '5px', padding: '10px 11px', transition: 'transform .15s', flexShrink: 0 }}
            onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.06) rotate(-3deg)')}
            onMouseLeave={e => (e.currentTarget.style.transform = 'none')}>
            <span style={{ width: '20px', height: '2px', background: 'var(--cream-fixed)', borderRadius: '2px', display: 'block', transition: 'width .2s' }} />
            <span style={{ width: '13px', height: '2px', background: 'var(--cream-fixed)', borderRadius: '2px', display: 'block' }} />
            <span style={{ width: '20px', height: '2px', background: 'var(--cream-fixed)', borderRadius: '2px', display: 'block' }} />
          </button>
        </div>
      </nav>

      {/* Drawer */}
      {drawerOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 500 }}>
          <div onClick={() => setDrawerOpen(false)} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,.45)' }} />
          <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 'min(300px,85vw)', background: 'var(--cream)', display: 'flex', flexDirection: 'column', padding: '24px 28px', boxShadow: '-8px 0 40px rgba(0,0,0,.2)' }}>
            <button onClick={() => setDrawerOpen(false)}
              style={{ alignSelf: 'flex-end', background: 'none', border: '1.5px solid var(--line)', borderRadius: '50%', width: '36px', height: '36px', cursor: 'pointer', marginBottom: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1rem' }}>
              ✕
            </button>
            <nav style={{ display: 'flex', flexDirection: 'column' }}>
              {[['/', 'Ana Sayfa'], ['/#bu-hafta', 'YouTube'], ['/urunler', 'Ürünler'], ['/#demleyen', 'Ben Kimim'], ['/#anket', 'İletişim']].map(([href, label]) => (
                <a key={label} href={href} onClick={() => setDrawerOpen(false)}
                  style={{ display: 'block', padding: '14px 0', borderBottom: '1px solid var(--line)', textDecoration: 'none', color: 'var(--ink)', fontWeight: 700, fontSize: '1.1rem' }}>
                  {label}
                </a>
              ))}
            </nav>
          </div>
        </div>
      )}

      {/* Search */}
      {searchOpen && (
        <div onClick={e => { if (e.target === e.currentTarget) setSearchOpen(false); }}
          style={{ position: 'fixed', inset: 0, zIndex: 500, background: 'rgba(26,18,8,.6)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '80px 20px' }}>
          <div style={{ background: 'var(--paper)', borderRadius: '20px', width: '100%', maxWidth: '560px', padding: '28px', position: 'relative' }}>
            <button onClick={() => setSearchOpen(false)}
              style={{ position: 'absolute', top: '16px', right: '16px', background: 'var(--cream-deep)', border: 'none', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              ✕
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', borderBottom: '1.5px solid var(--line)', paddingBottom: '16px', marginBottom: '16px', marginTop: '4px' }}>
              <IconSearch />
              <input autoFocus type="text" placeholder="Bölüm, ürün ya da konu ara…"
                style={{ flex: 1, border: 'none', outline: 'none', fontSize: '1rem', fontFamily: 'var(--font-body)', background: 'transparent', color: 'var(--ink)' }} />
            </div>
            <p style={{ color: 'var(--ink-faint)', fontSize: '.88rem', margin: 0 }}>Yazmaya başla — bölümlerde ve ürünlerde arama yapılır.</p>
          </div>
        </div>
      )}
    </>
  );
}
