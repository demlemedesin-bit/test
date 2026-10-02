-- Demleme e-ticaret şeması: ürünler, üyelik profili, adresler, siparişler, ayarlar.
-- Sipariş yalnızca create_order() ile oluşur; fiyatlar ve toplam sunucuda products tablosundan hesaplanır.

create table public.shop_settings (
  key text primary key,
  value numeric(10,2) not null
);
insert into public.shop_settings (key, value) values ('free_shipping_threshold', 750), ('shipping_fee', 59.90);

create table public.products (
  slug text primary key,
  name text not null,
  category text not null,
  price numeric(10,2) not null check (price >= 0),
  colors jsonb not null default '[]'::jsonb,   -- [{key, name}]
  sizes text[] not null default '{}',           -- seçilmesi zorunlu bedenler (yoksa boş)
  soon boolean not null default false,          -- "Yakında": sipariş alınmaz
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null default '',
  phone text,
  created_at timestamptz not null default now()
);

create table public.addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null default 'Adresim',
  full_name text not null,
  phone text not null,
  city text not null,
  district text not null,
  address text not null,
  zip text,
  created_at timestamptz not null default now()
);
create index addresses_user_idx on public.addresses (user_id);

create sequence public.order_seq start 1001;

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  order_no text not null unique,
  user_id uuid references auth.users (id) on delete set null,
  email text not null,
  full_name text not null,
  phone text not null,
  address jsonb not null,
  items jsonb not null,
  subtotal numeric(10,2) not null,
  shipping numeric(10,2) not null,
  total numeric(10,2) not null,
  payment_method text not null check (payment_method in ('havale', 'kapida')),
  status text not null default 'odeme_bekleniyor'
    check (status in ('odeme_bekleniyor', 'hazirlaniyor', 'kargoda', 'teslim_edildi', 'iptal')),
  note text,
  created_at timestamptz not null default now()
);
create index orders_user_idx on public.orders (user_id, created_at desc);

-- Yeni üye -> profil satırı
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, phone)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''), nullif(new.raw_user_meta_data ->> 'phone', ''));
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- RLS
alter table public.shop_settings enable row level security;
alter table public.products enable row level security;
alter table public.profiles enable row level security;
alter table public.addresses enable row level security;
alter table public.orders enable row level security;

create policy "ayarlar herkese açık" on public.shop_settings for select using (true);
create policy "aktif ürünler herkese açık" on public.products for select using (active);
create policy "profilini gör" on public.profiles for select to authenticated using (id = auth.uid());
create policy "profilini güncelle" on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
create policy "adreslerini gör" on public.addresses for select to authenticated using (user_id = auth.uid());
create policy "adres ekle" on public.addresses for insert to authenticated with check (user_id = auth.uid());
create policy "adres güncelle" on public.addresses for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "adres sil" on public.addresses for delete to authenticated using (user_id = auth.uid());
create policy "siparişlerini gör" on public.orders for select to authenticated using (user_id = auth.uid());
-- orders için insert/update/delete politikası yok: yalnızca create_order() yazabilir.

-- Sipariş oluşturma: fiyat, stok durumu, renk ve beden sunucuda doğrulanır; istemciden gelen fiyat yok sayılır.
create function public.create_order(p_items jsonb, p_customer jsonb, p_payment text, p_note text default null)
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

    line_amt := prod.price * qty;
    sub := sub + line_amt;
    lines := lines || jsonb_build_array(jsonb_build_object(
      'slug', prod.slug, 'name', prod.name, 'color', col ->> 'key', 'color_name', col ->> 'name',
      'size', sz, 'qty', qty, 'unit_price', prod.price, 'line_total', line_amt));
  end loop;

  select value into free_from from public.shop_settings where key = 'free_shipping_threshold';
  select value into fee from public.shop_settings where key = 'shipping_fee';
  ship := case when sub >= free_from then 0 else fee end;
  tot := sub + ship;

  v_no := 'DM-' || nextval('public.order_seq');
  v_status := case p_payment when 'havale' then 'odeme_bekleniyor' else 'hazirlaniyor' end;

  insert into public.orders (order_no, user_id, email, full_name, phone, address, items, subtotal, shipping, total, payment_method, status, note)
  values (v_no, auth.uid(), v_email, v_name, v_phone, v_addr, lines, sub, ship, tot, p_payment, v_status, nullif(trim(coalesce(p_note, '')), ''))
  returning id into v_id;

  return jsonb_build_object('order_no', v_no, 'status', v_status, 'subtotal', sub, 'shipping', ship, 'total', tot,
                            'payment_method', p_payment, 'items', lines, 'email', v_email);
