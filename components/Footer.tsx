import Link from 'next/link';

export function Footer() {
  return (
    <footer className="pf">
      <span>© 2026 Demleme. Tüm hakları saklıdır.</span>
      <span className="pf-links">
        <a href="/">Ana sayfa</a>
        <Link href="/siparis-takip">Sipariş takibi</Link>
        <Link href="/kargo-ve-iade">Kargo &amp; iade</Link>
        <Link href="/mesafeli-satis-sozlesmesi">Mesafeli satış sözleşmesi</Link>
        <Link href="/kvkk">KVKK</Link>
        <Link href="/gizlilik-politikasi">Gizlilik</Link>
        <Link href="/kullanim-sartlari">Kullanım şartları</Link>
      </span>
    </footer>
  );
}
