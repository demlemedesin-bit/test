-- Ayın demleyenleri anketi: ziyaretçiler favori fotoğrafa oy verir (tarayıcı başına 1 oy, değiştirilebilir).
create table if not exists public.demleyen_oylar (
  id uuid primary key default gen_random_uuid(),
  month text not null,
  voter text not null,
  photo text not null,
  ip_hash text not null default '',
  created_at timestamptz not null default now(),
  unique (month, voter)
);
alter table public.demleyen_oylar enable row level security;
drop policy if exists demleyen_oylar_admin on public.demleyen_oylar;
create policy demleyen_oylar_admin on public.demleyen_oylar for select using (public.has_perm('content'));

create or replace function public.demleyen_oy_ver(p_month text, p_voter text, p_photo text, p_ip text default '')
returns boolean language plpgsql security definer set search_path = public as $$
begin
  if coalesce(length(p_month),0) not between 1 and 40 or coalesce(length(p_voter),0) not between 8 and 64 or coalesce(length(p_photo),0) not between 1 and 80 then return false; end if;
  if coalesce(p_ip,'') <> '' and (select count(*) from public.demleyen_oylar where month = p_month and ip_hash = p_ip and voter <> p_voter) >= 5 then return false; end if;
  insert into public.demleyen_oylar (month, voter, photo, ip_hash) values (p_month, p_voter, p_photo, coalesce(p_ip,''))
  on conflict (month, voter) do update set photo = excluded.photo;
  return true;
end $$;
revoke all on function public.demleyen_oy_ver(text, text, text, text) from public, anon, authenticated;
grant execute on function public.demleyen_oy_ver(text, text, text, text) to anon, authenticated;

create or replace function public.demleyen_oy_sonuc(p_month text) returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_object_agg(photo, n), '{}'::jsonb) from (select photo, count(*)::int n from public.demleyen_oylar where month = p_month group by photo) t
$$;
revoke all on function public.demleyen_oy_sonuc(text) from public, anon, authenticated;
grant execute on function public.demleyen_oy_sonuc(text) to anon, authenticated;