end $$;

-- Misafir sipariş takibi: sipariş no + e-posta birlikte doğruysa
create function public.get_order(p_order_no text, p_email text) returns jsonb
language sql security definer set search_path = public as $$
  select jsonb_build_object('order_no', order_no, 'status', status, 'created_at', created_at, 'items', items,
                            'subtotal', subtotal, 'shipping', shipping, 'total', total, 'payment_method', payment_method,
                            'full_name', full_name, 'address', address)
  from public.orders
  where order_no = upper(trim(p_order_no)) and email = lower(trim(p_email))
  limit 1;
$$;

revoke all on function public.create_order(jsonb, jsonb, text, text) from public;
revoke all on function public.get_order(text, text) from public;
grant execute on function public.create_order(jsonb, jsonb, text, text) to anon, authenticated;
grant execute on function public.get_order(text, text) to anon, authenticated;

-- Ürünler (content/products.json ile aynı)
insert into public.products (slug, name, category, price, colors, sizes, soon) values
  ('cam-kavanoz-uzun', 'Cam Kavanoz · Uzun', 'Ev & Sofra', 420, '[{"key": "tek", "name": "Şeffaf / bambu"}]'::jsonb, '{}'::text[], false),
  ('cam-kavanoz-basik', 'Cam Kavanoz · Basık', 'Ev & Sofra', 390, '[{"key": "tek", "name": "Şeffaf / bambu"}]'::jsonb, '{}'::text[], false),
  ('demleme-sehpasi', 'Demleme Sehpası', 'Ev & Sofra', 2400, '[{"key": "kirmizi", "name": "Kırmızı"}, {"key": "antrasit", "name": "Antrasit"}, {"key": "adacayi", "name": "Adaçayı"}, {"key": "hardal", "name": "Hardal"}]'::jsonb, '{}'::text[], false),
  ('katli-saklama-kabi', 'Katlı Saklama Kabı', 'Ev & Sofra', 1150, '[{"key": "krem", "name": "Krem"}, {"key": "adacayi", "name": "Adaçayı"}, {"key": "hardal", "name": "Hardal"}, {"key": "kiremit", "name": "Kiremit"}]'::jsonb, '{}'::text[], false),
  ('sofra-tepsisi-buyuk', 'Sofra Tepsisi · Büyük', 'Ev & Sofra', 980, '[{"key": "tek", "name": "Krem / siyah kenar"}]'::jsonb, '{}'::text[], false),
  ('sofra-tepsisi-kucuk', 'Sofra Tepsisi · Küçük', 'Ev & Sofra', 690, '[{"key": "tek", "name": "Krem / siyah kenar"}]'::jsonb, '{}'::text[], false),
  ('demleme-tisort', 'Demleme Tişört', 'Giyim', 650, '[{"key": "krem", "name": "Krem"}, {"key": "adacayi", "name": "Adaçayı"}, {"key": "hardal", "name": "Hardal"}, {"key": "kiremit", "name": "Kiremit"}]'::jsonb, ARRAY['S','M','L','XL','XXL']::text[], false),
  ('demleme-sapka', 'Demleme Şapka', 'Giyim', 520, '[{"key": "krem", "name": "Krem"}, {"key": "adacayi", "name": "Adaçayı"}, {"key": "hardal", "name": "Hardal"}, {"key": "kiremit", "name": "Kiremit"}]'::jsonb, '{}'::text[], false),
  ('demleme-bez-canta', 'Demleme Bez Çanta', 'Aksesuar', 380, '[{"key": "krem", "name": "Krem"}, {"key": "adacayi", "name": "Adaçayı"}, {"key": "kiremit", "name": "Kiremit"}]'::jsonb, '{}'::text[], false),
  ('demleme-cay-bardagi', 'Demleme Çay Bardağı', 'Ev & Sofra', 240, '[{"key": "tek", "name": "Şeffaf / beyaz tabak"}]'::jsonb, '{}'::text[], true)
on conflict (slug) do update set name=excluded.name, category=excluded.category, price=excluded.price, colors=excluded.colors, sizes=excluded.sizes, soon=excluded.soon;

-- handle_new_user yalnızca auth.users tetikleyicisi için; API'den çağrılamasın.
revoke all on function public.handle_new_user() from public, anon, authenticated;
