-- 0002: yönetim paneli, ürünlerin/ayarların veritabanından yönetimi, stok, kargo takibi.
-- Geriye uyumludur: 0001'e göre çalışan site kodu bu şemayla da çalışmaya devam eder.

-- ── Roller ─────────────────────────────────────────────────────────────
alter table public.profiles add column role text not null default 'customer' check (role in ('customer', 'admin'));
-- Kullanıcı kendi rolünü değiştiremesin: yalnızca ad ve telefon güncellenebilir.
revoke update on public.profiles from authenticated, anon;
grant update (full_name, phone) on public.profiles to authenticated;

create function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;
revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

-- ── Ayarlar: sayı yerine metin, herkese açık olan/olmayan ayrımı ─────────
alter table public.shop_settings alter column value type text using value::text;
alter table public.shop_settings add column is_public boolean not null default true;
alter table public.shop_settings add column updated_at timestamptz not null default now();
insert into public.shop_settings (key, value, is_public) values
  ('contact_email', 'merhaba@demleme.com', true),
  ('seller_name', 'Demleme', true), ('seller_address', '', true), ('seller_tax_office', '', true),
  ('seller_tax_no', '', true), ('seller_mersis', '', true), ('seller_phone', '', true),
  ('bank_holder', '', true), ('bank_name', '', true), ('bank_iban', '', true),
  ('admin_emails', 'milgosutyonetim@gmail.com', false)
on conflict (key) do nothing;
drop policy "ayarlar herkese açık" on public.shop_settings;
create policy "açık ayarlar herkese açık" on public.shop_settings for select using (is_public);
create policy "yönetici ayarları görür" on public.shop_settings for select to authenticated using (public.is_admin());
create policy "yönetici ayar ekler" on public.shop_settings for insert to authenticated with check (public.is_admin() and key <> 'admin_emails');
create policy "yönetici ayar günceller" on public.shop_settings for update to authenticated using (public.is_admin() and key <> 'admin_emails') with check (public.is_admin() and key <> 'admin_emails');

-- ── Ürünler: site içeriği, stok, sıra ────────────────────────────────────
alter table public.products add column data jsonb not null default '{}'::jsonb;  -- açıklama, rozet, ölçü tablosu, detaylar
alter table public.products add column shop_cat text not null default 'sofra' check (shop_cat in ('sofra', 'giyim', 'aksesuar'));
alter table public.products add column thumb text;                                 -- ana sayfa kart görseli
alter table public.products add column stock integer check (stock is null or stock >= 0);  -- null = sınırsız
alter table public.products add column sort integer not null default 0;
alter table public.products add column updated_at timestamptz not null default now();

create function public.touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end $$;
create trigger products_touch before update on public.products for each row execute function public.touch_updated_at();
create trigger settings_touch before update on public.shop_settings for each row execute function public.touch_updated_at();

drop policy "aktif ürünler herkese açık" on public.products;
create policy "aktif ürünler herkese açık" on public.products for select using (active);
create policy "yönetici ürünleri görür" on public.products for select to authenticated using (public.is_admin());
create policy "yönetici ürün ekler" on public.products for insert to authenticated with check (public.is_admin());
create policy "yönetici ürün günceller" on public.products for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "yönetici ürün siler" on public.products for delete to authenticated using (public.is_admin());

