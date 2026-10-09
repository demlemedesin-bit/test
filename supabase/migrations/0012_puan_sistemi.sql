-- Sadakat puanı: alışverişten ve yorumdan puan, puanı hediye çekine çevirme.
-- Kurallar site_content.loyalty içinde (admin /admin/puan sayfasından düzenlenir).

create table if not exists public.loyalty_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  email text,
  points int not null,
  reason text not null check (reason in ('order','order_reverse','review','review_reverse','signup','redeem','adjust')),
  ref text not null default '',
  note text not null default '',
  created_at timestamptz not null default now(),
  unique (user_id, reason, ref)
);
create index if not exists loyalty_ledger_user_idx on public.loyalty_ledger (user_id, created_at desc);

alter table public.loyalty_ledger enable row level security;
drop policy if exists loyalty_own_read on public.loyalty_ledger;
create policy loyalty_own_read on public.loyalty_ledger for select using (user_id = auth.uid());
drop policy if exists loyalty_admin_read on public.loyalty_ledger;
create policy loyalty_admin_read on public.loyalty_ledger for select using (public.has_perm('campaigns'));

-- Hediye çekinin sahibi (hangi üyeye ait)
alter table public.coupons add column if not exists owner_id uuid references auth.users(id) on delete set null;

create or replace function public.loyalty_cfg() returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce((select value from public.site_content where key = 'loyalty'), '{}'::jsonb)
$$;

create or replace function public.loyalty_add(p_user uuid, p_email text, p_pts int, p_reason text, p_ref text, p_note text default '')
returns boolean language plpgsql security definer set search_path = public as $$
begin
  if p_user is null or coalesce(p_pts, 0) = 0 then return false; end if;
  insert into public.loyalty_ledger (user_id, email, points, reason, ref, note)
  values (p_user, lower(p_email), p_pts, p_reason, coalesce(p_ref, ''), coalesce(p_note, ''))
  on conflict (user_id, reason, ref) do nothing;
  return found;
end $$;
revoke all on function public.loyalty_add(uuid, text, int, text, text, text) from public, anon, authenticated;

create or replace function public.loyalty_balance(p_user uuid) returns int
language sql stable security definer set search_path = public as $$
  select coalesce(sum(points), 0)::int from public.loyalty_ledger where user_id = p_user
$$;
revoke all on function public.loyalty_balance(uuid) from public, anon;
grant execute on function public.loyalty_balance(uuid) to authenticated;

-- Sipariş: durum eşiğine ulaşınca ver, iptalde geri al
create or replace function public.loyalty_order_rank(s text) returns int language sql immutable as $$
  select case s when 'hazirlaniyor' then 1 when 'kargoda' then 2 when 'teslim_edildi' then 3 else 0 end
$$;

create or replace function public.loyalty_on_order() returns trigger
language plpgsql security definer set search_path = public as $$
declare c jsonb := public.loyalty_cfg(); pts int; need int; earned int;
begin
  if new.user_id is null then return new; end if;
  if new.status = 'iptal' and old.status <> 'iptal' then
    select coalesce(sum(points), 0) into earned from public.loyalty_ledger where user_id = new.user_id and reason = 'order' and ref = new.order_no;
    if earned > 0 then
      perform public.loyalty_add(new.user_id, new.email, -earned, 'order_reverse', new.order_no, 'Sipariş iptali');
    end if;
    return new;
  end if;
  if coalesce((c ->> 'on')::boolean, false) is not true then return new; end if;
  need := public.loyalty_order_rank(coalesce(c ->> 'earn_on', 'teslim_edildi'));
  if need = 0 then need := 3; end if;
  if public.loyalty_order_rank(new.status) >= need then
    pts := floor(greatest(coalesce(new.subtotal, 0) - coalesce(new.discount, 0), 0) * coalesce((c ->> 'earn_per_tl')::numeric, 0));
    if pts > 0 then
      perform public.loyalty_add(new.user_id, new.email, pts, 'order', new.order_no, 'Sipariş ' || new.order_no);
    end if;
  end if;
  return new;
end $$;
drop trigger if exists loyalty_orders on public.orders;
create trigger loyalty_orders after update of status on public.orders for each row execute function public.loyalty_on_order();

-- Yorum: onaylanınca (e-posta eşleşen üyeye) ver, onay kalkar/silinirse geri al
create or replace function public.loyalty_on_review() returns trigger
language plpgsql security definer set search_path = public as $$
declare c jsonb := public.loyalty_cfg(); uid uuid; pts int; ok boolean; was boolean;
begin
  if tg_op = 'DELETE' then
    uid := (select id from auth.users where lower(email) = lower(old.email) limit 1);
    if uid is not null and old.approved then
      perform public.loyalty_add(uid, old.email, -coalesce((select points from public.loyalty_ledger where user_id = uid and reason = 'review' and ref = old.id::text), 0), 'review_reverse', old.id::text, 'Yorum silindi');
    end if;
    return old;
  end if;
  ok := new.approved;
  was := tg_op = 'UPDATE' and old.approved;
  uid := (select id from auth.users where lower(email) = lower(new.email) limit 1);
  if uid is null then return new; end if;
  if ok and not was then
    if coalesce((c ->> 'on')::boolean, false) is true then
      pts := coalesce((c ->> 'review_points')::int, 0);
      if coalesce((c ->> 'review_verified_only')::boolean, false) and not new.verified then pts := 0; end if;
      if char_length(coalesce(new.body, '')) < coalesce((c ->> 'review_min_chars')::int, 0) then pts := 0; end if;
      if pts > 0 then perform public.loyalty_add(uid, new.email, pts, 'review', new.id::text, 'Ürün yorumu'); end if;
    end if;
  elsif was and not ok then
    pts := coalesce((select points from public.loyalty_ledger where user_id = uid and reason = 'review' and ref = new.id::text), 0);
    if pts > 0 then perform public.loyalty_add(uid, new.email, -pts, 'review_reverse', new.id::text, 'Yorum onayı kaldırıldı'); end if;
  end if;
  return new;
