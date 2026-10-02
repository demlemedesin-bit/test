-- 0008: süreli kampanya fiyatı (products.data.sale), depo paketleme alanı
alter table public.orders add column if not exists packed_at timestamptz;
grant update (packed_at) on public.orders to authenticated;

-- products.data.sale = {price, starts_at, ends_at}: pencere içindeyse sepet ve sipariş bu fiyatı kullanır
create or replace function public.eff_price(p public.products) returns numeric
language plpgsql stable as $$
declare s jsonb := p.data -> 'sale'; sp numeric; a timestamptz; b timestamptz;
begin
  if s is null or jsonb_typeof(s) <> 'object' then return p.price; end if;
  begin
    sp := nullif(s ->> 'price', '')::numeric;
    a := nullif(s ->> 'starts_at', '')::timestamptz;
    b := nullif(s ->> 'ends_at', '')::timestamptz;
  exception when others then return p.price;
  end;
  if sp is null or sp < 0 or sp >= p.price then return p.price; end if;
  if a is not null and now() < a then return p.price; end if;
  if b is not null and now() >= b then return p.price; end if;
  return sp;
end $$;

-- quote_cart: yukarıdaki eff_price ile (canlıda uygulanan sürüm; lines/sub hesabında prod.price yerine eff_price)
create or replace function public.create_order(p_items jsonb, p_customer jsonb, p_payment text, p_note text default null)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  it jsonb; prod public.products%rowtype; col jsonb;
  qty int; ckey text; sz text; line_amt numeric(10,2); pr numeric;
  lines jsonb := '[]'::jsonb; sub numeric(10,2) := 0; ship numeric(10,2); tot numeric(10,2);
  free_from numeric(10,2); fee numeric(10,2);
  v_code text; cd jsonb; disc numeric(10,2) := 0; v_cid uuid; v_cname text;
  v_email text; v_name text; v_phone text; v_addr jsonb; v_no text; v_id uuid; v_status text;
begin
  if p_payment is null or p_payment not in ('havale', 'kapida', 'kart') then
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

    pr := public.eff_price(prod);
    line_amt := pr * qty;
    sub := sub + line_amt;
    lines := lines || jsonb_build_array(jsonb_build_object(
      'slug', prod.slug, 'name', prod.name, 'color', col ->> 'key', 'color_name', col ->> 'name',
      'size', sz, 'qty', qty, 'unit_price', pr, 'line_total', line_amt));
  end loop;

  select coalesce(nullif(value, ''), '750')::numeric into free_from from public.shop_settings where key = 'free_shipping_threshold';
  select coalesce(nullif(value, ''), '0')::numeric into fee from public.shop_settings where key = 'shipping_fee';
  ship := case when sub >= coalesce(free_from, 750) then 0 else coalesce(fee, 0) end;
  v_code := upper(trim(coalesce(p_customer ->> 'coupon', '')));
  cd := public.coupon_discount(v_code, v_email, (select jsonb_agg(jsonb_build_object('slug', l ->> 'slug', 'line_total', (l ->> 'line_total')::numeric)) from jsonb_array_elements(lines) l), sub, ship);
  if v_code <> '' and cd ->> 'error' is not null then raise exception '%', cd ->> 'error' using errcode = '22023'; end if;
  if cd ? 'coupon_id' then
    disc := coalesce((cd ->> 'discount')::numeric, 0);
    if (cd ->> 'free_ship')::boolean then ship := 0; end if;
    v_cid := (cd ->> 'coupon_id')::uuid;
    v_cname := coalesce(cd ->> 'code', cd ->> 'name');
    update public.coupons set used_count = used_count + 1 where id = v_cid and (usage_limit is null or used_count < usage_limit);
    if not found then raise exception 'Kuponun kullanım limiti dolmuş' using errcode = '22023'; end if;
  end if;
  tot := sub - disc + ship;

  v_no := 'DM-' || nextval('public.order_seq');
  v_status := case p_payment when 'kapida' then 'hazirlaniyor' else 'odeme_bekleniyor' end;

  insert into public.orders (order_no, user_id, email, full_name, phone, address, items, subtotal, shipping, total, payment_method, status, note, discount, coupon_code)
  values (v_no, auth.uid(), v_email, v_name, v_phone, v_addr, lines, sub, ship, tot, p_payment, v_status, nullif(trim(coalesce(p_note, '')), ''), disc, v_cname)
  returning id into v_id;
  if v_cid is not null then insert into public.coupon_redemptions (coupon_id, order_no, email, amount) values (v_cid, v_no, v_email, disc); end if;

  return jsonb_build_object('order_no', v_no, 'status', v_status, 'subtotal', sub, 'shipping', ship, 'discount', disc, 'coupon', v_cname, 'total', tot,
                            'payment_method', p_payment, 'items', lines, 'email', v_email);