update public.products set colors='[{"key": "tek", "name": "Şeffaf / bambu", "hex": "#E7E2D6", "img": "/demleme/06-urun/images/kavanoz-uzun.webp"}]'::jsonb, data='{"desc": "Şekerin, çayın, kurabiyenin yeri. Bambu kapaklı, üstünde çayını yudumlayan Demleme adamı.", "details": [["Ölçüler", "Ø 11 cm × 18 cm · 1,2 litre"], ["Malzeme", "Borosilikat cam, bambu kapak, silikon conta. Baskı gıdaya uygun seramik boya."], ["Bakım", "Cam bulaşık makinesinde yıkanabilir; bambu kapağı elde yıkayın."], ["Kargo & iade", "Siparişin 2–4 iş gününde kargoda. Türkiye içi 750 ₺ üzeri kargo bedava. 14 gün içinde koşulsuz iade."]], "sizes": {"label": "Boyut", "items": [["Uzun", "cam-kavanoz-uzun"], ["Basık", "cam-kavanoz-basik"]]}}'::jsonb, shop_cat='sofra', thumb='/demleme/03-shop/products/p01-cam-kavanoz-uzun-720.webp', sort=0, stock=null where slug='cam-kavanoz-uzun';
update public.products set colors='[{"key": "tek", "name": "Şeffaf / bambu", "hex": "#E7E2D6", "img": "/demleme/06-urun/images/kavanoz-basik.webp"}]'::jsonb, data='{"desc": "Kuru çay, kahve, lokum… Tezgâhta durduğu yerde güzel, bambu kapaklı, baskılı.", "details": [["Ölçüler", "Ø 11 cm × 12 cm · 0,8 litre"], ["Malzeme", "Borosilikat cam, bambu kapak, silikon conta. Baskı gıdaya uygun seramik boya."], ["Bakım", "Cam bulaşık makinesinde yıkanabilir; bambu kapağı elde yıkayın."], ["Kargo & iade", "Siparişin 2–4 iş gününde kargoda. Türkiye içi 750 ₺ üzeri kargo bedava. 14 gün içinde koşulsuz iade."]], "sizes": {"label": "Boyut", "items": [["Uzun", "cam-kavanoz-uzun"], ["Basık", "cam-kavanoz-basik"]]}}'::jsonb, shop_cat='sofra', thumb='/demleme/03-shop/products/p02-cam-kavanoz-basik-720.webp', sort=10, stock=null where slug='cam-kavanoz-basik';
update public.products set colors='[{"key": "kirmizi", "name": "Kırmızı", "hex": "#9E1F24", "img": "/demleme/06-urun/images/sehpa-kirmizi.webp"}, {"key": "antrasit", "name": "Antrasit", "hex": "#4E4A46", "img": "/demleme/06-urun/images/sehpa-antrasit.webp"}, {"key": "adacayi", "name": "Adaçayı", "hex": "#A0B096", "img": "/demleme/06-urun/images/sehpa-adacayi.webp"}, {"key": "hardal", "name": "Hardal", "hex": "#A8803A", "img": "/demleme/06-urun/images/sehpa-hardal.webp"}]'::jsonb, data='{"desc": "İstanbul''daki atölyemizde, üç kuşaktır metal işleyen ailemin elinden. Üstteki tepsi çıkıyor: çayı getirir, götürürsün. Altı saklama alanı.", "badge": "Atölyede üretilir", "details": [["Ölçüler", "Yükseklik 52 cm · tepsi Ø 45 cm · saklama gövdesi Ø 34 × 26 cm · 4,8 kg"], ["Malzeme", "Elektrostatik toz boyalı çelik gövde, krem emaye çıkarılabilir tepsi."], ["Bakım", "Nemli bezle silin, aşındırıcı temizleyici kullanmayın."], ["Üretim", "Her sehpa siparişle üretilir: 7–10 iş gününde kargoda."], ["Kargo & iade", "Siparişin 2–4 iş gününde kargoda. Türkiye içi 750 ₺ üzeri kargo bedava. 14 gün içinde koşulsuz iade."]]}'::jsonb, shop_cat='sofra', thumb='/demleme/03-shop/products/p03-demleme-sehpasi-720.webp', sort=20, stock=null where slug='demleme-sehpasi';
update public.products set colors='[{"key": "krem", "name": "Krem", "hex": "#EDE6D6", "img": "/demleme/06-urun/images/saklama-krem.webp"}, {"key": "adacayi", "name": "Adaçayı", "hex": "#A0B096", "img": "/demleme/06-urun/images/saklama-adacayi.webp"}, {"key": "hardal", "name": "Hardal", "hex": "#C9A04A", "img": "/demleme/06-urun/images/saklama-hardal.webp"}, {"key": "kiremit", "name": "Kiremit", "hex": "#C45C3E", "img": "/demleme/06-urun/images/saklama-kiremit.webp"}]'::jsonb, data='{"desc": "Üç katlı sefer tası: öğle yemeği, piknik, komşuya giden dolma. Kilitli, sapından taşınır.", "details": [["Ölçüler", "3 kat · Ø 16 cm × 30 cm · her kat 1,1 litre"], ["Malzeme", "Emaye çelik kaplar, paslanmaz çelik kilit ve sap."], ["Bakım", "Elde yıkayın; ocakta ya da mikrodalgada ısıtmayın."], ["Kargo & iade", "Siparişin 2–4 iş gününde kargoda. Türkiye içi 750 ₺ üzeri kargo bedava. 14 gün içinde koşulsuz iade."]]}'::jsonb, shop_cat='sofra', thumb='/demleme/03-shop/products/p04-katli-saklama-kabi-720.webp', sort=30, stock=null where slug='katli-saklama-kabi';
update public.products set colors='[{"key": "tek", "name": "Krem / siyah kenar", "hex": "#EDE6D6", "img": "/demleme/06-urun/images/tepsi-buyuk.webp"}]'::jsonb, data='{"desc": "Kalabalık sofraların tepsisi. Kenarı siyah, ortası Demleme''nin masası.", "details": [["Ölçüler", "Ø 40 cm · kenar yüksekliği 2 cm"], ["Malzeme", "Emaye çelik, elde boyanmış kenar."], ["Bakım", "Elde yıkayın, bulaşık makinesine koymayın."], ["Kargo & iade", "Siparişin 2–4 iş gününde kargoda. Türkiye içi 750 ₺ üzeri kargo bedava. 14 gün içinde koşulsuz iade."]], "sizes": {"label": "Boyut", "items": [["Büyük · Ø 40", "sofra-tepsisi-buyuk"], ["Küçük · Ø 28", "sofra-tepsisi-kucuk"]]}}'::jsonb, shop_cat='sofra', thumb='/demleme/03-shop/products/p05-sofra-tepsisi-buyuk-720.webp', sort=40, stock=null where slug='sofra-tepsisi-buyuk';
update public.products set colors='[{"key": "tek", "name": "Krem / siyah kenar", "hex": "#EDE6D6", "img": "/demleme/06-urun/images/tepsi-kucuk.webp"}]'::jsonb, data='{"desc": "İki kişilik çayın tepsisi. Bardaklar, şekerlik, bir tabak kurabiye.", "details": [["Ölçüler", "Ø 28 cm · kenar yüksekliği 1,8 cm"], ["Malzeme", "Emaye çelik, elde boyanmış kenar."], ["Bakım", "Elde yıkayın, bulaşık makinesine koymayın."], ["Kargo & iade", "Siparişin 2–4 iş gününde kargoda. Türkiye içi 750 ₺ üzeri kargo bedava. 14 gün içinde koşulsuz iade."]], "sizes": {"label": "Boyut", "items": [["Büyük · Ø 40", "sofra-tepsisi-buyuk"], ["Küçük · Ø 28", "sofra-tepsisi-kucuk"]]}}'::jsonb, shop_cat='sofra', thumb='/demleme/03-shop/products/p06-sofra-tepsisi-kucuk-720.webp', sort=50, stock=null where slug='sofra-tepsisi-kucuk';
update public.products set colors='[{"key": "krem", "name": "Krem", "hex": "#EDE6D6", "img": "/demleme/06-urun/images/tisort-krem.webp"}, {"key": "adacayi", "name": "Adaçayı", "hex": "#A0B096", "img": "/demleme/06-urun/images/tisort-adacayi.webp"}, {"key": "hardal", "name": "Hardal", "hex": "#C9A04A", "img": "/demleme/06-urun/images/tisort-hardal.webp"}, {"key": "kiremit", "name": "Kiremit", "hex": "#C45C3E", "img": "/demleme/06-urun/images/tisort-kiremit.webp"}]'::jsonb, data='{"desc": "Rahat kesim, kalın pamuk. Göğsünde çayını yudumlayan Demleme adamı.", "chart": {"head": ["Beden", "S", "M", "L", "XL", "XXL"], "rows": [["Göğüs genişliği", "50", "53", "56", "59", "62"], ["Boy", "69", "72", "74", "76", "78"], ["Omuz", "45", "47", "49", "51", "53"]], "note": "Ölçüler cm, düz zeminde yatırılmış ürün üzerinden. Model 1,80 m, L giyiyor."}, "details": [["Kalıp", "Rahat (relaxed) kesim; tam beden almanı öneririz."], ["Malzeme", "%100 organik pamuk, 200 g/m², ön baskı."], ["Bakım", "30 °C''de ters yıkayın, baskının üzerine ütü yapmayın."], ["Kargo & iade", "Siparişin 2–4 iş gününde kargoda. Türkiye içi 750 ₺ üzeri kargo bedava. 14 gün içinde koşulsuz iade."]], "size_label": "Beden"}'::jsonb, shop_cat='giyim', thumb='/demleme/03-shop/products/p07-demleme-tisort-720.webp', sort=60, stock=null where slug='demleme-tisort';
update public.products set colors='[{"key": "krem", "name": "Krem", "hex": "#EDE6D6", "img": "/demleme/06-urun/images/sapka-krem.webp"}, {"key": "adacayi", "name": "Adaçayı", "hex": "#A0B096", "img": "/demleme/06-urun/images/sapka-adacayi.webp"}, {"key": "hardal", "name": "Hardal", "hex": "#C9A04A", "img": "/demleme/06-urun/images/sapka-hardal.webp"}, {"key": "kiremit", "name": "Kiremit", "hex": "#C45C3E", "img": "/demleme/06-urun/images/sapka-kiremit.webp"}]'::jsonb, data='{"desc": "Yumuşak, yıkanmış pamuk şapka. Önünde nakış Demleme adamı.", "details": [["Beden", "Tek beden, arkadan metal tokayla ayarlanır (55–60 cm)."], ["Malzeme", "%100 pamuk twill, nakış."], ["Bakım", "Elde, soğuk suda yıkayın; kurutucuya koymayın."], ["Kargo & iade", "Siparişin 2–4 iş gününde kargoda. Türkiye içi 750 ₺ üzeri kargo bedava. 14 gün içinde koşulsuz iade."]], "sizes": {"label": "Beden", "items": [["Tek beden · 55–60 cm", ""]]}}'::jsonb, shop_cat='giyim', thumb='/demleme/03-shop/products/p08-demleme-sapka-720.webp', sort=70, stock=null where slug='demleme-sapka';
update public.products set colors='[{"key": "krem", "name": "Krem", "hex": "#EDE6D6", "img": "/demleme/06-urun/images/canta-krem.webp"}, {"key": "adacayi", "name": "Adaçayı", "hex": "#A0B096", "img": "/demleme/06-urun/images/canta-adacayi.webp"}, {"key": "kiremit", "name": "Kiremit", "hex": "#C45C3E", "img": "/demleme/06-urun/images/canta-kiremit.webp"}]'::jsonb, data='{"desc": "Pazara, kütüphaneye, sahile. Kalın kanvas, uzun sap, omuzda taşınır.", "details": [["Ölçüler", "38 × 42 cm · sap 65 cm · 10 kg''a kadar taşır"], ["Malzeme", "340 g/m² pamuk kanvas, ön baskı."], ["Bakım", "30 °C''de ters yıkayın."], ["Kargo & iade", "Siparişin 2–4 iş gününde kargoda. Türkiye içi 750 ₺ üzeri kargo bedava. 14 gün içinde koşulsuz iade."]]}'::jsonb, shop_cat='aksesuar', thumb='/demleme/03-shop/products/p09-demleme-bez-canta-720.webp', sort=80, stock=null where slug='demleme-bez-canta';
update public.products set colors='[{"key": "tek", "name": "Şeffaf / beyaz tabak", "hex": "#F4F1EA", "img": "/demleme/06-urun/images/bardak.webp"}]'::jsonb, data='{"desc": "İnce belli, tabaklı çay bardağı; üstünde Demleme adamı. Çok yakında sofralarda.", "badge": "Yakında", "details": [["Ölçüler", "100 ml · 7 × 9,5 cm · tabak Ø 11 cm"], ["Malzeme", "Temperli cam, porselen tabak."], ["Bakım", "Bulaşık makinesinde yıkanabilir."], ["Kargo & iade", "Siparişin 2–4 iş gününde kargoda. Türkiye içi 750 ₺ üzeri kargo bedava. 14 gün içinde koşulsuz iade."]]}'::jsonb, shop_cat='sofra', thumb='/demleme/03-shop/products/p10-demleme-cay-bardagi-720.webp', sort=90, stock=null where slug='demleme-cay-bardagi';

