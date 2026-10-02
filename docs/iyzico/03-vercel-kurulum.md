# iyzico — Vercel kurulum (kod hazır)

Kart ödemesi kodu yazıldı ve test edildi (sahte iyzico sunucusuyla). Canlıya almak için **yalnızca** Vercel ortam değişkenlerini girmen yeterli.

## 1. Vercel → Project → Settings → Environment Variables

| Ad | Değer |
|---|---|
| `IYZICO_API_KEY` | iyzico panelindeki API anahtarı (önce **sandbox** anahtarıyla dene) |
| `IYZICO_SECRET_KEY` | iyzico gizli anahtar |
| `IYZICO_BASE_URL` | Sandbox: `https://sandbox-api.iyzipay.com` · Canlı: `https://api.iyzipay.com` |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → API → `service_role` (**gizli**, `NEXT_PUBLIC_` ile BAŞLAMAZ) |
| `NEXT_PUBLIC_SITE_URL` | `https://alanadin.com` (HTTPS zorunlu; callback bu adresten üretilir) |
| `CRON_SECRET` | Rastgele uzun bir metin (ödenmemiş kart siparişlerini temizleyen günlük iş için) |

Değişkenleri girdikten sonra **yeniden deploy** et. `/odeme` sayfasında "Kredi / banka kartı" seçeneği otomatik açılır (anahtar yoksa "Çok yakında" görünür). Durumu Yönetim → Entegrasyonlar → Ödeme sekmesinden görebilirsin.

## 2. iyzico panelinde

- Webhook adresi: `https://alanadin.com/api/odeme/iyzico/webhook`
- Sandbox test kartları: iyzico dokümanındaki test kart listesi (SMS şifresi `123456`).

## 3. Akış (özet)

1. `create_order('kart')` → sipariş "ödeme bekleniyor", stok ayrılır
2. `/api/odeme/iyzico/baslat` → iyzico ödeme sayfası (tutar veritabanından okunur)
3. iyzico → `/api/odeme/iyzico/sonuc` → iyzico'dan teyit (`SUCCESS` + `fraudStatus 1` + tutar eşleşmesi) → sipariş "hazırlanıyor"
4. Webhook yedek onay; aynı işlem iki kez gelse tek ödeme işlenir
5. Yönetim → Siparişler → kart siparişinde "İade et / iptal et" (aynı gün iptal, sonrası iade)
6. 2 saatten eski ödenmemiş kart siparişleri günlük iş ile iptal edilir, stok geri döner

## 4. Dikkat

- Canlıya geçmeden sandbox'ta tam bir ödeme + iade dene.
- `identityNumber` için yer tutucu gönderiliyor; iş yeri onayında iyzico'nun kabul ettiğini doğrula (`01-basvuru-kontrol-listesi.md`).
- Webhook imza biçimi (V3) sandbox'ta teyit edilmeli.
