import { getSite, text } from '@/lib/site';
import { Footer } from './Footer';
import { Header } from './Header';

/** Mağaza sayfalarının üst menüsü: etiketler panelden (İçerik → Menü). */
export async function SiteHeader() {
  const s = await getSite();
  return (
    <Header
      labels={{
        shop: text(s, 'nav_shop'),
        guests: text(s, 'nav_guests'),
        about: text(s, 'nav_about'),
        contact: text(s, 'nav_contact'),
        account: text(s, 'nav_account'),
        login: text(s, 'nav_login'),
      }}
    />
  );
}

/** Alt bilgi: telif satırı ve bağlantılar panelden (İçerik → Footer, Menü ve footer). */
export async function SiteFooter() {
  const s = await getSite();
  return <Footer copy={text(s, 'footer_copy')} links={s.footer.legal} />;
}
