'use client';
import { useState, useEffect, useRef } from 'react';
import type { Product } from '@/lib/products';
import AddToCartBtn from './AddToCartBtn';

const CATEGORIES = ['Tümü', 'Mutfak', 'Giyim', 'Kırtasiye', 'Dekor', 'Diğer'];

function useInView(threshold = 0.12) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { setVisible(true); obs.disconnect(); }
    }, { threshold });
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, visible };
}

function ProductCard({ p, index }: { p: Product; index: number }) {
  const { ref, visible } = useInView();
  const [hovered, setHovered] = useState(false);
  const [ripple, setRipple] = useState(false);

  const delay = (index % 3) * 0.08;

  function handleClick() {
    setRipple(true);
    setTimeout(() => { window.location.href = `/urunler/${p.slug}`; }, 220);
  }

  return (
    <>
      <div
        ref={ref}
        onClick={handleClick}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          animation: `cardIn .6s cubic-bezier(.16,.9,.2,1) ${delay}s both`,
          opacity: visible ? undefined : 0,
          borderRadius: '22px',
          overflow: 'hidden',
          background: 'var(--paper)',
          border: `1.5px solid ${hovered ? p.color + '55' : 'var(--line)'}`,
          boxShadow: hovered
            ? `0 24px 64px -12px ${p.color}30, 0 4px 16px rgba(0,0,0,.06)`
            : '0 2px 12px rgba(0,0,0,.05)',
          cursor: 'pointer',
          display: 'flex',
          flexDirection: 'column' as const,
          transition: 'box-shadow .35s, border-color .35s, transform .35s cubic-bezier(.34,1.56,.64,1)',
          transform: hovered ? 'translateY(-7px) scale(1.01)' : 'translateY(0) scale(1)',
          position: 'relative' as const,
        }}
      >
        {/* Ripple efekti */}
        {ripple && (
          <div style={{
            position: 'absolute', inset: 0, zIndex: 10, overflow: 'hidden', borderRadius: '22px', pointerEvents: 'none',
          }}>
            <div style={{
              position: 'absolute', top: '50%', left: '50%',
              width: '100px', height: '100px',
              marginTop: '-50px', marginLeft: '-50px',
              borderRadius: '50%',
              background: p.color,
              animation: 'rippleOut .35s ease forwards',
            }} />
          </div>
        )}

        {/* Görsel alan */}
        <div style={{
          background: `linear-gradient(145deg, color-mix(in srgb, ${p.color} 7%, var(--cream-deep)) 0%, color-mix(in srgb, ${p.color} 16%, var(--cream)) 100%)`,
          aspectRatio: '4/3',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          overflow: 'hidden',
        }}>
          {/* Şimmer efekti (hover) */}
          {hovered && (
            <div style={{
              position: 'absolute', inset: 0, zIndex: 2, pointerEvents: 'none',
              background: 'linear-gradient(105deg, transparent 40%, rgba(255,255,255,.35) 50%, transparent 60%)',
              animation: 'shimmer .7s ease forwards',
            }} />
          )}

          {/* Dalgalı halo */}
          <div style={{
            position: 'absolute',
            width: '160px', height: '160px',
            borderRadius: '50%',
            background: `radial-gradient(circle, ${p.color}22 0%, transparent 70%)`,
            animation: hovered ? 'haloGrow 1s ease-out infinite' : 'none',
            transition: 'opacity .3s',
          }} />

          {/* İkon — hover'da yüzer */}
          <div style={{
            width: '96px', height: '96px',
            color: p.color,
            position: 'relative', zIndex: 3,
            filter: `drop-shadow(0 8px 24px ${p.color}50)`,
            animation: hovered ? 'floatIcon 2s ease-in-out infinite' : 'none',
            transition: 'filter .3s',
          }} dangerouslySetInnerHTML={{ __html: p.svgIcon }} />

          {/* Badge */}
          {p.badge && (
            <div style={{
              position: 'absolute', top: '12px', left: '12px', zIndex: 4,
              background: p.color, color: '#fff',
              fontSize: '.6rem', fontWeight: 800, letterSpacing: '.1em',
              padding: '5px 12px', borderRadius: '40px',
              boxShadow: `0 4px 16px ${p.color}60`,
              transform: hovered ? 'scale(1.05)' : 'scale(1)',
              transition: 'transform .25s',
            }}>{p.badge.toUpperCase()}</div>
          )}

          {/* Kategori chip */}
          <div style={{
            position: 'absolute', top: '12px', right: '12px', zIndex: 4,
            background: 'rgba(255,255,255,.88)',
            backdropFilter: 'blur(10px)',
            fontSize: '.6rem', fontWeight: 800, letterSpacing: '.1em',
            padding: '4px 10px', borderRadius: '40px',
            color: p.color,
          }}>{p.category.toUpperCase()}</div>

          {/* Stok bar */}
          {p.stock < 50 && (
            <div style={{
              position: 'absolute', bottom: 0, left: 0, right: 0, height: '3px',
              background: 'rgba(0,0,0,.07)',
            }}>
              <div style={{
                height: '100%',
                width: `${Math.min(p.stock * 2, 100)}%`,
                background: `linear-gradient(90deg, ${p.color}, ${p.accentColor})`,
                borderRadius: '2px',
                transition: 'width 1.2s cubic-bezier(.16,.9,.2,1)',
              }} />
            </div>
          )}
        </div>

        {/* İçerik */}
        <div style={{ padding: '18px 20px 20px', flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <h3 style={{
            fontFamily: 'var(--font-display)',
            fontSize: '1.08rem',
            color: 'var(--ink)',
            margin: 0,
            lineHeight: 1.2,
            transition: 'color .2s',
            ...(hovered ? { color: p.color } : {}),
          }}>{p.name}</h3>

          <p style={{
            fontSize: '.83rem',
            color: 'var(--ink-soft)',
            lineHeight: 1.6,
            margin: 0,
            flex: 1,
          }}>{p.description.slice(0, 72)}…</p>

          {p.stock < 30 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: p.color, animation: 'heroLivePulse 1.4s ease-in-out infinite' }} />
              <span style={{ fontSize: '.7rem', color: p.color, fontWeight: 700 }}>Son {p.stock} adet</span>
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '4px' }}
            onClick={e => e.stopPropagation()}>
            <span style={{
              fontFamily: 'var(--font-display)',
              fontSize: '1.22rem',
              fontWeight: 800,
              color: 'var(--ink)',
              flex: 1,
            }}>{p.priceDisplay}</span>
            <AddToCartBtn product={p} small />
          </div>
        </div>
      </div>
    </>
  );
}

