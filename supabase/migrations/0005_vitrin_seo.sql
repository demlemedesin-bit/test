-- 0005: SEO/vitrin modülleri — 404 günlüğü, ürün yorumları, favoriler, stok uyarısı, bülten aboneleri.
-- Ayarlar (seo, ads, media, storefront, popups, consent) site_content satırlarında tutulur; ek tablo gerekmez.

-- ═══ 1. 404 GÜNLÜĞÜ ═════════════════════════════════════════════════════
create table if not exists public.not_found_log (
  path text primary key,
  hits integer not null default 1,
  referrer text,
  first_seen timestamptz not null default now(),
  last_seen timestamptz not null default now()
);
alter table public.not_found_log enable row level security;
create policy nf_admin on public.not_found_log for all to authenticated using (public.has_perm('content')) with check (public.has_perm('content'));
revoke all on public.not_found_log from anon;

create or replace function public.log_404(p_path text, p_ref text default null) returns void
language plpgsql security definer set search_path = public as $$
declare v text := left(coalesce(p_path, ''), 200);
begin
  if v !~ '^/' or v ~ '^/(_next|api|admin)' or v ~ '\.(js|css|map|png|jpg|jpeg|webp|svg|ico|woff2?)$' then return; end if;
  if (select count(*) from public.not_found_log) >= 1500 and not exists (select 1 from public.not_found_log where path = v) then return; end if;
  insert into public.not_found_log (path, referrer) values (v, nullif(left(coalesce(p_ref, ''), 200), ''))
  on conflict (path) do update set hits = public.not_found_log.hits + 1, last_seen = now();
end $$;
revoke all on function public.log_404(text, text) from public;
grant execute on function public.log_404(text, text) to anon, authenticated;

-- ═══ 2. ÜRÜN YORUMLARI ══════════════════════════════════════════════════
create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  product_slug text not null,
  name text not null check (char_length(name) between 2 and 60),
  email text not null,
  rating integer not null check (rating between 1 and 5),
  title text not null default '' check (char_length(title) <= 120),
  body text not null default '' check (char_length(body) <= 2000),
  approved boolean not null default false,
  verified boolean not null default false,
  reply text,
  created_at timestamptz not null default now(),
  unique (product_slug, email)
);
create index if not exists reviews_slug_idx on public.reviews (product_slug, approved, created_at desc);
alter table public.reviews enable row level security;
create policy reviews_public on public.reviews for select using (approved);
create policy reviews_admin on public.reviews for all to authenticated using (public.has_perm('content')) with check (public.has_perm('content'));
revoke all on public.reviews from anon, authenticated;
grant select (id, product_slug, name, rating, title, body, verified, reply, created_at) on public.reviews to anon;
grant select (id, product_slug, name, rating, title, body, verified, reply, created_at, approved, email) on public.reviews to authenticated;
grant insert, update, delete on public.reviews to authenticated;
create trigger audit_reviews after update or delete on public.reviews for each row execute function public.audit('id');

create or replace function public.submit_review(p_slug text, p_name text, p_email text, p_rating int, p_title text, p_body text) returns text
language plpgsql security definer set search_path = public as $$
declare v_email text := lower(trim(coalesce(p_email, ''))); v_ver boolean;
begin
  if v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'Geçerli bir e-posta gir' using errcode = '22023'; end if;
  if char_length(trim(coalesce(p_name, ''))) < 2 then raise exception 'Adını yaz' using errcode = '22023'; end if;
  if p_rating is null or p_rating < 1 or p_rating > 5 then raise exception 'Puan 1-5 arası olmalı' using errcode = '22023'; end if;
  if char_length(coalesce(p_body, '')) < 5 then raise exception 'Yorumunu biraz daha ayrıntılı yaz' using errcode = '22023'; end if;
  if not exists (select 1 from public.products where slug = p_slug and active) then raise exception 'Ürün bulunamadı' using errcode = '22023'; end if;
  v_ver := exists (select 1 from public.orders o, jsonb_array_elements(o.items) it where o.email = v_email and o.status <> 'iptal' and it ->> 'slug' = p_slug);
  insert into public.reviews (product_slug, name, email, rating, title, body, verified)
  values (p_slug, left(trim(p_name), 60), v_email, p_rating, left(trim(coalesce(p_title, '')), 120), left(trim(p_body), 2000), v_ver)
  on conflict (product_slug, email) do nothing;
  if not found then return 'var'; end if;
  return 'ok';
end $$;
revoke all on function public.submit_review(text, text, text, int, text, text) from public;
grant execute on function public.submit_review(text, text, text, int, text, text) to anon, authenticated;

-- ═══ 3. FAVORİLER ═══════════════════════════════════════════════════════
create table if not exists public.wishlists (
  user_id uuid not null references auth.users (id) on delete cascade,
  product_slug text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, product_slug)
);
alter table public.wishlists enable row level security;
create policy wish_own on public.wishlists for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
revoke all on public.wishlists from anon;

-- ═══ 4. STOK GELİNCE HABER VER ══════════════════════════════════════════
create table if not exists public.stock_alerts (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  product_slug text not null,
  created_at timestamptz not null default now(),
  notified_at timestamptz,
  unique (email, product_slug)
);
alter table public.stock_alerts enable row level security;
create policy stock_alert_admin on public.stock_alerts for all to authenticated using (public.has_perm('products') or public.has_perm('customers')) with check (public.has_perm('products') or public.has_perm('customers'));
revoke all on public.stock_alerts from anon;

create or replace function public.subscribe_stock(p_email text, p_slug text) returns void
language plpgsql security definer set search_path = public as $$
declare v_email text := lower(trim(coalesce(p_email, '')));
begin
  if v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' or length(v_email) > 120 then raise exception 'Geçerli bir e-posta gir' using errcode = '22023'; end if;
  if not exists (select 1 from public.products where slug = p_slug) then raise exception 'Ürün bulunamadı' using errcode = '22023'; end if;
  insert into public.stock_alerts (email, product_slug) values (v_email, p_slug)
  on conflict (email, product_slug) do update set notified_at = null;
end $$;
revoke all on function public.subscribe_stock(text, text) from public;
grant execute on function public.subscribe_stock(text, text) to anon, authenticated;

-- ═══ 5. BÜLTEN ABONELERİ ════════════════════════════════════════════════
create table if not exists public.subscribers (
  email text primary key,
  source text not null default 'site',
  consent boolean not null default true,
  unsubscribed boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.subscribers enable row level security;
create policy subs_admin on public.subscribers for all to authenticated using (public.has_perm('customers')) with check (public.has_perm('customers'));
revoke all on public.subscribers from anon;

create or replace function public.subscribe_newsletter(p_email text, p_source text default 'site') returns void
language plpgsql security definer set search_path = public as $$
declare v_email text := lower(trim(coalesce(p_email, '')));
begin
  if v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' or length(v_email) > 120 then raise exception 'Geçerli bir e-posta gir' using errcode = '22023'; end if;
  insert into public.subscribers (email, source) values (v_email, left(coalesce(p_source, 'site'), 40))
  on conflict (email) do update set unsubscribed = false;
end $$;
revoke all on function public.subscribe_newsletter(text, text) from public;
grant execute on function public.subscribe_newsletter(text, text) to anon, authenticated;
