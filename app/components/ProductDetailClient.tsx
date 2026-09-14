'use client';
import { useState, useEffect, useRef } from 'react';
import type { Product } from '@/lib/products';
import QtySelector from './QtySelector';

const Star = ({ filled }: { filled: boolean }) => (
  <svg viewBox="0 0 16 16" width="13" height="13">
    <path d="M8 1l1.8 3.6L14 5.3l-3 2.9.7 4.1L8 10.4l-3.7 1.9.7-4.1-3-2.9 4.2-.7z"
      fill={filled ? '#f0a500' : 'none'} stroke="#f0a500" strokeWidth="1" />
  </svg>
);

/* Dönen + sallanan ikon animasyonu */
function LiveIcon({ svgIcon, color }: { svgIcon: string; color: string }) {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick(n => n + 1), 2400);
    return () => clearInterval(t);
  }, []);
  return (
    <div style={{
      width: '58%', height: '58%', color,
      filter: `drop-shadow(0 16px 48px ${color}55)`,
      transition: 'transform .8s cubic-bezier(.34,1.56,.64,1)',
      transform: tick % 2 === 0 ? 'scale(1) rotate(-3deg)' : 'scale(1.08) rotate(3deg)',
    }} dangerouslySetInnerHTML={{ __html: svgIcon }} />
  );
}

