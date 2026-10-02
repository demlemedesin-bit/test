# Ticimax / T-Soft karşılaştırması ve yol haritası

| Alan | Durum | Not |
|---|---|---|
| Ürün, varyant (renk/beden), stok | Var | Ürünler paneli |
| Kupon, kampanya, ücretsiz kargo | Var | Kampanya ve indirim |
| Kart ödemesi (iyzico), havale, kapıda | Var | Webhook + iade |
| Terk edilen sepet + hatırlatma e-postası | Var | Cron 07:15 |
| Yorum / puan (onaylı) | Var | Ürün yorumları |
| Bunu da beğenebilirsin, sepet çapraz satış, son baktıkların | Var | Vitrin modülleri |
| Favoriler, stok gelince haber ver, bülten | Var | Bülten ve stok haberi |
| Popup (bülten, çıkış niyeti, geri sayım, duyuru) | Var | Popuplar |
| SEO: sitemap, robots, meta şablonları, JSON-LD, 404 izleme | Var | SEO ve reklam |
| GTM/GA4/Ads/Meta/TikTok/Clarity + çerez onayı | Var | SEO ve reklam |
| Görsel otomatik sıkıştırma, WebP, medya kütüphanesi | Var | Medya |
| Google/Meta ürün feed'i, pazaryeri CSV | Var | /feed/* |
| UTM / kısa link takibi, raporlar | Var | Takip, Raporlar |
| Roller ve yetkiler, denetim kaydı | Var | Kullanıcılar ve kayıtlar |
| Süreli kampanya fiyatı (üstü çizili, geri sayım), düşük stok uyarısı | Var | Süreli kampanya |
| Depo, muhasebe, müşteri hizmetleri, iade, analiz, ürün kalitesi, veri kontrolü, banner/betik yönetimi | Var | Yönetim menüsü |
| Paket / set ürün (bundle) | Eksik | Sepet çapraz satışla kısmen karşılanıyor |
| Hediye kartı, sadakat puanı | Eksik | |
| Trendyol/Hepsiburada/N11 API entegrasyonu | Eksik | Şimdilik feed CSV |
| e-Fatura / e-Arşiv (Paraşüt, Logo vb.) | Eksik | Fatura çıktısı var, entegrasyon yok |
| Kargo API (etiket, otomatik takip) | Eksik | Elle takip no |
| Çoklu dil / para birimi | Eksik | |
| Canlı destek, WhatsApp butonu | Eksik | Kolay: script alanı Reklam ayarlarında |

Öncelik: indirimli fiyat + rozet, e-Arşiv entegrasyonu, kargo API, Trendyol senkronu.