-- ── Siparişler: kargo takibi, yönetici notu, zaman damgaları ─────────────
alter table public.orders add column tracking_carrier text;
alter table public.orders add column tracking_no text;
alter table public.orders add column admin_note text;
alter table public.orders add column paid_at timestamptz;
alter table public.orders add column shipped_at timestamptz;
alter table public.orders add column updated_at timestamptz not null default now();

create policy "yönetici siparişleri görür" on public.orders for select to authenticated using (public.is_admin());
create policy "yönetici siparişi günceller" on public.orders for update to authenticated using (public.is_admin()) with check (public.is_admin());
-- Müşteri adı/e-posta/tutar gibi alanlar yönetici tarafından bile değiştirilemesin: yalnızca operasyon alanları.
revoke update on public.orders from authenticated, anon;
grant update (status, tracking_carrier, tracking_no, admin_note) on public.orders to authenticated;

create function public.orders_before_update() returns trigger language plpgsql as $$
begin
  if old.status = 'iptal' and new.status <> 'iptal' then
    raise exception 'İptal edilen sipariş yeniden açılamaz';
  end if;
  if new.status = 'kargoda' and old.status <> 'kargoda' then
    new.shipped_at := coalesce(new.shipped_at, now());
  end if;
  if old.status = 'odeme_bekleniyor' and new.status in ('hazirlaniyor', 'kargoda', 'teslim_edildi') then
    new.paid_at := coalesce(new.paid_at, now());
  end if;
  new.updated_at := now();
  return new;
