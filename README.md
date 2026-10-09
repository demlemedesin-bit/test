# Demleme

Demleme web sitesi: ana sayfa + 10 ürün sayfası. Tasarım: Benny Yorohan · Müşteri: Garen Kösedağ.
Tasarım teslim paketinden (`Demleme-Handoff`, 28 Eylül 2026) Next.js'e uyarlandı.

## Yapı

| Yol | Ne |
|---|---|
| `app/page.tsx` | Ana sayfa (`/`) |
| `app/urun/[slug]/page.tsx` | Ürün sayfaları (`/urun/demleme-sehpasi` gibi, 10 ürün) |
| `app/home.css`, `app/urun/[slug]/product.css` | Tasarımın CSS'i (renk/aralık değişkenleri `:root` içinde) |
| `content/home.html`, `content/product.html` | Sayfa iskeletleri (handoff şablonları) |
| `content/konuklar.json` | Masadaki konuklar: isim, profil linki, çizim, 3 reel |
| `content/products.json` | Ürünler: fiyat, renk, beden, ölçü, malzeme, bakım, kargo |
| `lib/content.ts` | İçeriği okuyup sayfalara gömer |
| `public/demleme/` | Tüm görsel, video ve SVG'ler (bölüm bölüm klasörlü) |
| `public/demleme/home.js`, `product.js` | Animasyon ve etkileşimler (çay dökme, dönen masa, sepet…) |

## İçerik değiştirme
- **Konuklar:** `content/konuklar.json`
- **Ürünler / fiyatlar:** `content/products.json` (ürün fotoğrafları `public/demleme/06-urun/images/`)
- **Ayın demleyenleri (5 fotoğraf):** `content/home.html` içindeki `#demleyenData`
- **Rakamlar:** `content/home.html` içinde `data-count`

Not: Ürün verileri, konuk isimleri, reel kapakları ve demleyen fotoğrafları tasarım paketindeki yer tutuculardır;
Garen'in onayıyla gerçekleriyle değiştirilecek.

## Notlar
- Fontlar: Strenuous (Adobe Fonts kiti `fjx5jha`; kitte yayın alan adı olarak Vercel adresi/alan adı ekli olmalı),
  Kodchasan ve Caveat (Google Fonts).
- Sepet `localStorage` (`demleme-cart`) ile çalışır; ana sayfa ve ürün sayfaları aynı sepeti paylaşır.
  Ödeme sayfası henüz yok.
- Sunucuda dosya okuma sadece `content/` klasörüne yapılır; sayfalar build sırasında statik üretilir.

## Geliştirme
```bash
npm install
npm run dev      # http://localhost:3000
npm run build
```

## E-ticaret (üye, sepet, ödeme)

- Sayfalar: `/giris`, `/kayit`, `/sifremi-unuttum`, `/sifre-sifirla`, `/hesabim`, `/sepet`, `/odeme`, `/siparis-tamamlandi`, `/siparis-takip`, yasal metinler (`/kvkk`, `/kargo-ve-iade`, `/mesafeli-satis-sozlesmesi`, `/gizlilik-politikasi`, `/kullanim-sartlari`).
- Veritabanı: Supabase. Şema `supabase/migrations/0001_eticaret.sql`. Fiyatlar ve kargo hesabı sunucuda (`create_order`) yapılır, tarayıcıdan gelen fiyat dikkate alınmaz.
- Ortam değişkenleri: `.env.example` (yalnızca anon anahtar; `service_role` asla koda/repoya girmez).
- Satıcı/banka bilgileri: `content/shop-config.json` (boşsa yasal metinlerde ve havale ekranında yer tutucu gösterilir).
- Ödeme: havale/EFT ve kapıda ödeme aktif; kart ödemesi Paynkolay ortak ödeme sayfasıyla alınır (kurulum: docs/paynkolay/README.md).

## Yönetim paneli (`/admin`)

- Beyaz temalı panel: genel bakış, siparişler (durum, kargo takibi, iptal, CSV, yazdır), ürünler (fiyat, stok, görsel yükleme, renk/beden, sıra, yayın durumu), müşteriler, ayarlar (kargo, havale/IBAN, satıcı bilgileri, yöneticiler).
- Yetki: `profiles.role = 'admin'`. `shop_settings.admin_emails` içindeki e-posta ile kayıt olan kullanıcı otomatik yönetici olur; sonrası panelden eklenir. Rol, tarayıcıdan değiştirilemez (sütun yetkisi + RLS).
- Site ↔ veritabanı: ürünler ve ayarlar Supabase'ten okunur (`lib/catalog.ts`, 60 sn önbellek). Panelde kaydedince `/api/revalidate` (yalnızca yönetici jetonuyla) siteyi anında yeniler. Veritabanına ulaşılamazsa `content/` altındaki dosyalar devreye girer.
- Stok: `products.stock` boşsa sınırsız; sipariş stoktan düşer, iptalde geri eklenir.
- Şema: `supabase/migrations/0002_yonetim.sql` (0001'den sonra uygulanır).

## İçerik yönetimi ve takip (faz 2)

- **/admin/icerik**: ana sayfadaki tüm metinler, görseller, bağlantılar, istatistikler, SSS, konuklar/reels, ayın demleyenleri, footer, SEO, bölüm aç/kapa ve animasyon ayarları. Veri `site_content` tablosunda; kaydedilmeyen alanlar `lib/siteDefaults.ts` varsayılanıdır (yeni alan eklemek için `FIELDS`'a ekleyip `content/home.html`'e `{{t:alan_id}}` yaz).
- **/admin/takip**: UTM’li kısa linkler (`/t/<kod>`), kaynak/kampanya raporu (ziyaretçi, sepet, sipariş, ciro). Olaylar `track_events` tablosuna `/api/track` üzerinden yazılır (`public/demleme/track.js`). Google Analytics 4 ve Meta Pixel kodları İçerik → Takip kodları’ndan girilir.
- Veritabanı: `supabase/migrations/0003_icerik_takip.sql`.
