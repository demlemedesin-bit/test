'use client';
import { useEffect, useRef, useState } from 'react';
import { getCart, CartItem, removeFromCart, updateQty, cartTotal } from '@/lib/cart';
import { products } from '@/lib/products';

export default function CartToast() {
  const [open, setOpen] = useState(false);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [lastAdded, setLastAdded] = useState<CartItem | null>(null);
  const [showToast, setShowToast] = useState(false);

  const cartRef = useRef<CartItem[]>([]);

  useEffect(() => {
    const initial = getCart();
    setCart(initial);
    cartRef.current = initial;

    const onUpdate = () => {
      const newCart = getCart();
      const prev = cartRef.current;
      // Yeni eklenen ürünü bul
      const added = newCart.find(n => {
        const o = prev.find(c => c.id === n.id);
        return !o || n.qty > o.qty;
      });
      if (added) {
        setLastAdded(added);
        setShowToast(true);
        setOpen(true);
        setTimeout(() => setShowToast(false), 3500);
      }
      cartRef.current = newCart;
      setCart([...newCart]);
    };

    const onOpen = () => {
      const c = getCart();
      cartRef.current = c;
      setCart([...c]);
      setOpen(true);
    };

    window.addEventListener('cart-updated', onUpdate);
    window.addEventListener('demleme:open-cart', onOpen);
    return () => {
      window.removeEventListener('cart-updated', onUpdate);
      window.removeEventListener('demleme:open-cart', onOpen);
    };
  }, []);

  const total = cartTotal(cart);
  const count = cart.reduce((s, c) => s + c.qty, 0);

  // Önerilen ürünler (sepette olmayanlar, max 4)
  const suggested = products
    .filter(p => !cart.find(c => c.id === p.id))
    .slice(0, 4);

  return (
    <>
      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); opacity: 0; }
          to   { transform: translateX(0);   opacity: 1; }
        }
        @keyframes slideOutRight {
          from { transform: translateX(0);   opacity: 1; }
          to   { transform: translateX(100%); opacity: 0; }
        }
        @keyframes toastIn {
          from { transform: translateY(100%) scale(.9); opacity: 0; }
          to   { transform: translateY(0) scale(1);    opacity: 1; }
        }
        @keyframes toastOut {
          from { transform: translateY(0) scale(1);    opacity: 1; }
          to   { transform: translateY(30px) scale(.9); opacity: 0; }
        }
        @keyframes checkPop {
          0%   { transform: scale(0) rotate(-20deg); }
          70%  { transform: scale(1.2) rotate(5deg); }
          100% { transform: scale(1) rotate(0deg); }
        }
        @keyframes suggIn {
          from { opacity:0; transform:translateY(12px); }
          to   { opacity:1; transform:translateY(0); }
        }
        .cart-drawer-inner::-webkit-scrollbar { width: 0; }
      `}</style>

      {/* ── BACKDROP ── */}
      {open && (
        <div
          onClick={() => setOpen(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 1000,
            background: 'rgba(0,0,0,.45)',
            backdropFilter: 'blur(4px)',
            animation: 'fadeIn .25s ease',
          }}
        />
      )}

      {/* ── DRAWER ── */}
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0,
        width: 'min(420px, 100vw)',
        zIndex: 1001,
        background: 'var(--cream)',
        boxShadow: '-8px 0 48px rgba(0,0,0,.18)',
        display: 'flex', flexDirection: 'column',
        transform: open ? 'translateX(0)' : 'translateX(100%)',
        transition: 'transform .38s cubic-bezier(.16,.9,.2,1)',
      }}>
        {/* Başlık */}
        <div style={{
          padding: '20px 24px 16px',
          borderBottom: '1px solid var(--line)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="var(--rust)" strokeWidth="1.8">
              <path d="M6 6h15l-1.5 9h-12z"/><circle cx="9" cy="20" r="1.4"/><circle cx="18" cy="20" r="1.4"/>
            </svg>
            <h3 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: '1.1rem' }}>
              Sepetim {count > 0 && <span style={{ fontSize: '.75rem', background: 'var(--rust)', color: '#fff', borderRadius: '20px', padding: '2px 8px', fontFamily: 'var(--font-body)', fontWeight: 700 }}>{count}</span>}
            </h3>
          </div>
          <button onClick={() => setOpen(false)} type="button" style={{
            background: 'var(--cream-deep)', border: 'none', borderRadius: '50%',
            width: '34px', height: '34px', cursor: 'pointer', fontSize: '1.1rem',
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ink)',
          }}>✕</button>
        </div>

        {/* Scrollable içerik */}
        <div className="cart-drawer-inner" style={{ flex: 1, overflowY: 'auto', padding: '16px 24px' }}>

          {cart.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--ink-faint)' }}>
              <div style={{ fontSize: '3rem', marginBottom: '12px' }}>🫖</div>
              <p style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', margin: '0 0 8px' }}>Sepetin boş</p>
              <p style={{ fontSize: '.85rem', margin: 0 }}>Hadi bir şeyler ekle</p>
              <a href="/urunler" onClick={() => setOpen(false)} style={{
                display: 'inline-flex', alignItems: 'center', gap: '6px',
                marginTop: '20px', padding: '12px 24px',
                background: 'var(--ink)', color: '#fff',
                borderRadius: '40px', textDecoration: 'none',
                fontSize: '.88rem', fontWeight: 600,
              }}>Mağazaya Git →</a>
            </div>
          ) : (
            <>
              {/* Sepet ürünleri */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
                {cart.map((item, i) => (
                  <div key={item.id} style={{
                    display: 'flex', gap: '12px', alignItems: 'center',
                    background: 'var(--paper)', borderRadius: '16px',
                    padding: '12px 14px', border: '1px solid var(--line)',
                    animation: `suggIn .35s ${i * 0.05}s both`,
                  }}>
                    {/* İkon */}
                    <div style={{
                      width: '52px', height: '52px', borderRadius: '12px', flexShrink: 0,
                      background: `${item.color}15`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: item.color,
                    }} dangerouslySetInnerHTML={{ __html: item.svgIcon.replace('width="80"', 'width="36"').replace('height="80"', 'height="36"') }} />
                    {/* Bilgi */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ margin: '0 0 2px', fontWeight: 700, fontSize: '.88rem', color: 'var(--ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.name}</p>
                      <p style={{ margin: 0, fontSize: '.78rem', color: 'var(--ink-soft)' }}>₺{item.price.toLocaleString('tr')} × {item.qty}</p>
                    </div>
                    {/* Adet */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                      <button onClick={() => updateQty(item.id, item.qty - 1)} type="button" style={{
                        width: '26px', height: '26px', borderRadius: '50%', border: '1.5px solid var(--line)',
                        background: 'var(--cream)', cursor: 'pointer', fontSize: '.9rem', fontWeight: 700,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ink)',
                      }}>−</button>
                      <span style={{ fontWeight: 700, fontSize: '.9rem', minWidth: '18px', textAlign: 'center' }}>{item.qty}</span>
                      <button onClick={() => updateQty(item.id, item.qty + 1)} type="button" style={{
                        width: '26px', height: '26px', borderRadius: '50%', border: '1.5px solid var(--line)',
                        background: 'var(--cream)', cursor: 'pointer', fontSize: '.9rem', fontWeight: 700,
                        display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ink)',
                      }}>+</button>
                    </div>
                    {/* Fiyat + sil */}
                    <div style={{ textAlign: 'right' as const, flexShrink: 0 }}>
                      <p style={{ margin: '0 0 4px', fontWeight: 800, fontSize: '.92rem', fontFamily: 'var(--font-display)', color: 'var(--ink)' }}>₺{(item.price * item.qty).toLocaleString('tr')}</p>
                      <button onClick={() => removeFromCart(item.id)} type="button" style={{
                        background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-faint)', fontSize: '.7rem', padding: 0,
                      }}>kaldır</button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Önerilen ürünler */}
              {suggested.length > 0 && (
                <div style={{ marginBottom: '16px' }}>
                  <p style={{ fontSize: '.72rem', fontWeight: 800, letterSpacing: '.1em', color: 'var(--ink-faint)', margin: '0 0 12px' }}>BUNLARI DA EKLEYEBİLİRSİN</p>
                  <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '6px' }}>
                    {suggested.map((prod, i) => (
                      <div key={prod.id} style={{
                        flexShrink: 0, width: '130px',
                        background: 'var(--paper)', borderRadius: '14px',
                        border: '1px solid var(--line)', overflow: 'hidden',
                        animation: `suggIn .4s ${0.1 + i * 0.07}s both`,
                        cursor: 'pointer',
                      }} onClick={() => { window.location.href = `/urunler/${prod.slug}`; }}>
                        <div style={{
                          background: `${prod.color}12`, padding: '16px',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          <div style={{ width: '44px', height: '44px', color: prod.color }}
                            dangerouslySetInnerHTML={{ __html: prod.svgIcon }} />
                        </div>
                        <div style={{ padding: '10px 10px 12px' }}>
                          <p style={{ margin: '0 0 4px', fontSize: '.78rem', fontWeight: 700, color: 'var(--ink)', lineHeight: 1.2 }}>{prod.name}</p>
                          <p style={{ margin: 0, fontSize: '.75rem', color: prod.color, fontWeight: 700 }}>{prod.priceDisplay}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        {cart.length > 0 && (
          <div style={{
            padding: '16px 24px 24px',
            borderTop: '1px solid var(--line)',
            flexShrink: 0,
            background: 'var(--cream)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <span style={{ fontSize: '.88rem', color: 'var(--ink-soft)' }}>Ara Toplam</span>
              <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', fontWeight: 800 }}>₺{total.toLocaleString('tr')}</span>
            </div>
            {total < 200 && (
              <div style={{
                background: 'var(--butter)', borderRadius: '10px', padding: '10px 14px',
                marginBottom: '12px', fontSize: '.78rem', color: 'var(--ink-soft)',
                display: 'flex', alignItems: 'center', gap: '8px',
              }}>
                <span>🚚</span>
                <span>₺{(200 - total).toLocaleString('tr')} daha ekle, <strong>ücretsiz kargo</strong> kazan</span>
              </div>
            )}
            {total >= 200 && (
              <div style={{
                background: '#2a7a4b15', borderRadius: '10px', padding: '10px 14px',
                marginBottom: '12px', fontSize: '.78rem', color: '#2a7a4b',
                display: 'flex', alignItems: 'center', gap: '8px',
              }}>
                <span>✓</span>
                <strong>Ücretsiz kargo kazandın!</strong>
              </div>
            )}
            <button type="button" onClick={() => { window.location.href = '/odeme'; }} style={{
              width: '100%', padding: '16px',
              background: 'var(--ink)', color: '#fff',
              border: 'none', borderRadius: '14px',
              fontFamily: 'var(--font-body)', fontSize: '1rem', fontWeight: 700,
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
            }}>
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2"><rect x="1" y="4" width="22" height="16" rx="3"/><path d="M1 10h22"/></svg>
              Siparişi Tamamla
            </button>
            <button onClick={() => setOpen(false)} type="button" style={{
              width: '100%', marginTop: '8px', padding: '12px',
              background: 'none', border: 'none',
              fontFamily: 'var(--font-body)', fontSize: '.85rem', color: 'var(--ink-soft)',
              cursor: 'pointer',
            }}>Alışverişe Devam Et</button>
          </div>
        )}
      </div>

      {/* ── TOAST bildirimi (sepete eklenince) ── */}
      {showToast && lastAdded && (
        <div style={{
          position: 'fixed', bottom: '24px', left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 1100,
          background: 'var(--ink)',
          color: '#fff',
          borderRadius: '16px',
          padding: '14px 20px',
          display: 'flex', alignItems: 'center', gap: '12px',
          boxShadow: '0 8px 32px rgba(0,0,0,.25)',
          minWidth: '260px', maxWidth: '90vw',
          animation: 'toastIn .35s cubic-bezier(.34,1.56,.64,1)',
        }}>
          <div style={{
            width: '32px', height: '32px', borderRadius: '50%',
            background: '#2a7a4b',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            animation: 'checkPop .4s .1s both',
            flexShrink: 0,
          }}>
            <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round"><path d="M2.5 8l4 4 7-7"/></svg>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ margin: '0 0 2px', fontWeight: 700, fontSize: '.88rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{lastAdded.name}</p>
            <p style={{ margin: 0, fontSize: '.75rem', color: 'rgba(255,255,255,.6)' }}>Sepete eklendi</p>
          </div>
          <button onClick={() => setOpen(true)} type="button" style={{
            background: 'rgba(255,255,255,.15)', border: 'none', borderRadius: '8px',
            padding: '6px 12px', color: '#fff', fontSize: '.78rem', fontWeight: 600,
            cursor: 'pointer', flexShrink: 0,
          }}>Göster</button>
        </div>
      )}
    </>
  );
}
