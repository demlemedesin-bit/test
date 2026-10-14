-- Müşteri tarafı hata kaydı (kişisel veri yok: yalnızca sayfa yolu, hata metni, tarih)
create table if not exists public.error_log (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  path text,
  message text not null
);
create index if not exists error_log_at on public.error_log (at desc);
alter table public.error_log enable row level security;
create policy "yonetici hata kaydini gorur" on public.error_log for select to authenticated using (public.is_admin());

create or replace function public.log_error(p_path text, p_message text)
returns void language plpgsql security definer set search_path to 'public' as $$
begin
  -- şişmeyi önle: saatte en fazla 100 kayıt, aynı hata saatte bir kez
  if (select count(*) from public.error_log where at > now() - interval '1 hour') >= 100 then return; end if;
  if exists (select 1 from public.error_log where at > now() - interval '1 hour' and message = left(coalesce(p_message, ''), 300) and path is not distinct from left(p_path, 200)) then return; end if;
  insert into public.error_log (path, message) values (left(p_path, 200), left(coalesce(nullif(p_message, ''), 'bilinmeyen hata'), 300));
end $$;
revoke all on function public.log_error(text, text) from public;
grant execute on function public.log_error(text, text) to anon, authenticated;
