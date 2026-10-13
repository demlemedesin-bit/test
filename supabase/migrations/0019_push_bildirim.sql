-- Yönetici web push bildirimleri. Gizli anahtar (push_config.secret) bu dosyada YOK; ayrıca elle yazılır:
--   insert into public.push_config(id, secret, url) values (1, '<PUSH_SECRET>', 'https://<alan-adi>/api/push/siparis');
create extension if not exists pg_net with schema extensions;

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_id uuid references auth.users(id) on delete cascade,
  label text,
  created_at timestamptz not null default now(),
  last_ok_at timestamptz,
  last_error text
);
alter table public.push_subscriptions enable row level security;

create table if not exists public.push_sent (
  key text primary key,
  created_at timestamptz not null default now()
);
alter table public.push_sent enable row level security;

create table if not exists public.push_config (
  id int primary key default 1 check (id = 1),
  secret text not null,
  url text not null
);
alter table public.push_config enable row level security;

revoke all on public.push_subscriptions, public.push_sent, public.push_config from anon, authenticated;

create or replace function public.push_yeni_siparis() returns trigger
language plpgsql security definer set search_path = public, extensions as $$
declare c record;
begin
  if new.payment_method is distinct from 'kart' then
    select * into c from public.push_config where id = 1;
    if found then
      perform net.http_post(
        url := c.url,
        headers := jsonb_build_object('Content-Type', 'application/json', 'x-push-secret', c.secret),
        body := jsonb_build_object('order_no', new.order_no, 'event', 'yeni'),
        timeout_milliseconds := 8000
      );
    end if;
  end if;
  return new;
exception when others then
  return new;
end $$;
revoke all on function public.push_yeni_siparis() from public, anon, authenticated;

create trigger orders_push_yeni after insert on public.orders
  for each row execute function public.push_yeni_siparis();
