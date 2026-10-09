# iyzico — Teknik Entegrasyon Planı (Demleme)

Seçilen yöntem: **iyzico Ödeme Formu (Checkout Form, CF)**. Kart bilgisi hiçbir aşamada bizim sunucumuza/veritabanımıza gelmez (PCI yükü iyzico'da). Kaynak: [CF başlatma](https://docs.iyzico.com/odeme-metotlari/odeme-formu/cf-entegrasyonu/cf-baslatma), [CF sorgulama](https://docs.iyzico.com/odeme-metotlari/odeme-formu/cf-entegrasyonu/cf-sorgulama.md), [webhook](https://docs.iyzico.com/ek-servisler/webhook.md), [kimlik doğrulama](https://docs.iyzico.com/on-hazirliklar/kimlik-dogrulama/hmacsha256-kimlik-dogrulama.md), [iptal/iade](https://docs.iyzico.com/ek-servisler/iptal-ve-iade.md), [sandbox](https://docs.iyzico.com/on-hazirliklar/sandbox.md).

## 1. Akış

```
Müşteri /odeme → "Kartla öde" seç
  1) create_order(p_payment='kart')      → sipariş "odeme_bekleniyor", stok ayrılır (mevcut RPC)
  2) POST /api/odeme/iyzico/baslat       → iyzico CF initialize (conversationId = order_no)
  3) Müşteri paymentPageUrl'e yönlenir (ya da form sayfada açılır), 3D Secure iyzico'da
  4) iyzico → POST /api/odeme/iyzico/sonuc  (form-data: token)  [callbackUrl]
  5) Sunucu CF retrieve yapar → tutar/durum doğrular → sipariş "hazirlaniyor"
  6) 303 → /siparis-tamamlandi?no=DM-xxxx   (başarısızsa /odeme?hata=…)
  7) Webhook (yedek): iyzico 10–15 sn sonra bildirir; 2xx dönmezse 15 dk arayla 3 kez dener
```

## 2. Ortam değişkenleri (yalnızca Vercel, repoya YAZILMAZ)

| Değişken | Not |
|---|---|
| `IYZICO_API_KEY`, `IYZICO_SECRET_KEY` | Sandbox: `sandbox-…`; canlı: panelden |
| `IYZICO_BASE_URL` | Sandbox `https://sandbox-api.iyzipay.com` · Canlı `https://api.iyzipay.com` |
| `SUPABASE_SERVICE_ROLE_KEY` | Sunucu rotalarında siparişi "ödendi" yapmak için. **İstemciye asla** (`NEXT_PUBLIC_` kullanma) |
| `NEXT_PUBLIC_SITE_URL` | callbackUrl bu adresten üretilir (HTTPS zorunlu) |

Sandbox anahtarı: [sandbox-merchant.iyzipay.com](https://sandbox-merchant.iyzipay.com/auth/register) → Ayarlar → Firma Ayarları → API anahtarları. Sandbox SMS şifresi `123456`.

## 3. Kimlik doğrulama (her istek)

```
randomKey = Date.now() + rastgele
payload   = randomKey + uriPath + requestBody          (örn. uriPath: /payment/iyzipos/checkoutform/initialize/auth/ecom)
signature = HMAC_SHA256(payload, SECRET_KEY)  → hex
auth      = base64("apiKey:" + API_KEY + "&randomKey:" + randomKey + "&signature:" + signature)
Headers   : Authorization: IYZWSv2 <auth>,  x-iyzi-rnd: <randomKey>,  Content-Type: application/json
```
Resmî `iyzipay` npm paketi bunu kendisi yapar; bağımlılık istemezsek 30 satırlık `fetch` + `crypto` yeterli (tercih: **paketsiz**, daha az bağımlılık).

## 4. CF başlatma isteği (`/api/odeme/iyzico/baslat`)

Zorunlu alanlar: `price`, `paidPrice`, `currency: 'TRY'`, `callbackUrl`, `buyer{id,name,surname,identityNumber,email,gsmNumber,registrationAddress,city,country}`, `shippingAddress{address,contactName,city,country}`, `billingAddress{…}`, `basketItems[{id,price,name,category1,itemType:'PHYSICAL'}]`. Önerilen: `conversationId = order_no`, `basketId = order_no`, `paymentGroup: 'PRODUCT'`, `locale: 'tr'`, `enabledInstallments: [1]` (tek çekim) veya `[1,2,3,6]`.

Kurallar ve tuzaklar:
- **Fiyat kaynağı veritabanıdır**: tutarlar tarayıcıdan değil `orders` satırından okunur. İstemci tutar gönderemez.
- `basketItems` fiyat toplamı = `price` olmalı. Kargo ücretini ayrı bir kalem ("Kargo") olarak ekle; indirim varsa kalemlere oranla dağıt.
- `identityNumber` zorunlu alan; TCKN toplamıyoruz. iyzico'nun kabul ettiği yer tutucu kullanılır (**yer tutucunun kabulü iş yeri onayında doğrulanmalı**). KVKK metnine "kimlik numarası saklanmaz" eklenir.
- `buyer.ip`: `x-forwarded-for` ilk değeri.
- Yanıt: `token`, `checkoutFormContent` (Base64 HTML), `paymentPageUrl`, `status`. `status !== 'success'` ise hata mesajı kullanıcıya genel dille gösterilir, ayrıntı sunucu loguna.
- Token'ı `payments` tablosuna yaz (sipariş ↔ token eşleşmesi, tekrar oynatmaya karşı).

## 5. Sonuç / callback (`/api/odeme/iyzico/sonuc`)

1. `token` form alanını al; `payments`'ta bu token'ın var olduğunu ve henüz `paid` olmadığını doğrula.
2. CF retrieve: `POST /payment/iyzipos/checkoutform/auth/ecom/detail {token, conversationId}`.
3. **Başarı koşulu** (üçü birlikte): `status === 'success'` **ve** `paymentStatus === 'SUCCESS'` **ve** `fraudStatus === 1`.
   - `fraudStatus 0` (inceleme): sipariş `odeme_bekleniyor` kalır, müşteriye "ödemen doğrulanıyor" gösterilir, kararı webhook getirir. **Kargoya yalnız 1'de ver.**
   - `-1`: reddedildi.
4. `paidPrice` ile `orders.total` birebir aynı mı kontrol et (kuruş hassasiyetinde). Farklıysa onaylama, manuel inceleme işareti koy.
5. `mark_order_paid` RPC'si (aşağıda) ile siparişi `hazirlaniyor` yap, `payment_id`'yi kaydet.
6. Başarısız ödeme: sipariş `odeme_bekleniyor` kalır, müşteri aynı siparişi tekrar ödeyebilir (yeni token). Süresi dolan siparişler 6. bölümdeki işle iptal edilir.
7. Tüm adımlar **idempotent**: aynı callback iki kez gelse tek ödeme işlenir.

## 6. Veritabanı değişiklikleri (migration 0004 taslağı)

```sql
-- ödeme kayıtları (yalnızca service_role yazar; admin okur)
create table public.payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id),
  provider text not null default 'iyzico',
  token text unique,
  payment_id text,
  status text not null default 'init' check (status in ('init','paid','failed','review','refunded','cancelled')),
  fraud_status int,
  paid_price numeric(10,2),
  raw jsonb,                       -- kart verisi içermez; iyzico yanıtının güvenli alt kümesi
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.payments enable row level security;
create policy payments_admin_read on public.payments for select to authenticated using (public.is_admin());
revoke all on public.payments from anon, authenticated; grant select on public.payments to authenticated;

-- ödendi işareti: yalnız service_role çağırır
create or replace function public.mark_order_paid(p_order_no text, p_payment_id text, p_paid numeric)
returns void language plpgsql security definer set search_path = public as $$
declare o public.orders;
begin
  select * into o from public.orders where order_no = p_order_no for update;
  if o.id is null or o.status <> 'odeme_bekleniyor' then return; end if;     -- idempotent
  if abs(o.total - p_paid) > 0.001 then raise exception 'tutar uyusmuyor' using errcode = '22023'; end if;
  update public.orders set status = 'hazirlaniyor', paid_at = now() where id = o.id;
end $$;
revoke all on function public.mark_order_paid(text, text, numeric) from public, anon, authenticated;
grant execute on function public.mark_order_paid(text, text, numeric) to service_role;
```
- `create_order` ödeme türü olarak `kart`'ı da kabul edecek (şu an `havale`/`kapida`); kapıda ödeme akışı değişmez.
- **Terk edilen kart siparişleri:** 30 dk içinde ödenmeyen `kart` siparişlerini iptal edip stoğu geri veren bir zamanlanmış iş (n8n veya Supabase cron) — mevcut "iptal → stok iade" tetikleyicisi bunu karşılar.

## 7. Webhook (`/api/odeme/iyzico/webhook`)

- İmza: `X-IYZ-SIGNATURE-V3`. HPP/CF biçimi için doğrulama dizgisi: `secretKey + iyziEventType + iyziPaymentId + token + paymentConversationId + status` → HMAC-SHA256 (hex) → başlıkla **sabit zamanlı** karşılaştır. (Eski V1/V2 imzaları desteklenmiyor.)
- İmza geçerliyse yine de durumu **retrieve ile teyit et**, sonra callback'teki işlemin aynısını (idempotent) uygula. Hep `200` dön; 2xx dönmezsen iyzico 15 dk arayla 3 kez yeniden dener.
- iyzico panelinde webhook adresi: `https://<alan-adı>/api/odeme/iyzico/webhook`.

## 8. İptal / iade

- **Aynı gün iptal** (`/payment/cancel`, yalnız tam tutar, ekstrede iz bırakmaz) · **iade** 365 güne kadar, kısmi olabilir (`/v2/payment/refund` → `paymentId` + `price`).
- Admin panelinde sipariş detayına "Kartı iade et" düğmesi: sunucu rotası çağırır → `payments.status='refunded'`, sipariş `iptal` (stok iade). Tam tutar/kısmi seçimi, neden alanı, çift tıklama koruması.

## 9. Arayüz değişiklikleri

- `/odeme`: ödeme yöntemlerine "Kredi / banka kartı" (3D Secure, iyzico logosu + taksit notu). Kart seçilince buton "Ödemeye geç".
- `/siparis-tamamlandi`: şimdi `sessionStorage`'a bakıyor; kart dönüşünde `?no=` ile siparişi sunucudan okuyup gösterecek (e-posta eşleşmesi olmadan yalnız durum/numara).
- Hata dönüşleri: `?hata=odeme_reddedildi | dogrulanamadi | tutar` için kullanıcı dostu mesajlar.
- Sipariş durumları (`odeme_bekleniyor → hazirlaniyor → kargoda → teslim_edildi`) aynen kalır; kart için "Ödeme alındı" `paid_at` ile gösterilir.
- Takip raporu: `track_event('order')` zaten sipariş numarasıyla çalışıyor; kart siparişinde **ödeme onayından sonra** tetiklenmeli (yalnız `hazirlaniyor`).

## 10. Güvenlik listesi

- [ ] Gizli anahtarlar yalnızca Vercel env; repoda/loglarda/istemcide yok
- [ ] Tutar yalnızca DB'den; callback'te `paidPrice` doğrulaması
- [ ] Token tek kullanımlık; idempotent işleme
- [ ] Webhook imzası sabit zamanlı karşılaştırma
- [ ] Rate limit: `baslat` rotası IP/oturum başına dakikada sınırlı
- [ ] Hata yanıtlarında iyzico ham hatası kullanıcıya gösterilmez
- [ ] `raw` alanında kart/kişisel veri saklanmaz
- [ ] Sandbox → canlı geçişinde anahtar + `IYZICO_BASE_URL` birlikte değişir

## 11. Test planı (sandbox)

Test kartları: [iyzico test kartları](https://docs.iyzico.com/ek-bilgiler/test-kartlari.md) (başarılı, yetersiz bakiye, 3D başarısız vb.).

| Senaryo | Beklenen |
|---|---|
| Başarılı kart + 3D | sipariş `hazirlaniyor`, `payments=paid`, stok düşük kalır |
| Reddedilen / yetersiz bakiye | sipariş `odeme_bekleniyor`, tekrar denenebilir |
| 3D yarıda bırakıldı | callback yok → 30 dk sonra otomatik iptal + stok iade |
| Aynı callback iki kez | tek ödeme, tek durum değişimi |
| Tutarı oynanmış istek | reddedilir, sipariş değişmez |
| Webhook geç gelirse | durum zaten `paid` → değişiklik yok |
| `fraudStatus=0` | `odeme_bekleniyor` + panelde uyarı |
| Tam iade / kısmi iade | `refunded`, stok/durum kuralları |
| Canlı: 1 TL'lik gerçek ödeme + iade | uçtan uca doğrulama |

## 12. İş paketleri ve süre tahmini

| # | İş | Not |
|---|---|---|
| 1 | Migration 0004 + `create_order` kart desteği | küçük |
| 2 | `lib/iyzico.ts` (imza, initialize, retrieve, refund) | paketsiz |
| 3 | `baslat`, `sonuc`, `webhook` rotaları | çekirdek |
| 4 | `/odeme` kart seçeneği + sonuç sayfaları | arayüz |
| 5 | Admin: ödeme durumu, kartı iade et, `fraud=0` uyarısı | panel |
| 6 | Terk edilmiş sipariş iptal işi | n8n/cron |
| 7 | Sandbox testleri + canlıya geçiş | 02 listesi |

**Başlamak için gereken:** iyzico sandbox `API KEY` + `SECRET KEY` (sohbete **yapıştırma**; Vercel'e kendin gir, ben env adlarını kullanırım) ve taksit kararı.
