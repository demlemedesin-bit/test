'use client';

import Link from 'next/link';
import { useCart } from '@/lib/cart';
import { useAuth } from '@/lib/auth';
import { D } from './Display';

export function Header({ active }: { active?: 'sepet' | 'hesap' }) {
  const { items } = useCart();
  const { user, loading } = useAuth();
  const count = items.reduce((n, i) => n + i.qty, 0);
  const acct = loading ? 'Hesabım' : user ? 'Hesabım' : 'Giriş yap';

  return (
    <header className="pn">
      <a className="pn-logo" href="/">
        <span>
          <D>Demleme</D>
        </span>
        <img src="/demleme/01-brand/logo/logo-still.png" alt="" />
      </a>
      <nav className="pn-links" aria-label="Ana menü">
        <a href="/#magaza">Mağaza</a>
        <a href="/#konuklar">Konuklar</a>
        <a href="/#hakkinda">Hakkında</a>
        <a href="/#iletisim">İletişim</a>
      </nav>
      <div className="pn-right">
        <Link className={`pn-acct${active === 'hesap' ? ' on' : ''}`} href={user ? '/hesabim' : '/giris'}>
          {acct}
        </Link>
        <Link className="pn-cart" href="/sepet" aria-label={`Sepet${count ? `, ${count} ürün` : ''}`}>
          <img src="/demleme/01-brand/icons/cart.png" alt="" />
          <span className={`pn-count${count ? ' on' : ''}`}>{count}</span>
        </Link>
      </div>
    </header>
  );
}