end $$;
create trigger orders_before_update before update on public.orders for each row execute function public.orders_before_update();

-- İptalde stok iadesi
create function public.orders_after_update() returns trigger language plpgsql security definer set search_path = public as $$
declare it jsonb;
begin
  if old.status <> 'iptal' and new.status = 'iptal' then
    for it in select * from jsonb_array_elements(new.items) loop
      update public.products set stock = stock + (it ->> 'qty')::int where slug = it ->> 'slug' and stock is not null;
    end loop;
  end if;
  return new;
end $$;
revoke all on function public.orders_after_update() from public, anon, authenticated;
create trigger orders_after_update after update on public.orders for each row execute function public.orders_after_update();

-- ── Yeni üye: yönetici e-postasıysa rol admin ───────────────────────────
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare admins text;
begin
  select value into admins from public.shop_settings where key = 'admin_emails';
  insert into public.profiles (id, full_name, phone, role)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''), nullif(new.raw_user_meta_data ->> 'phone', ''),
          case when lower(coalesce(new.email, '')) = any (string_to_array(lower(replace(coalesce(admins, ''), ' ', '')), ',')) then 'admin' else 'customer' end);
  return new;
end $$;
revoke all on function public.handle_new_user() from public, anon, authenticated;

-- ── create_order: ayarlar metin oldu, stok kontrolü/düşümü ────────────────
create or replace function public.create_order(p_items jsonb, p_customer jsonb, p_payment text, p_note text default null)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  it jsonb; prod public.products%rowtype; col jsonb;
  qty int; ckey text; sz text; line_amt numeric(10,2);
  lines jsonb := '[]'::jsonb; sub numeric(10,2) := 0; ship numeric(10,2); tot numeric(10,2);
  free_from numeric(10,2); fee numeric(10,2);
  v_email text; v_name text; v_phone text; v_addr jsonb; v_no text; v_id uuid; v_status text;
