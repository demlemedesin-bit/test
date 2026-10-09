-- 0004: gelişmiş yönetim — roller/yetkiler, işlem kayıtları, kampanya & kupon, müşteri notları, terk edilmiş sepet,
-- sayfa/blog/yönlendirme, mesaj kayıtları, ödeme kayıtları, raporlar. Bölümler birbirinden bağımsız uygulanabilir (sırayla).

-- ═══ 1. ROLLER VE YETKİLER ═══════════════════════════════════════════════
create table if not exists public.staff_roles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  role text not null default 'ozel',
  perms text[] not null default '{}',
  created_at timestamptz not null default now()
);
alter table public.staff_roles enable row level security;
revoke all on public.staff_roles from anon, authenticated;

create or replace function public.is_staff() returns boolean
language sql stable security definer set search_path = public as $$
  select public.is_admin() or exists (select 1 from public.staff_roles where user_id = auth.uid());
$$;
create or replace function public.has_perm(p text) returns boolean
language sql stable security definer set search_path = public as $$
  select public.is_admin() or exists (select 1 from public.staff_roles where user_id = auth.uid() and p = any (perms));
$$;
create or replace function public.my_perms() returns text[]
language sql stable security definer set search_path = public as $$
  select case when public.is_admin()
              then array['orders','products','customers','campaigns','content','reports','tracking','integrations','system']
              else coalesce((select perms from public.staff_roles where user_id = auth.uid()), '{}') end;
$$;
revoke all on function public.is_staff() from public;
revoke all on function public.has_perm(text) from public;
revoke all on function public.my_perms() from public;
grant execute on function public.is_staff() to anon, authenticated;
grant execute on function public.has_perm(text) to anon, authenticated;
grant execute on function public.my_perms() to anon, authenticated;

create or replace function public.admin_staff() returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Yetkisiz' using errcode = '42501'; end if;
  return coalesce((select jsonb_agg(jsonb_build_object('id', s.user_id, 'email', au.email, 'name', coalesce(p.full_name, ''), 'role', s.role, 'perms', s.perms) order by s.created_at)
                   from public.staff_roles s join auth.users au on au.id = s.user_id left join public.profiles p on p.id = s.user_id), '[]'::jsonb);
end $$;

create or replace function public.admin_set_staff(p_email text, p_role text, p_perms text[]) returns void
language plpgsql security definer set search_path = public as $$
declare v_id uuid; ok text[] := array['orders','products','customers','campaigns','content','reports','tracking','integrations','system'];
begin
  if not public.is_admin() then raise exception 'Yetkisiz' using errcode = '42501'; end if;
  select id into v_id from auth.users where lower(email) = lower(trim(p_email));
  if v_id is null then raise exception 'Bu e-postayla kayıtlı üye yok. Önce siteye kayıt olmalı.' using errcode = '22023'; end if;
  if exists (select 1 from public.profiles where id = v_id and role = 'admin') then raise exception 'Bu kişi zaten tam yönetici.' using errcode = '22023'; end if;
  if p_perms is null or array_length(p_perms, 1) is null or not (p_perms <@ ok) then raise exception 'Geçersiz yetki listesi' using errcode = '22023'; end if;
  insert into public.staff_roles (user_id, role, perms) values (v_id, left(coalesce(p_role, 'ozel'), 40), p_perms)
  on conflict (user_id) do update set role = excluded.role, perms = excluded.perms;
end $$;

