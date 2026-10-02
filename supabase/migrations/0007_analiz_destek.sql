-- 0007: ürün/öneri bazlı olaylar, iade kayıtları, destek talepleri, birlikte alınanlar

-- ── 1. Olaylar: ürün + öneri kaynağı, yeni olay türleri ───────────────
alter table public.track_events add column if not exists product text;
alter table public.track_events add column if not exists rec text;
alter table public.track_events drop constraint if exists track_events_type_check;
alter table public.track_events add constraint track_events_type_check check (type in ('view', 'click', 'add_to_cart', 'begin_checkout', 'order', 'rec_click'));
create index if not exists track_events_product on public.track_events (product, type) where product is not null;

create or replace function public.track_event(p jsonb)
returns void language plpgsql security definer set search_path = public as $$
declare
  t text := p ->> 'type';
  s text := left(coalesce(p ->> 'sid', ''), 40);
  v numeric(10, 2);
  ono text := left(coalesce(p ->> 'order_no', ''), 40);
begin
  if t not in ('view', 'click', 'add_to_cart', 'begin_checkout', 'order', 'rec_click') or s = '' then return; end if;
  if (select count(*) from track_events where sid = s and created_at > now() - interval '1 hour') > 300 then return; end if;
  if t = 'order' then
    select total into v from orders where order_no = ono and created_at > now() - interval '3 hours';
    if v is null then return; end if;
    if exists (select 1 from track_events where type = 'order' and order_no = ono) then return; end if;
  end if;
  insert into track_events (sid, type, link_code, source, medium, campaign, term, content, path, referrer, order_no, value, product, rec)
  values (s, t, nullif(left(p ->> 'link_code', 40), ''), nullif(left(p ->> 'source', 80), ''), nullif(left(p ->> 'medium', 80), ''),
          nullif(left(p ->> 'campaign', 120), ''), nullif(left(p ->> 'term', 120), ''), nullif(left(p ->> 'content', 120), ''),
          left(p ->> 'path', 200), left(p ->> 'referrer', 200), nullif(ono, ''), v,
          nullif(left(p ->> 'product', 80), ''), nullif(left(p ->> 'rec', 30), ''));
end $$;

-- ── 2. İade / değişim kayıtları ───────────────────────────────────────
create table if not exists public.returns (
  id uuid primary key default gen_random_uuid(),
  order_no text not null,
  product_slug text not null default '',
  qty int not null default 1 check (qty > 0),
  amount numeric(10, 2) not null default 0 check (amount >= 0),
  kind text not null default 'iade' check (kind in ('iade', 'degisim')),
  reason text not null default 'diger',
  status text not null default 'talep' check (status in ('talep', 'onaylandi', 'teslim_alindi', 'hasarli', 'tamamlandi', 'red')),
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists returns_order on public.returns (order_no);
alter table public.returns enable row level security;
create policy returns_staff on public.returns for all to authenticated
  using (public.has_perm('orders') or public.has_perm('warehouse') or public.has_perm('accounting') or public.has_perm('support'))
  with check (public.has_perm('orders') or public.has_perm('warehouse') or public.has_perm('accounting') or public.has_perm('support'));
grant select, insert, update on public.returns to authenticated;
revoke all on public.returns from anon;

-- ── 3. Destek talepleri ───────────────────────────────────────────────
create table if not exists public.tickets (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  name text not null default '',
  order_no text,
  category text not null default 'genel' check (category in ('siparis', 'kargo', 'iade', 'degisim', 'urun', 'odeme', 'sikayet', 'genel')),
  subject text not null default '',
  body text not null default '',
  status text not null default 'acik' check (status in ('acik', 'beklemede', 'cozuldu')),
  reply text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.tickets enable row level security;
create policy tickets_staff on public.tickets for all to authenticated
  using (public.has_perm('support') or public.has_perm('customers')) with check (public.has_perm('support') or public.has_perm('customers'));
grant select, insert, update on public.tickets to authenticated;
revoke all on public.tickets from anon;

-- ── 4. "Bununla birlikte alınanlar" (anon okuyabilir, yalnızca slug listesi) ─
create or replace function public.co_purchased(p_slug text, p_limit int default 4)
returns text[] language sql stable security definer set search_path = public as $$
  select coalesce(array_agg(s order by n desc), '{}') from (
    select i ->> 'slug' as s, count(*) as n
    from public.orders o, jsonb_array_elements(o.items) i
    where o.status <> 'iptal' and o.created_at > now() - interval '365 days'
      and exists (select 1 from jsonb_array_elements(o.items) x where x ->> 'slug' = p_slug)
      and i ->> 'slug' <> p_slug
    group by 1 order by 2 desc limit greatest(1, least(p_limit, 8))
  ) q;
$$;
revoke all on function public.co_purchased(text, int) from public;
grant execute on function public.co_purchased(text, int) to anon, authenticated;