begin
  if p_payment is null or p_payment not in ('havale', 'kapida') then
    raise exception 'Geçersiz ödeme yöntemi' using errcode = '22023';
  end if;

  v_email := lower(trim(coalesce(p_customer ->> 'email', '')));
  v_name  := trim(coalesce(p_customer ->> 'full_name', ''));
  v_phone := regexp_replace(coalesce(p_customer ->> 'phone', ''), '\D', '', 'g');
  v_addr  := jsonb_build_object(
    'title',    trim(coalesce(p_customer ->> 'title', '')),
    'city',     trim(coalesce(p_customer ->> 'city', '')),
    'district', trim(coalesce(p_customer ->> 'district', '')),
    'address',  trim(coalesce(p_customer ->> 'address', '')),
    'zip',      trim(coalesce(p_customer ->> 'zip', '')));

  if v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'Geçerli bir e-posta gir' using errcode = '22023'; end if;
  if char_length(v_name) < 3 then raise exception 'Ad soyad gerekli' using errcode = '22023'; end if;
  if char_length(v_phone) < 10 or char_length(v_phone) > 13 then raise exception 'Geçerli bir telefon numarası gir' using errcode = '22023'; end if;
  if v_addr ->> 'city' = '' or v_addr ->> 'district' = '' or char_length(v_addr ->> 'address') < 10 then
    raise exception 'Teslimat adresini eksiksiz gir' using errcode = '22023';
  end if;

  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 or jsonb_array_length(p_items) > 30 then
    raise exception 'Sepet boş' using errcode = '22023';
  end if;

  for it in select * from jsonb_array_elements(p_items) loop
    select * into prod from public.products where slug = it ->> 'slug' and active;
    if not found then raise exception 'Ürün bulunamadı' using errcode = '22023'; end if;
    if prod.soon then raise exception '% henüz satışta değil', prod.name using errcode = '22023'; end if;

    qty := (it ->> 'qty')::int;
    if qty is null or qty < 1 or qty > 9 then raise exception 'Adet 1 ile 9 arasında olmalı' using errcode = '22023'; end if;

    ckey := coalesce(nullif(it ->> 'color', ''), prod.colors -> 0 ->> 'key');
    select c into col from jsonb_array_elements(prod.colors) c where c ->> 'key' = ckey;
    if col is null then raise exception '% için geçersiz renk', prod.name using errcode = '22023'; end if;

    sz := nullif(it ->> 'size', '');
    if coalesce(array_length(prod.sizes, 1), 0) > 0 then
      if sz is null or not (sz = any (prod.sizes)) then
        raise exception '% için beden seçmelisin', prod.name using errcode = '22023';
      end if;
    else
      sz := null;
    end if;

    if prod.stock is not null then
      update public.products set stock = stock - qty where slug = prod.slug and stock >= qty;
      if not found then raise exception '% için yeterli stok yok', prod.name using errcode = '22023'; end if;
    end if;

    line_amt := prod.price * qty;
    sub := sub + line_amt;
    lines := lines || jsonb_build_array(jsonb_build_object(
      'slug', prod.slug, 'name', prod.name, 'color', col ->> 'key', 'color_name', col ->> 'name',
      'size', sz, 'qty', qty, 'unit_price', prod.price, 'line_total', line_amt));
  end loop;

  select coalesce(nullif(value, ''), '750')::numeric into free_from from public.shop_settings where key = 'free_shipping_threshold';
  select coalesce(nullif(value, ''), '0')::numeric into fee from public.shop_settings where key = 'shipping_fee';
  ship := case when sub >= coalesce(free_from, 750) then 0 else coalesce(fee, 0) end;
  tot := sub + ship;

  v_no := 'DM-' || nextval('public.order_seq');
  v_status := case p_payment when 'havale' then 'odeme_bekleniyor' else 'hazirlaniyor' end;

  insert into public.orders (order_no, user_id, email, full_name, phone, address, items, subtotal, shipping, total, payment_method, status, note)
  values (v_no, auth.uid(), v_email, v_name, v_phone, v_addr, lines, sub, ship, tot, p_payment, v_status, nullif(trim(coalesce(p_note, '')), ''))
  returning id into v_id;

  return jsonb_build_object('order_no', v_no, 'status', v_status, 'subtotal', sub, 'shipping', ship, 'total', tot,
                            'payment_method', p_payment, 'items', lines, 'email', v_email);