end $$;


create or replace function public.quote_cart(p_items jsonb, p_code text default null, p_email text default null)
returns jsonb language plpgsql stable security definer set search_path to 'public' as $$
declare
  it jsonb; prod public.products%rowtype; qty int; lines jsonb := '[]'::jsonb; sub numeric(10, 2) := 0; ship numeric(10, 2); free_from numeric; fee numeric; cd jsonb; disc numeric(10, 2) := 0; pr numeric;
begin
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 or jsonb_array_length(p_items) > 30 then
    return jsonb_build_object('subtotal', 0, 'shipping', 0, 'discount', 0, 'total', 0, 'coupon', null, 'error', null);
  end if;
  for it in select * from jsonb_array_elements(p_items) loop
    select * into prod from public.products where slug = it ->> 'slug' and active;
    if not found then continue; end if;
    qty := greatest(1, least(9, coalesce((it ->> 'qty')::int, 1)));
    pr := public.eff_price(prod);
    sub := sub + pr * qty;
    lines := lines || jsonb_build_array(jsonb_build_object('slug', prod.slug, 'line_total', pr * qty));
  end loop;
  select coalesce(nullif(value, ''), '750')::numeric into free_from from public.shop_settings where key = 'free_shipping_threshold';
  select coalesce(nullif(value, ''), '0')::numeric into fee from public.shop_settings where key = 'shipping_fee';
  ship := case when sub >= coalesce(free_from, 750) or sub = 0 then 0 else coalesce(fee, 0) end;
  cd := public.coupon_discount(p_code, p_email, lines, sub, ship);
  if (cd ->> 'free_ship')::boolean then ship := 0; end if;
  disc := coalesce((cd ->> 'discount')::numeric, 0);
  return jsonb_build_object('subtotal', sub, 'shipping', ship, 'discount', disc, 'total', sub - disc + ship,
                            'coupon', case when cd ? 'code' or cd ? 'name' then jsonb_build_object('code', cd -> 'code', 'name', cd -> 'name', 'kind', cd -> 'kind', 'auto', cd -> 'auto') else null end,
                            'error', cd -> 'error');
end $$;

-- Müşteri hizmetleri favorileri görebilsin
create policy wish_staff_read on public.wishlists for select to authenticated using (public.has_perm('support') or public.has_perm('customers'));

create or replace function public.my_perms() returns text[] language sql stable security definer set search_path to 'public' as $$
  select case when public.is_admin()
              then array['orders','products','customers','campaigns','content','reports','tracking','integrations','system','warehouse','accounting','support']
              else coalesce((select perms from public.staff_roles where user_id = auth.uid()), '{}') end;
$$;

create or replace function public.admin_set_staff(p_email text, p_role text, p_perms text[])
returns void language plpgsql security definer set search_path to 'public' as $$
declare v_id uuid; ok text[] := array['orders','products','customers','campaigns','content','reports','tracking','integrations','system','warehouse','accounting','support'];
begin
  if not public.is_admin() then raise exception 'Yetkisiz' using errcode = '42501'; end if;
  select id into v_id from auth.users where lower(email) = lower(trim(p_email));
  if v_id is null then raise exception 'Bu e-postayla kayıtlı üye yok. Önce siteye kayıt olmalı.' using errcode = '22023'; end if;
  if exists (select 1 from public.profiles where id = v_id and role = 'admin') then raise exception 'Bu kişi zaten tam yönetici.' using errcode = '22023'; end if;
  if p_perms is null or array_length(p_perms, 1) is null or not (p_perms <@ ok) then raise exception 'Geçersiz yetki listesi' using errcode = '22023'; end if;
  insert into public.staff_roles (user_id, role, perms) values (v_id, left(coalesce(p_role, 'ozel'), 40), p_perms)
  on conflict (user_id) do update set role = excluded.role, perms = excluded.perms;
end $$;

alter function public.eff_price(public.products) set search_path = public;
