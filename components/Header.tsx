'use client';

import Link from 'next/link';
import { useCart } from '@/lib/cart';
import { useAuth } from '@/lib/auth';
import { D } from './Display';

export type NavLabels = { shop: string; guests: string; about: string; contact: string; account: string; login: string };
const DEFAULT_LABELS: NavLabels = { shop: 'Mağaza', guests: 'Konuklar', about: 'Hakkında', contact: 'İletişim', account: 'Hesabım', login: 'Giriş yap' };

export function Header({ active, labels = DEFAULT_LABELS }: { active?: 'sepet' | 'hesap'; labels?: NavLabels }) {
  const { items } = useCart();
  const { user, loading } = useAuth();
  const count = items.reduce((n, i) => n + i.qty, 0);
  const acct = loading || user ? labels.account : labels.login;

  return (
    <header className="pn">
      <a className="pn-logo" href="/">
        <span>
          <D>Demleme</D>
        </span>
        <img src="/demleme/01-brand/logo/logo-still.png" alt="" />
      </a>
      <nav className="pn-links" aria-label="Ana menü">
        <a href="/#magaza">{labels.shop}</a>
        <a href="/#konuklar">{labels.guests}</a>
        <a href="/#hakkinda">{labels.about}</a>
        <a href="/#iletisim">{labels.contact}</a>
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
