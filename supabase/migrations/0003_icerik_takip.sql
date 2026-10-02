-- 0003: site içeriği (panelden düzenlenir) + UTM / kısa link takibi

-- ── 1. İçerik ─────────────────────────────────────────────────────────
create table if not exists public.site_content (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
alter table public.site_content enable row level security;
create policy site_content_read on public.site_content for select using (true);
create policy site_content_admin on public.site_content for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
grant select on public.site_content to anon, authenticated;
grant insert, update, delete on public.site_content to authenticated;

-- ── 2. Takip linkleri ─────────────────────────────────────────────────
create table if not exists public.track_links (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[a-z0-9-]{2,40}$'),
  name text not null,
  dest text not null default '/',
  utm_source text not null default '',
  utm_medium text not null default '',
  utm_campaign text not null default '',
  utm_term text not null default '',
  utm_content text not null default '',
  active boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.track_links enable row level security;
create policy track_links_read on public.track_links for select using (active or public.is_admin());
create policy track_links_admin on public.track_links for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
grant select on public.track_links to anon, authenticated;
grant insert, update, delete on public.track_links to authenticated;

-- ── 3. Olaylar ────────────────────────────────────────────────────────
create table if not exists public.track_events (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  sid text not null,
  type text not null check (type in ('view', 'click', 'add_to_cart', 'order')),
  link_code text,
  source text, medium text, campaign text, term text, content text,
  path text, referrer text, order_no text,
  value numeric(10, 2)
);
create index if not exists track_events_created on public.track_events (created_at desc);
create index if not exists track_events_camp on public.track_events (campaign, type);
alter table public.track_events enable row level security;
create policy track_events_admin on public.track_events for select to authenticated using (public.is_admin());
revoke all on public.track_events from anon, authenticated;
grant select on public.track_events to authenticated;

create or replace function public.track_event(p jsonb)
returns void language plpgsql security definer set search_path = public as $$
declare
  t text := p ->> 'type';
  s text := left(coalesce(p ->> 'sid', ''), 40);
  v numeric(10, 2);
  ono text := left(coalesce(p ->> 'order_no', ''), 40);
begin
  if t not in ('view', 'click', 'add_to_cart', 'order') or s = '' then return; end if;
  if (select count(*) from track_events where sid = s and created_at > now() - interval '1 hour') > 300 then return; end if;
  if t = 'order' then
    select total into v from orders where order_no = ono and created_at > now() - interval '3 hours';
    if v is null then return; end if;
    if exists (select 1 from track_events where type = 'order' and order_no = ono) then return; end if;
  end if;
  insert into track_events (sid, type, link_code, source, medium, campaign, term, content, path, referrer, order_no, value)
  values (s, t, nullif(left(p ->> 'link_code', 40), ''), nullif(left(p ->> 'source', 80), ''), nullif(left(p ->> 'medium', 80), ''),
          nullif(left(p ->> 'campaign', 120), ''), nullif(left(p ->> 'term', 120), ''), nullif(left(p ->> 'content', 120), ''),
          left(p ->> 'path', 200), left(p ->> 'referrer', 200), nullif(ono, ''), v);
end $$;
revoke all on function public.track_event(jsonb) from public;
grant execute on function public.track_event(jsonb) to anon, authenticated;

create or replace function public.track_report(p_from timestamptz, p_to timestamptz)
returns jsonb language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'yetkisiz' using errcode = '42501'; end if;
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