export default function ProductDetailClient({ product: p, related }: { product: Product; related: Product[] }) {
  const [activeTab, setActiveTab] = useState<'aciklama' | 'ozellikler' | 'yorumlar' | 'sss'>('aciklama');
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [selectedVariant, setSelectedVariant] = useState(0);
  const [selectedSize, setSelectedSize] = useState('M');
  const [mounted, setMounted] = useState(false);
  const [imgHovered, setImgHovered] = useState(false);

  useEffect(() => { const t = setTimeout(() => setMounted(true), 60); return () => clearTimeout(t); }, []);

  const avgRating = p.reviews.length
    ? p.reviews.reduce((s, r) => s + r.rating, 0) / p.reviews.length : 5;

  const variants = [
    { label: 'Orijinal', color: p.color },
    { label: 'Alternatif', color: p.accentColor },
  ];

  return (
    <main style={{ background: 'var(--cream)', minHeight: '100vh', paddingTop: '72px' }}>
      <style>{`
        @keyframes floatBadge {
          0%,100% { transform:translateY(0); }
          50%      { transform:translateY(-5px); }
        }
        @keyframes ringPulse {
          0%   { transform:scale(1);   opacity:.22; }
          70%  { transform:scale(1.35);opacity:0; }
          100% { transform:scale(1.35);opacity:0; }
        }
        @keyframes slideUp {
          from { opacity:0; transform:translateY(28px); }
          to   { opacity:1; transform:translateY(0); }
        }
        @keyframes slideRight {
          from { opacity:0; transform:translateX(-28px); }
          to   { opacity:1; transform:translateX(0); }
        }
        @keyframes tabIn {
          from { opacity:0; transform:translateY(10px); }
          to   { opacity:1; transform:translateY(0); }
        }
        @keyframes spin-slow {
          from { transform:rotate(0deg); }
          to   { transform:rotate(360deg); }
        }
        @keyframes countUp {
          from { opacity:0; transform:scale(.7); }
          to   { opacity:1; transform:scale(1); }
        }
      `}</style>

      {/* BREADCRUMB */}
      <div style={{ background: 'var(--ink)', padding: '12px var(--pad)' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', display: 'flex', gap: '8px', alignItems: 'center', fontSize: '.75rem' }}>
          <a href="/" style={{ color: 'rgba(243,238,225,.4)', textDecoration: 'none' }}>Ana Sayfa</a>
          <span style={{ color: 'rgba(243,238,225,.2)' }}>/</span>
          <a href="/urunler" style={{ color: 'rgba(243,238,225,.4)', textDecoration: 'none' }}>Mağaza</a>
          <span style={{ color: 'rgba(243,238,225,.2)' }}>/</span>
          <span style={{ color: 'var(--cream-fixed)', fontWeight: 600 }}>{p.name}</span>
        </div>
      </div>

      {/* ANA GRID */}
      <div style={{
        maxWidth: '1200px', margin: '0 auto',
        padding: '48px var(--pad) 80px',
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '64px',
        alignItems: 'start',
      }} className="pd-grid">

        {/* SOL: Görsel */}
        <div style={{
          position: 'sticky', top: '88px',
          animation: mounted ? 'slideRight .65s cubic-bezier(.16,.9,.2,1) both' : 'none',
        }} className="pd-img-col">

          {/* Ana görsel kutusu */}
          <div
            onMouseEnter={() => setImgHovered(true)}
            onMouseLeave={() => setImgHovered(false)}
            style={{
              borderRadius: '28px',
              background: `linear-gradient(145deg,
                color-mix(in srgb, ${p.color} 8%, var(--cream-deep)) 0%,
                color-mix(in srgb, ${p.color} 20%, var(--cream)) 100%)`,
              aspectRatio: '1',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              position: 'relative', overflow: 'hidden',
              boxShadow: imgHovered
                ? `0 40px 100px -16px ${p.color}45, 0 0 0 1.5px ${p.color}30`
                : `0 24px 60px -12px ${p.color}25, 0 0 0 1px ${p.color}12`,
              transition: 'box-shadow .4s',
              cursor: 'default',
            }}
          >
            {/* Dönen dış halka */}
            {[72, 86].map((pct, i) => (
              <div key={i} style={{
                position: 'absolute',
                width: `${pct}%`, height: `${pct}%`,
                borderRadius: '50%',
                border: `1px dashed ${p.color}${i === 0 ? '25' : '12'}`,
                animation: `spin-slow ${25 + i * 15}s linear infinite${i === 1 ? ' reverse' : ''}`,
              }} />
            ))}

            {/* Pulse hale — hover'da */}
            {imgHovered && (
              <div style={{
                position: 'absolute',
                width: '70%', height: '70%',
                borderRadius: '50%',
                border: `2px solid ${p.color}`,
                animation: 'ringPulse 1.2s ease-out infinite',
                pointerEvents: 'none',
              }} />
            )}

            {/* Ürün ikonu */}
            <LiveIcon svgIcon={p.svgIcon} color={p.color} />

            {/* Badge */}
            {p.badge && (
              <div style={{
                position: 'absolute', top: '20px', left: '20px',
                background: p.color, color: '#fff',
                fontSize: '.68rem', fontWeight: 800, letterSpacing: '.12em',
                padding: '7px 16px', borderRadius: '40px',
                boxShadow: `0 6px 24px ${p.color}60`,
                animation: 'floatBadge 2.5s ease-in-out infinite',
              }}>{p.badge.toUpperCase()}</div>
            )}

            {/* Stok uyarısı */}
            {p.stock < 30 && (
              <div style={{
                position: 'absolute', bottom: '16px', left: '16px', right: '16px',
                background: 'rgba(8,8,8,.84)',
                backdropFilter: 'blur(20px)',
                borderRadius: '14px', padding: '12px 18px',
                display: 'flex', alignItems: 'center', gap: '12px',
              }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ff4a4a', flexShrink: 0, boxShadow: '0 0 10px #ff4a4a', animation: 'heroLivePulse 1.6s infinite' }} />
                <div style={{ flex: 1 }}>
                  <div style={{ height: '3px', background: 'rgba(255,255,255,.12)', borderRadius: '2px', marginBottom: '6px' }}>
                    <div style={{ height: '100%', width: `${Math.min(p.stock * 3, 100)}%`, background: `linear-gradient(90deg,#ff4a4a,#ff8800)`, borderRadius: '2px' }} />
                  </div>
                  <span style={{ color: '#fff', fontSize: '.72rem', fontWeight: 600 }}>Son {p.stock} adet kaldı!</span>
                </div>
              </div>
            )}
          </div>

          {/* Sosyal kanıt kartı */}
          <div style={{
            marginTop: '14px', padding: '14px 18px',
            background: 'var(--paper)', borderRadius: '18px',
            border: '1px solid var(--line)',
            display: 'flex', alignItems: 'center', gap: '14px',
            animation: mounted ? 'slideUp .6s cubic-bezier(.16,.9,.2,1) .2s both' : 'none',
          }}>
            <div style={{ display: 'flex' }}>
              {[p.color,'#2a7a4b','#5b3a8c','#1a6e6e'].map((c, i) => (
                <div key={i} style={{
                  width: '30px', height: '30px', borderRadius: '50%',
                  background: c, border: '2.5px solid var(--cream)',
                  marginLeft: i > 0 ? '-9px' : 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#fff', fontSize: '.6rem', fontWeight: 800,
                }}>{['SB','EK','MY','AT'][i]}</div>
              ))}
            </div>
            <div>
              <div style={{ display: 'flex', gap: '2px', marginBottom: '3px' }}>
                {[1,2,3,4,5].map(i => <Star key={i} filled={i <= Math.round(avgRating)} />)}
              </div>
              <p style={{ fontSize: '.75rem', color: 'var(--ink-soft)', margin: 0 }}>
                <strong style={{ color: 'var(--ink)' }}>{47 + p.reviews.length} kişi</strong> satın aldı
              </p>
            </div>
            <div style={{ marginLeft: 'auto', textAlign: 'right' as const }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', fontWeight: 800, color: 'var(--ink)', animation: 'countUp .5s .4s both' }}>{avgRating.toFixed(1)}</div>
              <div style={{ fontSize: '.65rem', color: 'var(--ink-faint)' }}>/ 5.0</div>
            </div>
          </div>

          {/* Güvence ikonları */}
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '10px', marginTop: '10px',
            animation: mounted ? 'slideUp .6s cubic-bezier(.16,.9,.2,1) .3s both' : 'none',
          }}>
            {/* Güvence - Güvenli */}
            <div style={{
              background:'var(--paper)',borderRadius:'16px',padding:'16px 8px',
              textAlign:'center',border:'1px solid var(--line)',
              display:'flex',flexDirection:'column',alignItems:'center',gap:'8px',
            }}>
              <div style={{
                width:44,height:44,borderRadius:'12px',
                background:'linear-gradient(135deg,#1a7a4a,#26a96a)',
                display:'flex',alignItems:'center',justifyContent:'center',
                boxShadow:'0 4px 12px rgba(26,122,74,0.25)',
              }}>
                <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2L4 6v6c0 5.25 3.5 10.15 8 11.35C16.5 22.15 20 17.25 20 12V6L12 2z"/>
                  <path d="M9 12l2 2 4-4"/>
                </svg>
              </div>
              <div>
                <p style={{fontWeight:800,fontSize:'.72rem',margin:'0 0 2px',color:'var(--ink)',letterSpacing:'.02em'}}>Güvenli</p>
                <p style={{fontSize:'.65rem',color:'var(--ink-faint)',margin:0}}>SSL + 3D</p>
              </div>
            </div>

            {/* Güvence - Ücretsiz Kargo */}
            <div style={{
              background:'var(--paper)',borderRadius:'16px',padding:'16px 8px',
              textAlign:'center',border:'1px solid var(--line)',
              display:'flex',flexDirection:'column',alignItems:'center',gap:'8px',
            }}>
              <div style={{
                width:44,height:44,borderRadius:'12px',
                background:'linear-gradient(135deg,#c85a00,#f07030)',
                display:'flex',alignItems:'center',justifyContent:'center',
                boxShadow:'0 4px 12px rgba(200,90,0,0.25)',
              }}>
                <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="1" y="3" width="15" height="13" rx="2"/>
                  <path d="M16 8h4l3 4v5h-7V8z"/>
                  <circle cx="5.5" cy="18.5" r="2.5"/>
                  <circle cx="18.5" cy="18.5" r="2.5"/>
                </svg>
              </div>
              <div>
                <p style={{fontWeight:800,fontSize:'.72rem',margin:'0 0 2px',color:'var(--ink)',letterSpacing:'.02em'}}>Ücretsiz</p>
                <p style={{fontSize:'.65rem',color:'var(--ink-faint)',margin:0}}>₺200 üzeri</p>
              </div>
            </div>

            {/* Güvence - 14 Gün İade */}
            <div style={{
              background:'var(--paper)',borderRadius:'16px',padding:'16px 8px',
              textAlign:'center',border:'1px solid var(--line)',
              display:'flex',flexDirection:'column',alignItems:'center',gap:'8px',
            }}>
              <div style={{
                width:44,height:44,borderRadius:'12px',
                background:'linear-gradient(135deg,#1565c0,#2196f3)',
                display:'flex',alignItems:'center',justifyContent:'center',
                boxShadow:'0 4px 12px rgba(21,101,192,0.25)',
              }}>
                <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
                  <path d="M3 3v5h5"/>
                </svg>
              </div>
              <div>
                <p style={{fontWeight:800,fontSize:'.72rem',margin:'0 0 2px',color:'var(--ink)',letterSpacing:'.02em'}}>14 Gün</p>
                <p style={{fontSize:'.65rem',color:'var(--ink-faint)',margin:0}}>Koşulsuz iade</p>
              </div>
            </div>
          </div>
        </div>

        {/* SAĞ: Bilgi */}
        <div style={{
          display: 'flex', flexDirection: 'column', gap: '22px',
          animation: mounted ? 'slideUp .65s cubic-bezier(.16,.9,.2,1) .1s both' : 'none',
        }} className="pd-info-col">

          {/* Kategori + rating */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' as const }}>
            <span style={{
              background: `${p.color}18`, color: p.color,
              fontSize: '.65rem', fontWeight: 800, letterSpacing: '.14em',
              padding: '5px 14px', borderRadius: '40px',
            }}>{p.category.toUpperCase()}</span>
            {p.badge && (
              <span style={{
                background: p.color, color: '#fff',
                fontSize: '.65rem', fontWeight: 800, letterSpacing: '.1em',
                padding: '5px 14px', borderRadius: '40px',
              }}>{p.badge}</span>
            )}
            {p.reviews.length > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginLeft: 'auto' }}>
                {[1,2,3,4,5].map(i => <Star key={i} filled={i <= Math.round(avgRating)} />)}
                <span style={{ fontSize: '.75rem', color: 'var(--ink-soft)' }}>({p.reviews.length})</span>
              </div>
            )}
          </div>

          {/* İsim + açıklama */}
          <div>
            <h1 style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(1.8rem, 4vw, 2.8rem)',
              lineHeight: 1.05, margin: '0 0 14px', color: 'var(--ink)',
            }}>{p.name}</h1>
            <div style={{
              padding: '14px 18px',
              borderLeft: `3px solid ${p.color}`,
              background: `${p.color}08`,
              borderRadius: '0 12px 12px 0',
            }}>
              <p style={{ color: 'var(--ink-soft)', lineHeight: 1.75, fontSize: '.95rem', margin: 0 }}>{p.description}</p>
            </div>
          </div>

          {/* Fiyat */}
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px' }}>
            <span style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(2rem,3.5vw,2.6rem)',
              fontWeight: 800, color: 'var(--ink)',
            }}>{p.priceDisplay}</span>
            <span style={{
              fontSize: '.78rem', color: '#2a7a4b', fontWeight: 700,
              background: '#2a7a4b15', padding: '4px 10px', borderRadius: '20px',
              display: 'flex', alignItems: 'center', gap: '4px',
            }}>
              <svg viewBox="0 0 12 12" width="10" height="10" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M1 6l3.5 3.5L11 2"/></svg>
              Stokta
            </span>
          </div>

          {/* Renk seçici */}
          <div>
            <p style={{ fontSize: '.72rem', fontWeight: 800, letterSpacing: '.12em', color: 'var(--ink-faint)', margin: '0 0 12px' }}>
              RENK — <span style={{ fontWeight: 500, letterSpacing: 0, textTransform: 'none', color: 'var(--ink-soft)' }}>{variants[selectedVariant].label}</span>
            </p>
            <div style={{ display: 'flex', gap: '12px' }}>
              {variants.map((v, i) => (
                <button key={i} onClick={() => setSelectedVariant(i)} type="button" style={{
                  width: '36px', height: '36px', borderRadius: '50%',
                  background: v.color, border: 'none', cursor: 'pointer',
                  outline: selectedVariant === i ? `3px solid ${v.color}` : '3px solid transparent',
                  outlineOffset: '4px',
                  boxShadow: `0 4px 14px ${v.color}60`,
                  transition: 'transform .25s cubic-bezier(.34,1.56,.64,1), outline .2s',
                  transform: selectedVariant === i ? 'scale(1.18)' : 'scale(1)',
                }} />
              ))}
            </div>
          </div>

          {/* Beden seçici */}
          {p.category === 'Giyim' && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                <p style={{ fontSize: '.72rem', fontWeight: 800, letterSpacing: '.12em', color: 'var(--ink-faint)', margin: 0 }}>BEDEN</p>
                <a href="#" style={{ fontSize: '.75rem', color: p.color, textDecoration: 'none', fontWeight: 600 }}>Tablo →</a>
              </div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' as const }}>
                {['XS','S','M','L','XL','2XL'].map(s => (
                  <button key={s} onClick={() => setSelectedSize(s)} type="button" style={{
                    padding: '9px 18px', borderRadius: '10px', cursor: 'pointer',
                    fontFamily: 'var(--font-body)', fontSize: '.85rem', fontWeight: 700,
                    background: selectedSize === s ? 'var(--ink)' : 'var(--paper)',
                    color: selectedSize === s ? '#fff' : 'var(--ink)',
                    border: `1.5px solid ${selectedSize === s ? 'var(--ink)' : 'var(--line)'}`,
                    transition: 'all .18s cubic-bezier(.34,1.56,.64,1)',
                    transform: selectedSize === s ? 'scale(1.06)' : 'scale(1)',
                  }}>{s}</button>
                ))}
              </div>
            </div>
          )}

          {/* Adet + Sepet */}
          <QtySelector product={p} />

          {/* Kargo */}
          <div style={{
            display: 'flex', gap: '12px', alignItems: 'center',
            padding: '14px 18px', background: 'var(--paper)',
            borderRadius: '14px', border: '1px solid var(--line)',
          }}>
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke={p.color} strokeWidth="1.8" style={{ flexShrink: 0 }}>
              <path d="M5 17H3a2 2 0 01-2-2V5a2 2 0 012-2h11a2 2 0 012 2v3"/>
              <rect x="9" y="11" width="14" height="10" rx="2"/>
              <circle cx="12" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
            </svg>
            <p style={{ fontSize: '.82rem', color: 'var(--ink-soft)', margin: 0, lineHeight: 1.6 }}>
              Bugün sipariş ver, <strong style={{ color: p.color }}>2–4 iş günü</strong> içinde teslim al
            </p>
          </div>

          {/* TABS */}
          <div style={{ borderTop: '1px solid var(--line)', paddingTop: '28px' }}>
            <div style={{ display: 'flex', borderBottom: '1px solid var(--line)', marginBottom: '24px', overflowX: 'auto' as const }}>
              {(['aciklama','ozellikler',`yorumlar`,`sss`] as const).map((key) => {
                const labels: Record<string,string> = { aciklama:'Açıklama', ozellikler:'Özellikler', yorumlar:`Yorumlar (${p.reviews.length})`, sss:'SSS' };
                return (
                  <button key={key} onClick={() => setActiveTab(key)} type="button" style={{
                    padding: '10px 18px', background: 'none', border: 'none',
                    borderBottom: `2.5px solid ${activeTab === key ? p.color : 'transparent'}`,
                    cursor: 'pointer', fontWeight: activeTab === key ? 700 : 400,
                    color: activeTab === key ? 'var(--ink)' : 'var(--ink-faint)',
                    fontSize: '.82rem', whiteSpace: 'nowrap' as const,
                    transition: 'color .2s, border-color .2s',
                    fontFamily: 'var(--font-body)',
                  }}>{labels[key]}</button>
                );
              })}
            </div>

            <div style={{ animation: 'tabIn .3s ease both' }} key={activeTab}>
              {activeTab === 'aciklama' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <p style={{ color: 'var(--ink-soft)', lineHeight: 1.8, fontSize: '.93rem', margin: 0 }}>{p.longDescription}</p>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    {p.details.map((d, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '9px', fontSize: '.84rem', color: 'var(--ink-soft)' }}>
                        <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: `${p.color}15`, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <svg viewBox="0 0 10 10" width="8" height="8" fill="none" stroke={p.color} strokeWidth="2.5" strokeLinecap="round"><path d="M1.5 5l2.5 2.5 5-5"/></svg>
                        </div>
                        {d}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'ozellikler' && (
                <div>
                  {p.specs.map((s, i) => (
                    <div key={i} style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '13px 0',
                      borderBottom: i < p.specs.length - 1 ? '1px solid var(--line)' : 'none',
                    }}>
                      <span style={{ fontSize: '.84rem', color: 'var(--ink-faint)', fontWeight: 600 }}>{s.label}</span>
                      <span style={{ fontSize: '.84rem', color: 'var(--ink)' }}>{s.value}</span>
                    </div>
                  ))}
                </div>
              )}

              {activeTab === 'yorumlar' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {p.reviews.length === 0 && (
                    <p style={{ color: 'var(--ink-faint)', textAlign: 'center' as const, padding: '40px 0' }}>Henüz yorum yok.</p>
                  )}
                  {p.reviews.length > 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '20px', padding: '16px 20px', background: 'var(--paper)', borderRadius: '16px', border: '1px solid var(--line)', marginBottom: '8px' }}>
                      <div style={{ textAlign: 'center' as const }}>
                        <div style={{ fontFamily: 'var(--font-display)', fontSize: '3rem', fontWeight: 800, color: 'var(--ink)', lineHeight: 1 }}>{avgRating.toFixed(1)}</div>
                        <div style={{ display: 'flex', gap: '2px', justifyContent: 'center', margin: '4px 0' }}>
                          {[1,2,3,4,5].map(i => <Star key={i} filled={i <= Math.round(avgRating)} />)}
                        </div>
                        <div style={{ fontSize: '.7rem', color: 'var(--ink-faint)' }}>{p.reviews.length} yorum</div>
                      </div>
                      <div style={{ flex: 1 }}>
                        {[5,4,3,2,1].map(n => {
                          const count = p.reviews.filter(r => r.rating === n).length;
                          return (
                            <div key={n} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                              <span style={{ fontSize: '.68rem', color: 'var(--ink-faint)', width: '8px' }}>{n}</span>
                              <div style={{ flex: 1, height: '5px', background: 'var(--cream-deep)', borderRadius: '3px', overflow: 'hidden' }}>
                                <div style={{ height: '100%', width: `${p.reviews.length ? (count/p.reviews.length)*100 : 0}%`, background: p.color, borderRadius: '3px', transition: 'width 1s ease' }} />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  {p.reviews.map((r, i) => (
                    <div key={i} style={{ padding: '16px', background: 'var(--paper)', borderRadius: '16px', border: '1px solid var(--line)', animation: `tabIn .3s ${i*0.06}s both` }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{ width: '34px', height: '34px', borderRadius: '50%', background: p.color, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '.85rem', flexShrink: 0 }}>{r.name[0]}</div>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: '.85rem', color: 'var(--ink)' }}>{r.name}</div>
                            <div style={{ display: 'flex', gap: '2px' }}>{[1,2,3,4,5].map(i => <Star key={i} filled={i <= r.rating} />)}</div>
                          </div>
                        </div>
                        <span style={{ fontSize: '.7rem', color: 'var(--ink-faint)' }}>{r.date}</span>
                      </div>
                      <p style={{ margin: 0, fontSize: '.88rem', color: 'var(--ink-soft)', lineHeight: 1.65 }}>{r.comment}</p>
                    </div>
                  ))}
                </div>
              )}

              {activeTab === 'sss' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {p.faq.map((f, i) => (
                    <div key={i} style={{ border: '1px solid var(--line)', borderRadius: '14px', overflow: 'hidden', transition: 'box-shadow .2s', boxShadow: openFaq === i ? `0 4px 24px ${p.color}18` : 'none' }}>
                      <button onClick={() => setOpenFaq(openFaq === i ? null : i)} type="button" style={{
                        width: '100%', padding: '14px 18px',
                        background: openFaq === i ? `${p.color}08` : 'var(--paper)',
                        border: 'none', cursor: 'pointer',
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        textAlign: 'left' as const, gap: '12px', fontFamily: 'var(--font-body)',
                        transition: 'background .2s',
                      }}>
                        <span style={{ fontWeight: 600, fontSize: '.88rem', color: 'var(--ink)' }}>{f.q}</span>
                        <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke={p.color} strokeWidth="2"
                          style={{ flexShrink: 0, transform: openFaq === i ? 'rotate(180deg)' : 'none', transition: 'transform .25s' }}>
                          <path d="M3 6l5 5 5-5"/>
                        </svg>
                      </button>
                      {openFaq === i && (
                        <div style={{ padding: '0 18px 16px', background: `${p.color}05`, animation: 'tabIn .2s ease' }}>
                          <p style={{ margin: 0, fontSize: '.86rem', color: 'var(--ink-soft)', lineHeight: 1.7 }}>{f.a}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* İLGİLİ ÜRÜNLER — yatay kayan kartlar */}
      <div style={{ background: 'var(--ink)', padding: '52px 0 60px', overflow: 'hidden' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 var(--pad)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '24px' }}>
            <div>
              <p style={{ margin: '0 0 4px', fontSize: '.68rem', letterSpacing: '.18em', color: 'rgba(243,238,225,.35)', fontFamily: 'var(--font-mark)' }}>BUNLARI DA</p>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(1.4rem,3vw,2rem)', color: 'var(--cream-fixed)', margin: 0, lineHeight: 1 }}>
                beğenebilirsin
              </h2>
            </div>
            <a href="/urunler" style={{ color: p.color, textDecoration: 'none', fontSize: '.82rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
              Tümü <svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M3 8h10M9 4l4 4-4 4"/></svg>
            </a>
          </div>
        </div>

        {/* Yatay scroll - kenardan taşıyor */}
        <div style={{
          display: 'flex', gap: '14px',
          overflowX: 'auto', paddingLeft: 'var(--pad)', paddingRight: 'var(--pad)',
          paddingBottom: '8px',
          scrollbarWidth: 'none' as any,
          WebkitOverflowScrolling: 'touch' as any,
        }}>
          {related.map((r, i) => (
            <a key={r.id} href={`/urunler/${r.slug}`}
              style={{
                flexShrink: 0, width: '200px',
                background: 'rgba(255,255,255,.06)',
                border: '1px solid rgba(255,255,255,.1)',
                borderRadius: '20px', overflow: 'hidden',
                textDecoration: 'none', display: 'flex', flexDirection: 'column',
                transition: 'all .3s cubic-bezier(.34,1.56,.64,1)',
                animation: `slideUp .5s ${i*0.1}s both`,
              }}
              onMouseEnter={e => {
                const el = e.currentTarget as HTMLElement;
                el.style.background = 'rgba(255,255,255,.12)';
                el.style.transform = 'translateY(-6px) scale(1.03)';
                el.style.boxShadow = `0 16px 40px ${r.color}30`;
                el.style.borderColor = `${r.color}50`;
              }}
              onMouseLeave={e => {
                const el = e.currentTarget as HTMLElement;
                el.style.background = 'rgba(255,255,255,.06)';
                el.style.transform = '';
                el.style.boxShadow = '';
                el.style.borderColor = 'rgba(255,255,255,.1)';
              }}
            >
              {/* Görsel */}
              <div style={{
                background: `linear-gradient(145deg, ${r.color}20, ${r.color}08)`,
                padding: '32px 24px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                aspectRatio: '1', position: 'relative', overflow: 'hidden',
              }}>
                <div style={{
                  position: 'absolute', width: '80px', height: '80px', borderRadius: '50%',
                  background: `radial-gradient(circle, ${r.color}25 0%, transparent 70%)`,
                }} />
                <div style={{ color: r.color, width: '72px', height: '72px', position: 'relative', zIndex: 1, filter: `drop-shadow(0 6px 20px ${r.color}50)` }}
                  dangerouslySetInnerHTML={{ __html: r.svgIcon }} />
                {r.badge && (
                  <div style={{
                    position: 'absolute', top: '10px', left: '10px',
                    background: r.color, color: '#fff',
                    fontSize: '.55rem', fontWeight: 800, letterSpacing: '.1em',
                    padding: '3px 8px', borderRadius: '20px',
                  }}>{r.badge.toUpperCase()}</div>
                )}
              </div>
              {/* Bilgi */}
              <div style={{ padding: '14px 16px 18px', flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <p style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '.92rem', margin: 0, color: 'var(--cream-fixed)', lineHeight: 1.2 }}>{r.name}</p>
                <p style={{ fontSize: '.78rem', color: 'rgba(243,238,225,.5)', margin: 0, lineHeight: 1.5 }}>{r.description.slice(0, 45)}…</p>
                <p style={{ color: r.accentColor, fontWeight: 800, fontSize: '.95rem', margin: '4px 0 0', fontFamily: 'var(--font-display)' }}>{r.priceDisplay}</p>
              </div>
            </a>
          ))}

          {/* Tümünü gör kartı */}
          <a href="/urunler" style={{
            flexShrink: 0, width: '160px',
            background: `${p.color}15`,
            border: `1.5px dashed ${p.color}50`,
            borderRadius: '20px',
            textDecoration: 'none', display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', gap: '10px',
            padding: '24px 16px', color: p.color,
            transition: 'all .25s',
            animation: `slideUp .5s ${related.length * 0.1}s both`,
          }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = `${p.color}25`; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = `${p.color}15`; }}
          >
            <div style={{
              width: '48px', height: '48px', borderRadius: '50%',
              background: `${p.color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <svg viewBox="0 0 16 16" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M3 8h10M9 4l4 4-4 4"/></svg>
            </div>
            <p style={{ margin: 0, fontWeight: 700, fontSize: '.82rem', textAlign: 'center' as const, lineHeight: 1.4 }}>Tüm<br/>ürünler</p>
          </a>
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .pd-grid { grid-template-columns: 1fr !important; gap: 28px !important; }
          .pd-img-col { position: static !important; top: auto !important; }
        }
      `}</style>
    </main>
  );
}