end $$;
drop trigger if exists loyalty_reviews on public.reviews;
create trigger loyalty_reviews after insert or update of approved or delete on public.reviews for each row execute function public.loyalty_on_review();

-- Üyelik: hoş geldin puanı
create or replace function public.loyalty_on_signup() returns trigger
language plpgsql security definer set search_path = public as $$
declare c jsonb := public.loyalty_cfg(); pts int;
begin
  if coalesce((c ->> 'on')::boolean, false) is true then
    pts := coalesce((c ->> 'signup_points')::int, 0);
    if pts > 0 then
      perform public.loyalty_add(new.id, (select email from auth.users where id = new.id), pts, 'signup', 'signup', 'Üyelik hediyesi');
    end if;
  end if;
  return new;
end $$;
drop trigger if exists loyalty_signup on public.profiles;
create trigger loyalty_signup after insert on public.profiles for each row execute function public.loyalty_on_signup();

-- Üye: puanı + geçmişi + çeklerini getir
create or replace function public.my_loyalty() returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare u uuid := auth.uid();
begin
  if u is null then return null; end if;
  return jsonb_build_object(
    'balance', public.loyalty_balance(u),
    'ledger', coalesce((select jsonb_agg(to_jsonb(l) - 'user_id' - 'email' order by l.created_at desc) from (select * from public.loyalty_ledger where user_id = u order by created_at desc limit 50) l), '[]'::jsonb),
    'coupons', coalesce((select jsonb_agg(jsonb_build_object('code', c.code, 'value', c.value, 'min_total', c.min_total, 'ends_at', c.ends_at, 'used', c.used_count > 0, 'active', c.active) order by c.created_at desc) from public.coupons c where c.owner_id = u), '[]'::jsonb)
  );
end $$;
grant execute on function public.my_loyalty() to authenticated;

-- Puanı hediye çekine çevir (p_idx: admin'deki ödül sırası, 0'dan)
create or replace function public.redeem_points(p_idx int) returns text
language plpgsql security definer set search_path = public as $$
declare u uuid := auth.uid(); c jsonb := public.loyalty_cfg(); r jsonb; cost int; val numeric; mt numeric; days int; v_code text; v_email text; i int := 0;
begin
  if u is null then raise exception 'Giriş yapmalısın' using errcode = '28000'; end if;
  if coalesce((c ->> 'on')::boolean, false) is not true then raise exception 'Puan sistemi şu an kapalı' using errcode = '22023'; end if;
  r := (c -> 'rewards') -> p_idx;
  if r is null then raise exception 'Ödül bulunamadı' using errcode = '22023'; end if;
  cost := (r ->> 'points')::int; val := (r ->> 'value')::numeric; mt := coalesce((r ->> 'min_total')::numeric, 0); days := coalesce((r ->> 'valid_days')::int, 90);
  if cost is null or cost <= 0 or val is null or val <= 0 then raise exception 'Ödül geçersiz' using errcode = '22023'; end if;
  perform pg_advisory_xact_lock(hashtext(u::text));
  if public.loyalty_balance(u) < cost then raise exception 'Yeterli puanın yok' using errcode = '22023'; end if;
  select email into v_email from auth.users where id = u;
  loop
    v_code := 'HC-' || upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8));
    begin
      insert into public.coupons (code, name, kind, value, min_total, usage_limit, per_email_limit, ends_at, active, auto, owner_id)
      values (v_code, 'Puan çeki', 'fixed', val, mt, 1, 1, now() + make_interval(days => days), true, false, u);
      exit;
    exception when unique_violation then
      i := i + 1; if i > 5 then raise; end if;
    end;
  end loop;
  insert into public.loyalty_ledger (user_id, email, points, reason, ref, note)
  values (u, lower(v_email), -cost, 'redeem', v_code, val::text || ' TL hediye çeki');
  return v_code;
end $$;
grant execute on function public.redeem_points(int) to authenticated;

-- Yönetici: elle puan ekle/çıkar
create or replace function public.admin_adjust_points(p_user uuid, p_points int, p_note text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.has_perm('campaigns') then raise exception 'Yetkisiz' using errcode = '42501'; end if;
  if p_points is null or p_points = 0 then raise exception 'Puan 0 olamaz' using errcode = '22023'; end if;
  insert into public.loyalty_ledger (user_id, email, points, reason, ref, note)
  values (p_user, (select lower(email) from auth.users where id = p_user), p_points, 'adjust', gen_random_uuid()::text, left(coalesce(p_note, ''), 200));
end $$;
grant execute on function public.admin_adjust_points(uuid, int, text) to authenticated;

-- Yönetici: üye bakiyeleri
create or replace function public.admin_loyalty_members() returns table (user_id uuid, email text, full_name text, balance int, earned int, spent int, last_at timestamptz)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.has_perm('campaigns') then raise exception 'Yetkisiz' using errcode = '42501'; end if;
  return query
    select l.user_id, max(l.email), max(p.full_name), sum(l.points)::int,
           coalesce(sum(l.points) filter (where l.points > 0), 0)::int,
           coalesce(-sum(l.points) filter (where l.points < 0), 0)::int, max(l.created_at)
    from public.loyalty_ledger l left join public.profiles p on p.id = l.user_id
    group by l.user_id order by sum(l.points) desc;
end $$;
grant execute on function public.admin_loyalty_members() to authenticated;
