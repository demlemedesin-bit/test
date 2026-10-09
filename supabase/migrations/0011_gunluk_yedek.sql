-- Günlük yedek: kritik tablolar her gün 'backup' şemasına kopyalanır, 14 günden eskiler silinir.
-- Not: Aynı veritabanı içindedir; yanlış silme/güncelleme gibi insan hatalarına karşı korur.
-- Proje kaybına karşı Supabase Pro (otomatik yedek) ya da panelden CSV dışa aktarma gerekir.
create schema if not exists backup;
revoke all on schema backup from anon, authenticated;

create or replace function backup.run_daily() returns text
language plpgsql security definer set search_path = backup, public as $$
declare t text; stamp text := to_char(now() at time zone 'Europe/Istanbul', 'YYYYMMDD'); n int := 0; r record; cutoff text := to_char((now() - interval '14 days') at time zone 'Europe/Istanbul', 'YYYYMMDD');
begin
  foreach t in array array['orders','products','customer_meta','abandoned_carts','site_content','shop_settings','coupons','reviews','stock_alerts','returns','profiles','staff_roles'] loop
    if to_regclass('public.' || t) is not null then
      execute format('drop table if exists backup.%I', t || '_' || stamp);
      execute format('create table backup.%I as table public.%I', t || '_' || stamp, t);
      execute format('revoke all on backup.%I from anon, authenticated', t || '_' || stamp);
      n := n + 1;
    end if;
  end loop;
  for r in select tablename from pg_tables where schemaname = 'backup' and right(tablename, 8) ~ '^[0-9]{8}$' and right(tablename, 8) < cutoff loop
    execute format('drop table backup.%I', r.tablename);
  end loop;
  return n || ' tablo yedeklendi (' || stamp || ')';
end $$;
revoke all on function backup.run_daily() from public, anon, authenticated;

create extension if not exists pg_cron;
do $$ begin
  if exists (select 1 from cron.job where jobname = 'gunluk-yedek') then perform cron.unschedule('gunluk-yedek'); end if;
  perform cron.schedule('gunluk-yedek', '10 0 * * *', 'select backup.run_daily()');
end $$;
