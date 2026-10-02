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
- Ödeme: havale/EFT ve kapıda ödeme aktif; kart ödemesi için sanal pos (iyzico/PayTR) bilgileri gerekir.