create or replace function public.admin_remove_staff(p_user uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Yetkisiz' using errcode = '42501'; end if;
  delete from public.staff_roles where user_id = p_user;
end $$;
revoke all on function public.admin_staff() from public;
revoke all on function public.admin_set_staff(text, text, text[]) from public;
revoke all on function public.admin_remove_staff(uuid) from public;
grant execute on function public.admin_staff() to authenticated;
grant execute on function public.admin_set_staff(text, text, text[]) to authenticated;
grant execute on function public.admin_remove_staff(uuid) to authenticated;

-- ═══ 2. POLİTİKALAR YETKİYE BAĞLANIR ═════════════════════════════════════
alter policy "yönetici siparişleri görür" on public.orders using (public.has_perm('orders'));
alter policy "yönetici siparişi günceller" on public.orders using (public.has_perm('orders')) with check (public.has_perm('orders'));
alter policy "yönetici ürünleri görür" on public.products using (public.has_perm('products'));
alter policy "yönetici ürün ekler" on public.products with check (public.has_perm('products'));
alter policy "yönetici ürün günceller" on public.products using (public.has_perm('products')) with check (public.has_perm('products'));
alter policy "yönetici ürün siler" on public.products using (public.has_perm('products'));
alter policy "yönetici ayarları görür" on public.shop_settings using (public.has_perm('system') or public.has_perm('integrations'));
alter policy "yönetici ayar ekler" on public.shop_settings with check ((public.has_perm('system') or public.has_perm('integrations')) and key <> 'admin_emails');
alter policy "yönetici ayar günceller" on public.shop_settings using ((public.has_perm('system') or public.has_perm('integrations')) and key <> 'admin_emails') with check ((public.has_perm('system') or public.has_perm('integrations')) and key <> 'admin_emails');
alter policy site_content_admin on public.site_content using (public.has_perm('content')) with check (public.has_perm('content'));
alter policy track_links_admin on public.track_links using (public.has_perm('tracking') or public.has_perm('campaigns')) with check (public.has_perm('tracking') or public.has_perm('campaigns'));
alter policy track_links_read on public.track_links using (active or public.has_perm('tracking') or public.has_perm('campaigns'));
alter policy track_events_admin on public.track_events using (public.has_perm('tracking') or public.has_perm('reports'));
alter policy "yönetici görsel yükler" on storage.objects with check (bucket_id = 'product-images' and (public.has_perm('products') or public.has_perm('content') or public.has_perm('campaigns')));
alter policy "yönetici görsel günceller" on storage.objects using (bucket_id = 'product-images' and (public.has_perm('products') or public.has_perm('content') or public.has_perm('campaigns')));
alter policy "yönetici görsel siler" on storage.objects using (bucket_id = 'product-images' and (public.has_perm('products') or public.has_perm('content') or public.has_perm('campaigns')));

create or replace function public.admin_customers() returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.has_perm('customers') then raise exception 'Yetkisiz' using errcode = '42501'; end if;
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

-- ═══ 3. İŞLEM KAYITLARI ═════════════════════════════════════════════════
create table if not exists public.audit_log (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  user_id uuid,
  email text,
  action text not null,
  entity text not null,
  entity_id text,
  detail jsonb
);
create index if not exists audit_log_at on public.audit_log (at desc);
alter table public.audit_log enable row level security;
create policy audit_read on public.audit_log for select to authenticated using (public.has_perm('system'));
revoke all on public.audit_log from anon, authenticated;
grant select on public.audit_log to authenticated;

create or replace function public.audit() returns trigger
language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); r jsonb; o jsonb; k text; d jsonb := '{}'::jsonb; eid text; v jsonb;
begin
  if uid is null or not public.is_staff() then return coalesce(new, old); end if;
  r := to_jsonb(coalesce(new, old));
  eid := coalesce(r ->> tg_argv[0], '');
  if tg_op = 'UPDATE' then
    o := to_jsonb(old);
    for k, v in select * from jsonb_each(r) loop
      if o -> k is distinct from v and k not in ('updated_at') then
        d := d || jsonb_build_object(k, case when length(v::text) > 160 then to_jsonb('(uzun içerik değişti)'::text) else v end);
      end if;
    end loop;
    if d = '{}'::jsonb then return new; end if;
  else
    d := jsonb_build_object('ad', coalesce(r ->> 'name', r ->> 'title', r ->> 'code', r ->> 'key', eid));
  end if;
  insert into public.audit_log (user_id, email, action, entity, entity_id, detail)
  values (uid, (select email from auth.users where id = uid), lower(tg_op), tg_table_name, eid, d);
  return coalesce(new, old);
