'use client';
import { useEffect } from 'react';

export default function GlobalModals() {
  useEffect(() => {
    // ESC ile kapat
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeSearch();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, []);

  function closeSearch() {
    const el = document.getElementById('searchOverlay');
    if (el) { el.classList.remove('open'); document.body.style.overflow = ''; }
  }

  return (
    <>
      {/* SEARCH OVERLAY */}
      <div className="search-overlay" id="searchOverlay" aria-hidden="true" onClick={(e) => {
        if ((e.target as HTMLElement).id === 'searchOverlay') closeSearch();
      }}>
        <div className="search-inner" role="dialog" aria-modal="true" aria-label="Ara">
          <button className="modal-close" aria-label="Kapat" type="button" onClick={closeSearch}>✕</button>

          <div className="search-input-wrap">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <circle cx="11" cy="11" r="7"/>
              <path d="M21 21l-4.3-4.3"/>
            </svg>
            <input
              type="text"
              id="searchInput"
              placeholder="Bölüm, ürün ya da konu ara…"
              autoComplete="off"
              autoFocus
            />
          </div>

          <div className="search-results" id="searchResults">
            <p className="search-empty">Yazmaya başla — bölümlerde ve ürünlerde arama yapılır.</p>
          </div>
        </div>
      </div>
    </>
  );
}
