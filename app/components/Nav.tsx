'use client';
export default function Nav() {
  return (
    <>
      <nav className="site-nav" id="siteNav">
        <a href="#hero" className="nav-logo">
          <span style={{fontFamily:'var(--font-display)',fontSize:'1.4rem',letterSpacing:'0.04em',color:'var(--ink)'}}>demleme</span>
        </a>

        {/* Masaüstü nav linkleri */}
        <ul className="nav-links nav-links-desktop" id="navLinksDesktop" style={{listStyle:'none',display:'flex',gap:'34px',margin:0,padding:0}}>
          <li><a href="#hero" data-nav="hero" className="active">Ana Sayfa</a></li>
          <li><a href="#videos" data-nav="videos">YouTube</a></li>
          <li><a href="#shop" data-nav="shop">Ürünler</a></li>
          <li><a href="#benkimim" data-nav="benkimim">Ben Kimim</a></li>
          <li><a href="#iletisim" data-nav="iletisim">İletişim</a></li>
        </ul>

        <div className="nav-icons">
          <button className="theme-toggle" id="themeToggle" aria-label="Karanlık mod" type="button">
            <svg className="sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="12" cy="12" r="4.5"/><path d="M12 3v2M12 19v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M3 12h2M19 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4"/></svg>
            <svg className="moon" viewBox="0 0 24 24" fill="currentColor"><path d="M21 12.8A9 9 0 1111.2 3a7 7 0 009.8 9.8z"/></svg>
          </button>
          <button className="nav-icon-btn" id="favBtn" aria-label="Favorilerim" type="button">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M12 20s-7-4.35-9.5-8.5C.7 8 2 4.5 5.5 4 8 3.6 10 5 12 7.5 14 5 16 3.6 18.5 4 22 4.5 23.3 8 21.5 11.5 19 15.65 12 20 12 20z"/></svg>
            <span id="favCount" hidden>0</span>
          </button>
          <button className="nav-icon-btn" id="cartBtn" aria-label="Sepetim" type="button">
            <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M7 8V6.5a5 5 0 0110 0V8h2.3a1 1 0 01.99.86l1.2 8.4A2 2 0 0119.52 20H4.48a2 2 0 01-1.97-2.74l1.2-8.4A1 1 0 014.7 8H7zm2 0h6V6.5a3 3 0 00-6 0V8z"/></svg>
            <span id="cartCount" hidden>0</span>
          </button>
          <button className="nav-icon-btn" id="searchBtn" aria-label="Ara" type="button">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>
          </button>
          <a className="nav-icon-btn" href="https://instagram.com" target="_blank" rel="noopener" aria-label="Instagram">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.4" cy="6.6" r="1"/></svg>
          </a>
          <button className="nav-hamburger" id="hamburgerBtn" aria-label="Menü">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="3" y1="7" x2="21" y2="7"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="17" x2="21" y2="17"/></svg>
          </button>
        </div>
      </nav>

      {/* Mobil drawer */}
      <div className="nav-drawer" id="navDrawer">
        <button className="nav-drawer-close" id="navDrawerClose" aria-label="Menüyü kapat" type="button">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="5" y1="5" x2="19" y2="19"/><line x1="19" y1="5" x2="5" y2="19"/></svg>
        </button>
        <ul className="nav-links" id="navLinks">
          <li><a href="#hero" data-nav="hero" className="active">Ana Sayfa</a></li>
          <li><a href="#videos" data-nav="videos">YouTube</a></li>
          <li><a href="#shop" data-nav="shop">Ürünler</a></li>
          <li><a href="#benkimim" data-nav="benkimim">Ben Kimim</a></li>
          <li><a href="#iletisim" data-nav="iletisim">İletişim</a></li>
        </ul>
        <div className="nav-drawer-foot">
          <span>afiyet olsun</span>
          <a href="https://instagram.com" target="_blank" rel="noopener" aria-label="Instagram">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.4" cy="6.6" r="1"/></svg>
          </a>
        </div>
      </div>
      <div className="nav-backdrop" id="navBackdrop"></div>
    </>
  );
}