end $$;
revoke all on function public.audit() from public, anon, authenticated;

create trigger audit_orders after update on public.orders for each row execute function public.audit('order_no');
create trigger audit_products after insert or update or delete on public.products for each row execute function public.audit('slug');
create trigger audit_settings after insert or update or delete on public.shop_settings for each row execute function public.audit('key');
create trigger audit_content after insert or update or delete on public.site_content for each row execute function public.audit('key');
create trigger audit_links after insert or update or delete on public.track_links for each row execute function public.audit('code');
create trigger audit_role after update on public.profiles for each row when (old.role is distinct from new.role) execute function public.audit('id');

-- ═══ 4. KAMPANYA VE KUPON ═══════════════════════════════════════════════
create table if not exists public.coupons (
  id uuid primary key default gen_random_uuid(),
  code text unique check (code is null or code ~ '^[A-Z0-9_-]{3,32}$'),
  name text not null,
  kind text not null check (kind in ('percent', 'fixed', 'free_shipping')),
  value numeric(10, 2) not null default 0 check (value >= 0),
  min_total numeric(10, 2) not null default 0 check (min_total >= 0),
  max_discount numeric(10, 2) check (max_discount is null or max_discount >= 0),
  auto boolean not null default false,
  starts_at timestamptz,
  ends_at timestamptz,
  usage_limit integer check (usage_limit is null or usage_limit >= 0),
  per_email_limit integer check (per_email_limit is null or per_email_limit >= 1),
  used_count integer not null default 0,
  product_slugs text[] not null default '{}',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  check ((auto and code is null) or (not auto and code is not null)),
  check (kind <> 'percent' or value <= 100)
);
create table if not exists public.coupon_redemptions (
  id uuid primary key default gen_random_uuid(),
  coupon_id uuid not null references public.coupons (id) on delete cascade,
  order_no text not null,
  email text not null,
  amount numeric(10, 2) not null,
  created_at timestamptz not null default now()
);
create index if not exists coupon_red_idx on public.coupon_redemptions (coupon_id, email);
alter table public.coupons enable row level security;
alter table public.coupon_redemptions enable row level security;
create policy coupons_admin on public.coupons for all to authenticated using (public.has_perm('campaigns')) with check (public.has_perm('campaigns'));
create policy coupon_red_admin on public.coupon_redemptions for select to authenticated using (public.has_perm('campaigns') or public.has_perm('reports'));
revoke all on public.coupon_redemptions from anon, authenticated;
grant select on public.coupon_redemptions to authenticated;
grant select, insert, update, delete on public.coupons to authenticated;
revoke all on public.coupons from anon;
create trigger audit_coupons after insert or update or delete on public.coupons for each row execute function public.audit('code');

alter table public.orders add column if not exists discount numeric(10, 2) not null default 0;
alter table public.orders add column if not exists coupon_code text;

-- Uygun kuponlar içinden en çok indirim sağlayanı seçer (yazılan kod + otomatik kampanyalar).
create or replace function public.coupon_discount(p_code text, p_email text, p_lines jsonb, p_sub numeric, p_ship numeric)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  c public.coupons; v_code text := upper(trim(coalesce(p_code, ''))); v_mail text := lower(trim(coalesce(p_email, '')));
  elig numeric; d numeric; eff numeric; best jsonb := null; best_eff numeric := -1; err text := null; found_code boolean := false; reason text;