export default function ProductGrid({ products }: { products: Product[] }) {
  const [activeFilter, setActiveFilter] = useState('Tümü');
  const [sortBy, setSortBy] = useState<'varsayilan' | 'fiyat-artan' | 'fiyat-azalan'>('varsayilan');
  const [prevFilter, setPrevFilter] = useState('Tümü');
  const [animKey, setAnimKey] = useState(0);

  function changeFilter(cat: string) {
    setPrevFilter(activeFilter);
    setActiveFilter(cat);
    setAnimKey(k => k + 1);
  }

  const filtered = products
    .filter(p => activeFilter === 'Tümü' || p.category === activeFilter)
    .sort((a, b) => {
      if (sortBy === 'fiyat-artan') return a.price - b.price;
      if (sortBy === 'fiyat-azalan') return b.price - a.price;
      return 0;
    });

  return (
    <div>
      <style>{`
        @keyframes cardIn {
          from { opacity:0; transform:translateY(32px) scale(.97); }
          to   { opacity:1; transform:translateY(0) scale(1); }
        }
        @keyframes shimmer {
          0%   { transform:translateX(-100%) rotate(25deg); }
          100% { transform:translateX(250%) rotate(25deg); }
        }
        @keyframes rippleOut {
          from { transform:scale(0); opacity:.35; }
          to   { transform:scale(4); opacity:0; }
        }
        @keyframes floatIcon {
          0%,100% { transform:translateY(0) rotate(-1deg); }
          50%     { transform:translateY(-8px) rotate(1deg); }
        }
        @keyframes haloGrow {
          from { transform:scale(1); opacity:.18; }
          to   { transform:scale(1.5); opacity:0; }
        }
      `}</style>
      {/* Filtre + sıralama */}
      <div style={{ marginBottom: '32px' }}>
        <div style={{
          display: 'flex', gap: '8px',
          overflowX: 'auto' as const,
          paddingBottom: '12px', marginBottom: '12px',
          WebkitOverflowScrolling: 'touch' as any,
          scrollbarWidth: 'none' as any,
        }}>
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => changeFilter(cat)}
              style={{
                padding: '9px 20px',
                borderRadius: '40px',
                border: `1.5px solid ${activeFilter === cat ? 'var(--ink)' : 'var(--line)'}`,
                background: activeFilter === cat ? 'var(--ink)' : 'transparent',
                color: activeFilter === cat ? '#fff' : 'var(--ink-soft)',
                fontSize: '.85rem', fontWeight: 600,
                cursor: 'pointer', fontFamily: 'var(--font-body)',
                transition: 'all .25s cubic-bezier(.34,1.56,.64,1)',
                whiteSpace: 'nowrap' as const, flexShrink: 0,
                transform: activeFilter === cat ? 'scale(1.05)' : 'scale(1)',
              }}
            >{cat}</button>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <p style={{ fontSize: '.8rem', color: 'var(--ink-faint)', margin: 0, fontWeight: 600 }}>
            {filtered.length} ürün
          </p>
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value as typeof sortBy)}
            style={{
              padding: '8px 14px', borderRadius: '10px',
              border: '1.5px solid var(--line)', background: 'var(--paper)',
              color: 'var(--ink)', fontSize: '.82rem', fontWeight: 600,
              cursor: 'pointer', fontFamily: 'var(--font-body)', outline: 'none',
            }}
          >
            <option value="varsayilan">Önerilen</option>
            <option value="fiyat-artan">En Ucuz</option>
            <option value="fiyat-azalan">En Pahalı</option>
          </select>
        </div>
      </div>

      {/* Grid */}
      <div key={animKey} style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(270px, 1fr))',
        gap: '20px',
      }}>
        {filtered.map((p, i) => (
          <ProductCard key={p.id} p={p} index={i} />
        ))}
      </div>

      {filtered.length === 0 && (
        <div style={{ textAlign: 'center' as const, padding: '80px 0', color: 'var(--ink-faint)' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>🫖</div>
          <p style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem' }}>Bu kategoride ürün yok.</p>
        </div>
      )}
    </div>
  );
}
