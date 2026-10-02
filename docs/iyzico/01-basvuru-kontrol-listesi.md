# iyzico — Başvuru ve Onay Kontrol Listesi (Demleme)

Amaç: iyzico üye iş yeri başvurusunun **ilk seferde onaylanması** ve kart ödemesinin canlıya alınması.
Kaynaklar: [iyzico başvuru rehberi](https://www.iyzico.com/blog/sanal-pos-basvurusu-nereden-yapilir-nasil-alinir), [iyzico dokümantasyon](https://docs.iyzico.com). Belge listesi iyzico tarafından güncellenebilir; başvuru ekranındaki liste esastır.

## 1. Başvuru için hazır olması gerekenler

| Konu | Şahıs şirketi | Limited / Anonim |
|---|---|---|
| Vergi levhası | ✔ | ✔ |
| Kimlik fotokopisi (yetkili) | ✔ | ✔ |
| İmza sirküleri | ✔ | ✔ |
| Ticaret sicil gazetesi | – | ✔ |
| Şirket / işletme IBAN'ı (TL) | ✔ (işletme adına) | ✔ (şirket adına) |
| Çalışan web sitesi | ✔ | ✔ |

> Sorulacak: Demleme hangi tüzel kişilik adına satış yapacak? (Daydream mı, ayrı şirket mi, şahıs mı?) Satıcı unvanı, vergi no, adres ve IBAN **Admin → Ayarlar**'a aynen bu bilgilerle girilmeli; yasal sayfalar bu alanlardan dolar.

## 2. Sitede olması gerekenler (iyzico site incelemesi)

Durum, Demleme'nin bugünkü hâli:

| Gereksinim | Durum |
|---|---|
| HTTPS / geçerli SSL (callback adresi için zorunlu) | ✔ Vercel + özel alan adı bağlanınca |
| Mesafeli satış sözleşmesi | ✔ şablon var (`/mesafeli-satis-sozlesmesi`) — avukat onayı + satıcı bilgileri gerekli |
| Kargo, teslimat ve iade koşulları | ✔ `/kargo-ve-iade` |
| KVKK aydınlatma, gizlilik politikası, kullanım şartları | ✔ şablon |
| İletişim bilgisi (e-posta, telefon, adres) | ⚠ Ayarlar'dan doldurulmalı; adres/telefon boşsa sayfalarda görünmez |
| Fiyatlar TL ve KDV dahil, net gösterim | ✔ ürün fiyatları KDV dahil olmalı (panelde öyle gir) |
| Ürün sayfasında ad, görsel, açıklama, stok durumu | ✔ |
| Sepet ve ödeme adımında toplam + kargo ayrımı | ✔ |
| Sipariş sonrası takip | ✔ `/siparis-takip` |
| Cayma hakkı ve iade istisnaları açık yazılı | ⚠ metin avukatla netleşmeli |
| Sitede iyzico / kart logoları (ödeme adımında) | ⏳ entegrasyonla birlikte eklenecek |
| Test için canlı site veya demo kullanıcı | ⏳ başvuruda istenirse test siparişi verilebilir |

## 3. Başvuru adımları

1. iyzico'da üye iş yeri başvurusunu yap (şirket türüne göre belgeleri yükle).
2. İş yeri sözleşmesini ve (gerekirse) sanal POS kullanım sözleşmesini imzala.
3. Site incelemesi: yukarıdaki sayfalar gözden geçirilir.
4. Onay sonrası **canlı** `API KEY` ve `SECRET KEY` panelden alınır.
5. Canlı anahtarları yalnızca **Vercel → Environment Variables**'a gir (bkz. 02-teknik-entegrasyon-plani).
6. Canlıda 1 gerçek, düşük tutarlı test ödemesi + iade ile bitir.

Süre: iyzico kendi anlatımında hesabın birkaç iş gününde açıldığını belirtiyor; incelemeyi bekletecek en sık sebep eksik yasal sayfa veya eksik iletişim bilgisidir.

## 4. Komisyon ve vade (karar gerekli)

- Komisyon oranı, taksit seçenekleri ve hesaba geçiş (vade) süresi iş yeri sözleşmesinde teklif edilir; **başvuru sırasında pazarlık edilebilir**. Tahminle yazılmadı.
- Taksit sunulacak mı? (Merch için tek çekim yeterli olabilir; taksit komisyonu artırır.)
- Fiyatlara komisyon yansıtılmayacak (yasal olarak kart/nakit farkı uygulanamaz).

## 5. Kullanıcıdan istenecek / karar bekleyen

- [ ] Satıcı tüzel kişilik ve belgeler
- [ ] Şirket IBAN'ı
- [ ] Telefon ve adres (yasal sayfalar + iyzico incelemesi)
- [ ] Taksit: evet/hayır
- [ ] Kargo firması ve iade adresi
- [ ] Avukat onayı (sözleşme / iade / KVKK)