end $$;

-- ── get_order: kargo bilgisi de dönsün ──────────────────────────────────
create or replace function public.get_order(p_order_no text, p_email text) returns jsonb
language sql security definer set search_path = public as $$
  select jsonb_build_object('order_no', order_no, 'status', status, 'created_at', created_at, 'items', items,
                            'subtotal', subtotal, 'shipping', shipping, 'total', total, 'payment_method', payment_method,
                            'full_name', full_name, 'address', address,
                            'tracking_carrier', tracking_carrier, 'tracking_no', tracking_no)
  from public.orders
  where order_no = upper(trim(p_order_no)) and email = lower(trim(p_email))
  limit 1;
$$;

-- ── Yönetici RPC'leri ────────────────────────────────────────────────────
create function public.admin_customers() returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Yetkisiz' using errcode = '42501'; end if;
  return coalesce((
    with o as (
      select lower(email) as email,
             count(*) filter (where status <> 'iptal') as cnt,
             coalesce(sum(total) filter (where status <> 'iptal'), 0) as spent,
             max(created_at) as last_at,
             (array_agg(full_name order by created_at desc))[1] as name,
             (array_agg(phone order by created_at desc))[1] as phone
      from public.orders group by 1),
    u as (
      select lower(au.email) as email, au.id, au.created_at, p.full_name, p.phone, p.role
      from auth.users au join public.profiles p on p.id = au.id)
    select jsonb_agg(jsonb_build_object(
        'email', coalesce(u.email, o.email),
        'name', coalesce(nullif(u.full_name, ''), o.name, ''),
        'phone', coalesce(u.phone, o.phone),
        'registered', u.id is not null,
        'joined_at', u.created_at,
        'role', coalesce(u.role, 'guest'),
        'orders', coalesce(o.cnt, 0),
        'spent', coalesce(o.spent, 0),
        'last_order_at', o.last_at) order by o.last_at desc nulls last, u.created_at desc nulls last)
    from u full join o on o.email = u.email), '[]'::jsonb);
