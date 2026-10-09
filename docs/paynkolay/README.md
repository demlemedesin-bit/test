# Paynkolay kart ödemesi

Kart ödemesi Paynkolay **Ortak Ödeme Sayfası** ile alınır. Müşteri kartını Paynkolay'ın barındırdığı sayfada girer; kart bilgisi sunucumuza hiç ulaşmaz.

## Akış
1. `/odeme` → sipariş oluşur → `POST /api/odeme/paynkolay/baslat` imzalı form alanlarını döner, tarayıcı bunları Paynkolay'a POST eder.
2. Müşteri 3D Secure ile öder (tek çekim).
3. Paynkolay sonucu `POST /api/odeme/paynkolay/sonuc` adresine gönderir. İmza (`hashDataV2`) doğrulanır, `RESPONSE_CODE = 2` ve geçerli `AUTH_CODE` aranır; sipariş `mark_order_paid` ile "Hazırlanıyor" olur.
4. Paynkolay webhook göndermez. Müşteri sonuç sayfasına dönmezse ödeme, sipariş sayfasından (`/api/odeme/paynkolay/kontrol`) ve günlük `kart-temizle` cron'unda `PaymentList` ile teyit edilir.
5. Yönetici iadesi: Siparişler → sipariş → "İade et / iptal et" (`/api/odeme/paynkolay/iade`). Aynı gün `cancel`, sonrası `refund`.

## Ortam değişkenleri (Vercel → Settings → Environment Variables)
| Ad | Değer |
|---|---|
| `PAYNKOLAY_SX` | Satış sx |
| `PAYNKOLAY_SX_LIST` | Listeleme (sx list) — bekleyen ödemelerin teyidi için |
| `PAYNKOLAY_SX_IPTAL` | İptal-iade (sx iptal) — panelden iade için |
| `PAYNKOLAY_SECRET` | Merchant Secret Key |
| `PAYNKOLAY_BASE_URL` | Test: `https://paynkolaytest.nkolayislem.com.tr/Vpos` · Canlı: `https://paynkolay.nkolayislem.com.tr/Vpos` |

Ayrıca `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SITE_URL` (https) ve `CRON_SECRET` tanımlı olmalıdır. Değişkenleri ekledikten sonra yeniden dağıtım yapın.

## Notlar
- Taksit kapalıdır (`instalments=1`); tahsil edilen tutar sipariş toplamına eşit olmak zorundadır.
- Paynkolay sunucu IP'lerini kısıtlayabilir. İptal/iade/sorgu çağrıları zaman aşımına uğrarsa Paynkolay destek ekibinden Vercel çıkış IP'lerinin engellenmediğini teyit edin.
- Test kartları: https://paynkolay.com.tr/entegrasyon/07-test-cards.php
