'use client';
import { useState } from 'react';
import { addToCart } from '@/lib/cart';
import type { Product } from '@/lib/products';

interface Props {
  product: Product;
  small?: boolean;
  qty?: number;
}

export default function AddToCartBtn({ product, small, qty = 1 }: Props) {
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

  return (
    <button
      onClick={handle}
      style={{
        background: added ? 'var(--green)' : 'var(--ink)',
        color: '#fff',
        border: 'none',
        borderRadius: '40px',
        padding: small ? '10px 18px' : '14px 28px',
        fontFamily: 'var(--font-body)',
        fontSize: small ? '.82rem' : '.95rem',
        fontWeight: 600,
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        transition: 'background .3s',
        whiteSpace: 'nowrap',
      }}
    >
      {added ? (
        <>
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12l5 5L19 7"/></svg>
          Eklendi
        </>
      ) : (
        <>
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 6h15l-1.5 9h-12z"/><circle cx="9" cy="20" r="1.4"/><circle cx="18" cy="20" r="1.4"/></svg>
          {small ? 'Sepete Ekle' : 'Sepete Ekle'}
        </>
      )}
    </button>
  );
}