end $$;

create function public.admin_set_admin(p_email text, p_make boolean) returns void
language plpgsql security definer set search_path = public as $$
declare v_id uuid;
begin
  if not public.is_admin() then raise exception 'Yetkisiz' using errcode = '42501'; end if;
  select id into v_id from auth.users where lower(email) = lower(trim(p_email));
  if v_id is null then raise exception 'Bu e-postayla kayıtlı üye yok. Önce siteye kayıt olmalı.' using errcode = '22023'; end if;
  if not p_make and v_id = auth.uid() then raise exception 'Kendi yönetici yetkini kaldıramazsın.' using errcode = '22023'; end if;
  update public.profiles set role = case when p_make then 'admin' else 'customer' end where id = v_id;
end $$;

create function public.admin_admins() returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Yetkisiz' using errcode = '42501'; end if;
  return coalesce((select jsonb_agg(jsonb_build_object('id', p.id, 'email', au.email, 'name', p.full_name))
                   from public.profiles p join auth.users au on au.id = p.id where p.role = 'admin'), '[]'::jsonb);
end $$;

revoke all on function public.admin_customers() from public;
revoke all on function public.admin_set_admin(text, boolean) from public;
revoke all on function public.admin_admins() from public;
grant execute on function public.admin_customers() to authenticated;
grant execute on function public.admin_set_admin(text, boolean) to authenticated;
grant execute on function public.admin_admins() to authenticated;

-- ── Ürün görselleri (Storage) ────────────────────────────────────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('product-images', 'product-images', true, 5242880, array['image/webp', 'image/png', 'image/jpeg'])
on conflict (id) do nothing;
create policy "ürün görselleri herkese açık" on storage.objects for select using (bucket_id = 'product-images');
create policy "yönetici görsel yükler" on storage.objects for insert to authenticated with check (bucket_id = 'product-images' and public.is_admin());
create policy "yönetici görsel günceller" on storage.objects for update to authenticated using (bucket_id = 'product-images' and public.is_admin());
create policy "yönetici görsel siler" on storage.objects for delete to authenticated using (bucket_id = 'product-images' and public.is_admin());
