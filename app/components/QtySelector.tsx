'use client';
import { useState } from 'react';
import { addToCart } from '@/lib/cart';
import type { Product } from '@/lib/products';

export default function QtySelector({ product }: { product: Product }) {
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);

  const handle = () => {
    addToCart({
      id: product.id,
      slug: product.slug,
      name: product.name,
      price: product.price,
      priceDisplay: product.priceDisplay,
      svgIcon: product.svgIcon,
      color: product.color,
    }, qty);
    setAdded(true);
    setTimeout(() => setAdded(false), 1800);
  };

  const btnStyle = {
    width:'40px',height:'40px',borderRadius:'50%',border:'1.5px solid var(--line)',
    background:'var(--paper)',cursor:'pointer',fontSize:'1.2rem',
    display:'flex',alignItems:'center',justifyContent:'center',
    color:'var(--ink)',fontWeight:700,transition:'background .2s',
  } as const;

  return (
    <div style={{display:'flex',gap:'12px',alignItems:'center',flexWrap:'wrap'}}>
      {/* Adet */}
      <div style={{display:'flex',alignItems:'center',gap:'8px',
        border:'1.5px solid var(--line)',borderRadius:'40px',padding:'6px 8px',
        background:'var(--paper)'}}>
        <button style={btnStyle} onClick={() => setQty(q => Math.max(1, q-1))}>−</button>
        <span style={{minWidth:'28px',textAlign:'center',fontWeight:700,fontSize:'1rem'}}>{qty}</span>
        <button style={btnStyle} onClick={() => setQty(q => Math.min(product.stock, q+1))}>+</button>
      </div>

      {/* Sepete ekle */}
      <button onClick={handle} style={{
        background: added ? 'var(--green)' : 'var(--ink)',
        color:'#fff',border:'none',borderRadius:'40px',
        padding:'14px 32px',cursor:'pointer',fontWeight:600,
        fontSize:'1rem',fontFamily:'var(--font-body)',
        display:'flex',alignItems:'center',gap:'8px',
        transition:'background .3s',flex:1,justifyContent:'center',
      }}>
        {added ? (
          <>✓ Sepete Eklendi</>
        ) : (
          <>
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M6 6h15l-1.5 9h-12z"/><circle cx="9" cy="20" r="1.4"/><circle cx="18" cy="20" r="1.4"/>
            </svg>
            Sepete Ekle — {qty > 1 ? `${qty} adet · ₺${(product.price * qty).toLocaleString('tr')}` : product.priceDisplay}
          </>
        )}
      </button>

      {/* Favorile */}
      <button style={{
        ...btnStyle, border:'1.5px solid var(--line)', width:'48px', height:'48px',
      }} aria-label="Favorilere ekle">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M12 20s-7-4.35-9.5-8.5C.7 8 2 4.5 5.5 4 8 3.6 10 5 12 7.5 14 5 16 3.6 18.5 4 22 4.5 23.3 8 21.5 11.5 19 15.65 12 20 12 20z"/>
        </svg>
      </button>
    </div>
  );
}