begin
  for c in select * from public.coupons where active and (auto or (v_code <> '' and code = v_code)) loop
    if not c.auto then found_code := true; end if;
    reason := null;
    if c.starts_at is not null and c.starts_at > now() then reason := 'Bu kupon henüz geçerli değil';
    elsif c.ends_at is not null and c.ends_at < now() then reason := 'Kuponun süresi dolmuş';
    elsif c.usage_limit is not null and c.used_count >= c.usage_limit then reason := 'Kuponun kullanım limiti dolmuş';
    elsif p_sub < c.min_total then reason := format('Bu kupon için sepet tutarı en az %s ₺ olmalı', trim(to_char(c.min_total, 'FM999G999D99')));
    elsif c.per_email_limit is not null and v_mail <> '' and (select count(*) from public.coupon_redemptions r where r.coupon_id = c.id and r.email = v_mail) >= c.per_email_limit then
      reason := 'Bu kuponu daha önce kullandın';
    end if;
    if reason is null then
      elig := case when coalesce(array_length(c.product_slugs, 1), 0) = 0 then p_sub
                   else coalesce((select sum((l ->> 'line_total')::numeric) from jsonb_array_elements(p_lines) l where l ->> 'slug' = any (c.product_slugs)), 0) end;
      if elig <= 0 then reason := 'Kupon sepetindeki ürünlerde geçerli değil'; end if;
    end if;
    if reason is not null then
      if not c.auto then err := reason; end if;
      continue;
    end if;
    d := case c.kind
           when 'percent' then least(round(elig * c.value / 100, 2), coalesce(c.max_discount, 1e12))
           when 'fixed' then least(c.value, elig)
           else 0 end;
    d := least(d, p_sub);
    eff := case when c.kind = 'free_shipping' then p_ship else d end;
    if eff > best_eff then
      best_eff := eff;
      best := jsonb_build_object('coupon_id', c.id, 'code', c.code, 'name', c.name, 'kind', c.kind, 'auto', c.auto, 'discount', d, 'free_ship', c.kind = 'free_shipping');
    end if;
  end loop;
  if v_code <> '' and not found_code then err := 'Geçersiz kupon kodu'; end if;
  return coalesce(best, '{}'::jsonb) || jsonb_build_object('error', err);
end $$;
revoke all on function public.coupon_discount(text, text, jsonb, numeric, numeric) from public, anon, authenticated;

-- Sepet özeti (sunucu fiyatlarıyla, stok düşmeden): sepet/ödeme sayfası bunu gösterir.
create or replace function public.quote_cart(p_items jsonb, p_code text default null, p_email text default null)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  it jsonb; prod public.products%rowtype; qty int; lines jsonb := '[]'::jsonb; sub numeric(10, 2) := 0; ship numeric(10, 2); free_from numeric; fee numeric; cd jsonb; disc numeric(10, 2) := 0;
begin
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 or jsonb_array_length(p_items) > 30 then
    return jsonb_build_object('subtotal', 0, 'shipping', 0, 'discount', 0, 'total', 0, 'coupon', null, 'error', null);
  end if;
  for it in select * from jsonb_array_elements(p_items) loop
    select * into prod from public.products where slug = it ->> 'slug' and active;
    if not found then continue; end if;
    qty := greatest(1, least(9, coalesce((it ->> 'qty')::int, 1)));
    sub := sub + prod.price * qty;
    lines := lines || jsonb_build_array(jsonb_build_object('slug', prod.slug, 'line_total', prod.price * qty));
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
revoke all on function public.quote_cart(jsonb, text, text) from public;
grant execute on function public.quote_cart(jsonb, text, text) to anon, authenticated;

-- ═══ 5. MÜŞTERİ: NOT/ETİKET VE TERK EDİLMİŞ SEPET ═════════════════════════
create table if not exists public.customer_meta (
  email text primary key,
  tags text[] not null default '{}',
  note text not null default '',
  updated_at timestamptz not null default now()
);
alter table public.customer_meta enable row level security;
create policy customer_meta_admin on public.customer_meta for all to authenticated using (public.has_perm('customers')) with check (public.has_perm('customers'));
grant select, insert, update, delete on public.customer_meta to authenticated;
revoke all on public.customer_meta from anon;

