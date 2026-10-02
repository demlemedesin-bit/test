import type { FooterLink } from '@/lib/siteDefaults';
import { NewsletterForm } from './NewsletterForm';
import { D } from './Display';

const DEFAULT_LINKS: FooterLink[] = [
  { label: 'Sipariş takibi', href: '/siparis-takip' },
  { label: 'Kargo ve iade', href: '/kargo-ve-iade' },
  { label: 'Mesafeli satış sözleşmesi', href: '/mesafeli-satis-sozlesmesi' },
  { label: 'KVKK', href: '/kvkk' },
  { label: 'Gizlilik politikası', href: '/gizlilik-politikasi' },
  { label: 'Çerez politikası', href: '/cerez-politikasi' },
  { label: 'Kullanım şartları', href: '/kullanim-sartlari' },
];

const safe = (u: string) => (/^(\/|#|https?:\/\/|mailto:|tel:)/i.test(u.trim()) ? u.trim() : '#');

/** Alt bilgi. Metin ve bağlantılar yönetim panelinden (İçerik → Menü ve footer) gelir; verilmezse varsayılanlar. */
export function Footer({ copy = '© 2026 Demleme. Tüm hakları saklıdır.', links = DEFAULT_LINKS, extra = [] }: { copy?: string; links?: FooterLink[]; extra?: FooterLink[] }) {
  // Panelden “Footer'da göster” denen sayfalar; aynı adrese giden bağlantı iki kez yazılmaz.
  const all = [...links, ...extra.filter((e) => !links.some((l) => l.href === e.href))];
  return (
    <footer className="pf">
      <div className="pf-news">
        <div>
          <b className="pf-news-t">
            <D>Bültene katıl</D>
          </b>
          <p className="pf-news-p">Yeni ürünlerden ve kampanyalardan ilk sen haberdar ol.</p>
        </div>
        <NewsletterForm source="footer" tone="dark" />
      </div>
      <span>{copy}</span>
      <span className="pf-links">
        <a href="/">Ana sayfa</a>
        {all.map((l, i) => (
          <a key={i} href={safe(l.href)}>
            {l.label}
          </a>
        ))}
      </span>
    </footer>
  );
}
