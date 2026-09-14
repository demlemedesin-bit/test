'use client';
import { useEffect, useState } from 'react';
import { getCart, removeFromCart, updateQty, cartTotal, clearCart, type CartItem } from '@/lib/cart';

export default function CartContent() {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setCart(getCart());
    const update = () => setCart(getCart());
    window.addEventListener('cart-updated', update);
    return () => window.removeEventListener('cart-updated', update);
  }, []);

  if (!mounted) return null;

  if (cart.length === 0) {
    return (
      <div style={{textAlign:'center',padding:'80px 20px'}}>
        <svg viewBox="0 0 80 80" width="80" height="80" fill="none" stroke="var(--ink-faint)" strokeWidth="1.5" style={{marginBottom:'24px'}}>
          <path d="M20 20h50l-5 30H25z"/><circle cx="30" cy="66" r="5"/><circle cx="60" cy="66" r="5"/>
          <path d="M10 10h8l2 10"/>
        </svg>
        <h2 style={{fontFamily:'var(--font-display)',fontSize:'1.6rem',color:'var(--ink)',marginBottom:'12px'}}>
          Sepetinde hiç ürün yok
        </h2>
        <p style={{color:'var(--ink-soft)',marginBottom:'28px'}}>
          Sofra mağazamıza göz at, bir şeyler beğenirsin.
        </p>
        <a href="/urunler" style={{
          display:'inline-flex',alignItems:'center',gap:'8px',
          background:'var(--ink)',color:'#fff',textDecoration:'none',
          borderRadius:'40px',padding:'14px 28px',fontWeight:600,fontSize:'.95rem',
        }}>
          Mağazaya Git
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
        </a>
      </div>
    );
  }

  const total = cartTotal(cart);
  const shipping = total >= 200 ? 0 : 39;

  const btnStyle = {
    width:'32px',height:'32px',borderRadius:'50%',border:'1.5px solid var(--line)',
    background:'var(--paper)',cursor:'pointer',fontSize:'1rem',
    display:'flex',alignItems:'center',justifyContent:'center',
    color:'var(--ink)',fontWeight:700,
  } as const;

  return (
    <div style={{display:'grid',gridTemplateColumns:'1fr 340px',gap:'32px',alignItems:'start'}}>

      {/* Ürün listesi */}
      <div style={{display:'flex',flexDirection:'column',gap:'16px'}}>
        {cart.map(item => (
          <div key={item.id} style={{
            background:'var(--paper)',borderRadius:'16px',padding:'20px',
            display:'flex',gap:'16px',alignItems:'center',
            boxShadow:'var(--shadow-sm)',
          }}>
            {/* Ürün ikonu */}
            <a href={`/urunler/${item.slug}`} style={{
              width:'80px',height:'80px',borderRadius:'12px',
              background:'var(--cream-deep)',flexShrink:0,
              display:'flex',alignItems:'center',justifyContent:'center',textDecoration:'none',
            }}>
              <span style={{color:item.color,width:'44px',height:'44px',display:'block'}}
                dangerouslySetInnerHTML={{__html: item.svgIcon}} />
            </a>

            {/* Meta */}
            <div style={{flex:1,minWidth:0}}>
              <a href={`/urunler/${item.slug}`} style={{
                fontFamily:'var(--font-display)',fontWeight:700,fontSize:'1.05rem',
                color:'var(--ink)',textDecoration:'none',display:'block',marginBottom:'4px',
              }}>{item.name}</a>
              <p style={{color:'var(--rust)',fontWeight:700,fontSize:'.95rem',margin:'0 0 12px'}}>
                {item.priceDisplay}
              </p>

              {/* Adet */}
              <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
                <button style={btnStyle} onClick={() => updateQty(item.id, item.qty - 1)}>−</button>
                <span style={{minWidth:'24px',textAlign:'center',fontWeight:700}}>{item.qty}</span>
                <button style={btnStyle} onClick={() => updateQty(item.id, item.qty + 1)}>+</button>
                <span style={{marginLeft:'8px',color:'var(--ink-faint)',fontSize:'.85rem'}}>
                  = ₺{(item.price * item.qty).toLocaleString('tr-TR')}
                </span>
              </div>
            </div>

            {/* Kaldır */}
            <button onClick={() => removeFromCart(item.id)} style={{
              background:'none',border:'none',cursor:'pointer',
              color:'var(--ink-faint)',padding:'8px',borderRadius:'8px',
              transition:'color .2s',flexShrink:0,
            }}
            onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.color = 'var(--rust)'}
            onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.color = 'var(--ink-faint)'}
            aria-label="Kaldır">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6"/>
              </svg>
            </button>
          </div>
        ))}

        {/* Sepeti temizle */}
        <button onClick={clearCart} style={{
          background:'none',border:'1.5px solid var(--line)',borderRadius:'40px',
          padding:'10px 20px',cursor:'pointer',color:'var(--ink-faint)',
          fontSize:'.85rem',alignSelf:'flex-start',transition:'all .2s',
        }}>
          Sepeti Temizle
        </button>
      </div>

      {/* Özet */}
      <div style={{
        background:'var(--paper)',borderRadius:'20px',padding:'28px',
        boxShadow:'var(--shadow-sm)',position:'sticky',top:'24px',
      }}>
        <h2 style={{fontFamily:'var(--font-display)',fontSize:'1.3rem',
          marginBottom:'20px',color:'var(--ink)'}}>Sipariş Özeti</h2>

        <div style={{display:'flex',flexDirection:'column',gap:'12px',marginBottom:'20px'}}>
          <div style={{display:'flex',justifyContent:'space-between',fontSize:'.9rem',color:'var(--ink-soft)'}}>
            <span>Ara toplam</span>
            <span>₺{total.toLocaleString('tr-TR')}</span>
          </div>
          <div style={{display:'flex',justifyContent:'space-between',fontSize:'.9rem',color:'var(--ink-soft)'}}>
            <span>Kargo</span>
            <span style={{color: shipping === 0 ? 'var(--green)' : 'inherit'}}>
              {shipping === 0 ? 'Ücretsiz 🎉' : `₺${shipping}`}
            </span>
          </div>
          {shipping > 0 && (
            <p style={{fontSize:'.78rem',color:'var(--ink-faint)',background:'var(--cream-deep)',
              borderRadius:'8px',padding:'8px 12px',margin:0}}>
              ₺{(200 - total).toLocaleString('tr-TR')} daha ekle, kargo bedava!
            </p>
          )}
          <div style={{borderTop:'1px solid var(--line)',paddingTop:'12px',
            display:'flex',justifyContent:'space-between',
            fontFamily:'var(--font-display)',fontSize:'1.2rem',fontWeight:700,color:'var(--ink)'}}>
            <span>Toplam</span>
            <span>₺{(total + shipping).toLocaleString('tr-TR')}</span>
          </div>
        </div>

        <button style={{
          width:'100%',background:'var(--ink)',color:'#fff',border:'none',
          borderRadius:'40px',padding:'16px',cursor:'pointer',
          fontWeight:700,fontSize:'1rem',fontFamily:'var(--font-body)',
          display:'flex',alignItems:'center',justifyContent:'center',gap:'8px',
          marginBottom:'12px',transition:'background .2s',
        }}
        onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.background = 'var(--rust)'}
        onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background = 'var(--ink)'}
        onClick={() => window.location.href='/odeme'}>
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/>
          </svg>
          Ödemeye Geç
        </button>

        <a href="/urunler" style={{
          display:'flex',alignItems:'center',justifyContent:'center',gap:'6px',
          color:'var(--ink-faint)',fontSize:'.85rem',textDecoration:'none',
        }}>
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
          Alışverişe Devam Et
        </a>

        {/* Güven rozetleri */}
        <div style={{marginTop:'20px',borderTop:'1px solid var(--line)',paddingTop:'16px',
          display:'flex',flexDirection:'column',gap:'8px'}}>
          {['🔒 Güvenli ödeme','📦 Hızlı kargo','↩️ 14 gün iade'].map(t => (
            <p key={t} style={{fontSize:'.78rem',color:'var(--ink-faint)',margin:0}}>{t}</p>
          ))}
        </div>
      </div>
    </div>
  );
}