create table if not exists public.abandoned_carts (
  email text primary key,
  user_id uuid,
  items jsonb not null,
  total numeric(10, 2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  reminded_at timestamptz,
  remind_count integer not null default 0
);
alter table public.abandoned_carts enable row level security;
create policy abandoned_admin on public.abandoned_carts for all to authenticated using (public.has_perm('customers') or public.has_perm('campaigns')) with check (public.has_perm('customers') or public.has_perm('campaigns'));
grant select, update, delete on public.abandoned_carts to authenticated;
revoke all on public.abandoned_carts from anon;

create or replace function public.save_cart(p_email text, p_items jsonb) returns void
language plpgsql security definer set search_path = public as $$
declare v_email text := lower(trim(coalesce(p_email, ''))); it jsonb; prod public.products%rowtype; qty int; norm jsonb := '[]'::jsonb; tot numeric(10, 2) := 0;
begin
  if v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' or length(v_email) > 120 then return; end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    delete from public.abandoned_carts where email = v_email; return;
  end if;
  if jsonb_array_length(p_items) > 30 then return; end if;
  for it in select * from jsonb_array_elements(p_items) loop
    select * into prod from public.products where slug = it ->> 'slug' and active;
    if not found then continue; end if;
    qty := greatest(1, least(9, coalesce((it ->> 'qty')::int, 1)));
    tot := tot + prod.price * qty;
    norm := norm || jsonb_build_array(jsonb_build_object('slug', prod.slug, 'name', prod.name, 'qty', qty, 'color', it ->> 'color', 'size', it ->> 'size', 'price', prod.price));
  end loop;
  if jsonb_array_length(norm) = 0 then return; end if;
  insert into public.abandoned_carts (email, user_id, items, total) values (v_email, auth.uid(), norm, tot)
  on conflict (email) do update set items = excluded.items, total = excluded.total, user_id = coalesce(excluded.user_id, public.abandoned_carts.user_id), updated_at = now();
end $$;
revoke all on function public.save_cart(text, jsonb) from public;
grant execute on function public.save_cart(text, jsonb) to anon, authenticated;

-- ═══ 6. İÇERİK: SAYFA, BLOG, YÖNLENDİRME ═════════════════════════════════
create table if not exists public.pages (
  slug text primary key check (slug ~ '^[a-z0-9-]{2,60}$'),
  title text not null,
  body text not null default '',
  seo_title text not null default '',
  seo_desc text not null default '',
  published boolean not null default false,
  in_footer boolean not null default false,
  sort integer not null default 0,
  updated_at timestamptz not null default now()
);
create table if not exists public.posts (
  slug text primary key check (slug ~ '^[a-z0-9-]{2,80}$'),
  title text not null,
  excerpt text not null default '',
  cover text,
  body text not null default '',
  tags text[] not null default '{}',
  seo_title text not null default '',
  seo_desc text not null default '',
  published boolean not null default false,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.redirects (
  id uuid primary key default gen_random_uuid(),
  from_path text not null unique check (from_path ~ '^/'),
  to_path text not null,
  permanent boolean not null default true,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.pages enable row level security;
alter table public.posts enable row level security;
alter table public.redirects enable row level security;
create policy pages_read on public.pages for select using (published or public.has_perm('content'));
create policy pages_admin on public.pages for all to authenticated using (public.has_perm('content')) with check (public.has_perm('content'));
create policy posts_read on public.posts for select using ((published and (published_at is null or published_at <= now())) or public.has_perm('content'));
create policy posts_admin on public.posts for all to authenticated using (public.has_perm('content')) with check (public.has_perm('content'));
create policy redirects_read on public.redirects for select using (active or public.has_perm('content'));
create policy redirects_admin on public.redirects for all to authenticated using (public.has_perm('content')) with check (public.has_perm('content'));
grant select on public.pages, public.posts, public.redirects to anon, authenticated;
grant insert, update, delete on public.pages, public.posts, public.redirects to authenticated;
create trigger pages_touch before update on public.pages for each row execute function public.touch_updated_at();
create trigger posts_touch before update on public.posts for each row execute function public.touch_updated_at();
create trigger audit_pages after insert or update or delete on public.pages for each row execute function public.audit('slug');
create trigger audit_posts after insert or update or delete on public.posts for each row execute function public.audit('slug');
create trigger audit_redirects after insert or update or delete on public.redirects for each row execute function public.audit('from_path');

-- ═══ 7. MESAJ VE ÖDEME KAYITLARI ═════════════════════════════════════════
create table if not exists public.message_templates (
  key text primary key,
  name text not null,
  subject text not null default '',
  body text not null default '',
  email_on boolean not null default true,
  sms_on boolean not null default false,
  updated_at timestamptz not null default now()
);
create table if not exists public.message_log (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  channel text not null check (channel in ('email', 'sms', 'whatsapp', 'webhook')),
  to_addr text,
  template text,
  subject text,
  status text not null check (status in ('sent', 'failed', 'skipped')),
  error text,
  order_no text
);
create index if not exists message_log_at on public.message_log (at desc);
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  order_no text not null,
  provider text not null default 'iyzico',
  token text unique,
  payment_id text,
  status text not null default 'init' check (status in ('init', 'paid', 'failed', 'review', 'refunded', 'cancelled')),
  fraud_status integer,
  paid_price numeric(10, 2),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists payments_order on public.payments (order_no);
alter table public.message_templates enable row level security;
alter table public.message_log enable row level security;
alter table public.payments enable row level security;
create policy tpl_admin on public.message_templates for all to authenticated using (public.has_perm('integrations')) with check (public.has_perm('integrations'));
create policy mlog_read on public.message_log for select to authenticated using (public.has_perm('integrations') or public.has_perm('customers'));
create policy pay_read on public.payments for select to authenticated using (public.has_perm('orders'));
grant select, insert, update, delete on public.message_templates to authenticated;
grant select on public.message_log, public.payments to authenticated;
revoke all on public.message_templates, public.message_log, public.payments from anon;

insert into public.message_templates (key, name, subject, body, email_on, sms_on) values
 ('order_created', 'Sipariş alındı', '{{order_no}} numaralı siparişin alındı', E'Merhaba {{name}},\n\nSiparişin bize ulaştı. Sipariş numaran: {{order_no}}\nToplam: {{total}}\n\n{{payment_info}}\n\nSiparişini şuradan takip edebilirsin: {{track_url}}\n\nDemleme', true, false),
 ('order_paid', 'Ödeme alındı', '{{order_no}} için ödemen alındı', E'Merhaba {{name}},\n\n{{order_no}} numaralı siparişinin ödemesi alındı, hazırlamaya başladık.\n\nTakip: {{track_url}}\n\nDemleme', true, false),
 ('order_shipped', 'Kargoya verildi', '{{order_no}} kargoya verildi', E'Merhaba {{name}},\n\nSiparişin kargoya verildi.\nKargo: {{carrier}} · Takip no: {{tracking_no}}\n{{carrier_url}}\n\nSiparişin sayfası: {{track_url}}\n\nDemleme', true, true),
 ('order_delivered', 'Teslim edildi', '{{order_no}} teslim edildi', E'Merhaba {{name}},\n\nSiparişin teslim edildi. Afiyet olsun, keyifle kullan!\n\nDemleme', true, false),
 ('order_cancelled', 'Sipariş iptal edildi', '{{order_no}} iptal edildi', E'Merhaba {{name}},\n\n{{order_no}} numaralı siparişin iptal edildi. Bir sorun olduğunu düşünüyorsan bu e-postaya yanıt verebilirsin.\n\nDemleme', true, false),
 ('cart_reminder', 'Sepet hatırlatma', 'Sepetin seni bekliyor', E'Merhaba,\n\nSepetinde ürünler kaldı:\n{{cart_items}}\n\nDevam etmek için: {{cart_url}}\n\nDemleme', true, false)
on conflict (key) do nothing;

-- Ödeme (kart): yalnızca service_role çağırır. Tutar uyuşmuyorsa onaylamaz.
create or replace function public.mark_order_paid(p_order_no text, p_payment_id text, p_paid numeric) returns boolean
language plpgsql security definer set search_path = public as $$
declare o public.orders;
begin
  select * into o from public.orders where order_no = p_order_no for update;
  if o.id is null then return false; end if;
  if o.status <> 'odeme_bekleniyor' then return o.status <> 'iptal'; end if;
  if abs(o.total - p_paid) > 0.001 then raise exception 'tutar uyusmuyor' using errcode = '22023'; end if;
  update public.orders set status = 'hazirlaniyor' where id = o.id;
  return true;
end $$;
revoke all on function public.mark_order_paid(text, text, numeric) from public, anon, authenticated;
grant execute on function public.mark_order_paid(text, text, numeric) to service_role;

-- ═══ 8. SİPARİŞ v3 (kupon, kart) ════════════════════════════════════════
alter table public.orders drop constraint if exists orders_payment_method_check;
alter table public.orders add constraint orders_payment_method_check check (payment_method in ('havale', 'kapida', 'kart'));
create or replace function public.create_order(p_items jsonb, p_customer jsonb, p_payment text, p_note text default null)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  it jsonb; prod public.products%rowtype; col jsonb;
  qty int; ckey text; sz text; line_amt numeric(10,2);
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

    line_amt := prod.price * qty;
    sub := sub + line_amt;
    lines := lines || jsonb_build_array(jsonb_build_object(
      'slug', prod.slug, 'name', prod.name, 'color', col ->> 'key', 'color_name', col ->> 'name',
      'size', sz, 'qty', qty, 'unit_price', prod.price, 'line_total', line_amt));
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

-- ── get_order: kargo bilgisi de dönsün ──────────────────────────────────
create or replace function public.get_order(p_order_no text, p_email text) returns jsonb
language sql security definer set search_path = public as $$
  select jsonb_build_object('order_no', order_no, 'status', status, 'created_at', created_at, 'items', items,
                            'subtotal', subtotal, 'shipping', shipping, 'discount', discount, 'coupon', coupon_code, 'total', total, 'payment_method', payment_method,
                            'full_name', full_name, 'address', address,
                            'tracking_carrier', tracking_carrier, 'tracking_no', tracking_no)
  from public.orders
  where order_no = upper(trim(p_order_no)) and email = lower(trim(p_email))
  limit 1;
$$;


-- ═══ 9. RAPORLAR ═════════════════════════════════════════════════════════
create or replace function public.report_sales(p_from timestamptz, p_to timestamptz)
returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  if not public.has_perm('reports') then raise exception 'Yetkisiz' using errcode = '42501'; end if;
  return jsonb_build_object(
    'summary', (select jsonb_build_object('orders', count(*), 'revenue', coalesce(sum(total), 0), 'discount', coalesce(sum(discount), 0),
                  'shipping', coalesce(sum(shipping), 0), 'customers', count(distinct email), 'aov', coalesce(round(avg(total), 2), 0))
                from public.orders where status <> 'iptal' and created_at >= p_from and created_at < p_to),
    'cancelled', (select count(*) from public.orders where status = 'iptal' and created_at >= p_from and created_at < p_to),
    'daily', coalesce((select jsonb_agg(d order by d.day) from (
        select (created_at at time zone 'Europe/Istanbul')::date as day, count(*) as orders, coalesce(sum(total), 0) as revenue
        from public.orders where status <> 'iptal' and created_at >= p_from and created_at < p_to group by 1) d), '[]'::jsonb),
    'products', coalesce((select jsonb_agg(p order by p.revenue desc) from (
        select it ->> 'name' as name, it ->> 'slug' as slug, sum((it ->> 'qty')::int) as qty, sum((it ->> 'line_total')::numeric) as revenue
        from public.orders o, jsonb_array_elements(o.items) it
        where o.status <> 'iptal' and o.created_at >= p_from and o.created_at < p_to group by 1, 2) p), '[]'::jsonb),
    'payments', coalesce((select jsonb_agg(m) from (
        select payment_method as method, count(*) as orders, coalesce(sum(total), 0) as revenue
        from public.orders where status <> 'iptal' and created_at >= p_from and created_at < p_to group by 1) m), '[]'::jsonb),
    'cities', coalesce((select jsonb_agg(c order by c.orders desc) from (
        select address ->> 'city' as city, count(*) as orders, coalesce(sum(total), 0) as revenue
        from public.orders where status <> 'iptal' and created_at >= p_from and created_at < p_to group by 1 limit 15) c), '[]'::jsonb),
    'statuses', coalesce((select jsonb_agg(s) from (
        select status, count(*) as orders from public.orders where created_at >= p_from and created_at < p_to group by 1) s), '[]'::jsonb),
    'coupons', coalesce((select jsonb_agg(k order by k.uses desc) from (
        select c.name, c.code, count(r.id) as uses, coalesce(sum(r.amount), 0) as amount
        from public.coupon_redemptions r join public.coupons c on c.id = r.coupon_id
        where r.created_at >= p_from and r.created_at < p_to group by 1, 2) k), '[]'::jsonb),
    'low_stock', coalesce((select jsonb_agg(l) from (
        select slug, name, stock from public.products where active and stock is not null and stock <= 5 order by stock) l), '[]'::jsonb));
end $$;
revoke all on function public.report_sales(timestamptz, timestamptz) from public, anon;
grant execute on function public.report_sales(timestamptz, timestamptz) to authenticated;

create or replace function public.track_report_guard() returns boolean language sql stable as $$ select public.has_perm('tracking') or public.has_perm('reports') $$;

create or replace function public.track_report(p_from timestamptz, p_to timestamptz)
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  if not public.track_report_guard() then raise exception 'yetkisiz' using errcode = '42501'; end if;
  return jsonb_build_object(
    'rows', coalesce((
      select jsonb_agg(r order by r.orders desc, r.visitors desc) from (
        select coalesce(nullif(source, ''), '(doğrudan)') as source, coalesce(medium, '') as medium, coalesce(campaign, '') as campaign,
               count(*) filter (where type = 'click') as clicks,
               count(*) filter (where type = 'view') as views,
               count(distinct sid) as visitors,
               count(distinct sid) filter (where type = 'add_to_cart') as carts,
               count(*) filter (where type = 'order') as orders,
               coalesce(sum(value) filter (where type = 'order'), 0) as revenue
        from track_events where created_at >= p_from and created_at < p_to
        group by 1, 2, 3) r), '[]'::jsonb),
    'links', coalesce((
      select jsonb_agg(l) from (
        select link_code as code, count(*) filter (where type = 'click') as clicks, count(distinct sid) as visitors,
               count(distinct sid) filter (where type = 'add_to_cart') as carts,
               count(*) filter (where type = 'order') as orders, coalesce(sum(value) filter (where type = 'order'), 0) as revenue
        from track_events where link_code is not null and created_at >= p_from and created_at < p_to group by 1) l), '[]'::jsonb),
    'daily', coalesce((
      select jsonb_agg(d order by d.day) from (
        select (created_at at time zone 'Europe/Istanbul')::date as day, count(*) filter (where type = 'view') as views,
               count(distinct sid) as visitors, count(*) filter (where type = 'order') as orders
        from track_events where created_at >= p_from and created_at < p_to group by 1) d), '[]'::jsonb));
end $$;
revoke all on function public.track_report(timestamptz, timestamptz) from public;
grant execute on function public.track_report(timestamptz, timestamptz) to authenticated;

-- ═══ 10. anon çağrı yetkisini kapat (içeride zaten yetki kontrolü var; savunma katmanı) ═══
revoke execute on function public.admin_staff() from anon;
revoke execute on function public.admin_set_staff(text, text, text[]) from anon;
revoke execute on function public.track_report(timestamptz, timestamptz) from anon;
revoke execute on function public.report_sales(timestamptz, timestamptz) from anon;
revoke execute on function public.admin_customers() from anon;
create or replace function public.track_report_guard() returns boolean language sql stable set search_path = public as $$ select public.has_perm('tracking') or public.has_perm('reports') $$;
-- Not: admin_remove_staff(uuid) canlıya yazılamadı (onay kapısı); gerekirse elle: delete from staff_roles where user_id = ...
