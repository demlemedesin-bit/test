-- 0025: HepsiJET kargo entegrasyonu — siparişe bağlı gönderi kaydı.
-- Yazma yalnızca sunucudan (service_role); panel (orders yetkisi) yalnızca okur.
-- Ayarlar (firma kodu, adres, X-Dock...) shop_settings içinde is_public=false olarak tutulur; kullanıcı adı/şifre yalnızca ortam değişkenlerindedir.

create table if not exists public.hepsijet_shipments (
  order_no text primary key references public.orders (order_no) on delete cascade,
  barcode text not null unique,
  env text not null check (env in ('test', 'prod')),
  desi numeric(6, 2),
  parcels int not null default 1 check (parcels between 1 and 20),
  status text not null default 'olusturuldu' check (status in ('olusturuldu', 'silindi', 'geri_cagrildi')),
  last_status text,
  last_checked_at timestamptz,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.hepsijet_shipments enable row level security;

drop policy if exists hepsijet_okuma on public.hepsijet_shipments;
create policy hepsijet_okuma on public.hepsijet_shipments for select to authenticated using (public.has_perm('orders'));

revoke all on table public.hepsijet_shipments from anon, authenticated;
grant select on table public.hepsijet_shipments to authenticated;
grant select, insert, update, delete on table public.hepsijet_shipments to service_role;
