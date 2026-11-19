-- Ticari elektronik ileti rizasi: rıza kaydi (tarih, metin, kaynak), e-posta dogrulama (cift onay), ayrilma,
-- uyelikte ayri rıza kutusu ve hesabimdan tercih degistirme.

alter table public.subscribers
  add column if not exists confirmed_at timestamptz,
  add column if not exists consent_at timestamptz,
  add column if not exists consent_text text,
  add column if not exists confirm_sent_at timestamptz,
  add column if not exists unsubscribed_at timestamptz,
  add column if not exists last_sent_key text;

-- Eski kayitlarda rıza tarihi = kayit tarihi; dogrulama yapilmadigi icin bunlar tekrar onaylayana kadar gonderim listesine girmez.
update public.subscribers set consent_at = created_at where consent_at is null;

-- Bulten kaydi artik yalnizca sunucu rotasindan (service role) yapilir; tarayicidan dogrudan RPC kapatilir.
revoke execute on function public.subscribe_newsletter(text, text) from anon, authenticated;

-- Uyelik: ticari ileti kutusu isaretliyse rıza kaydi acilir; e-posta dogrulaninca onay tamamlanir.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_mail text := lower(trim(coalesce(new.email, '')));
begin
  insert into public.profiles (id, full_name, phone)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''), nullif(new.raw_user_meta_data ->> 'phone', ''));
  if v_mail <> '' and coalesce(new.raw_user_meta_data ->> 'marketing', '') = 'true' then
    insert into public.subscribers (email, source, consent, unsubscribed, consent_at, consent_text, confirmed_at)
    values (v_mail, 'uyelik', true, false, now(), 'Üyelik formu: ticari elektronik ileti onayı kutusu işaretlendi', case when new.email_confirmed_at is not null then now() end)
    on conflict (email) do update set
      consent = true, unsubscribed = false, unsubscribed_at = null,
      consent_at = now(), consent_text = excluded.consent_text, source = 'uyelik',
      confirmed_at = coalesce(public.subscribers.confirmed_at, excluded.confirmed_at);
  end if;
  return new;
end $$;
revoke all on function public.handle_new_user() from public, anon, authenticated;

create or replace function public.confirm_member_marketing() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.email_confirmed_at is not null and old.email_confirmed_at is null then
    update public.subscribers set confirmed_at = coalesce(confirmed_at, now())
    where email = lower(trim(coalesce(new.email, ''))) and source = 'uyelik' and consent and not unsubscribed;
  end if;
  return new;
end $$;
revoke all on function public.confirm_member_marketing() from public, anon, authenticated;
drop trigger if exists on_auth_user_confirmed on auth.users;
create trigger on_auth_user_confirmed after update of email_confirmed_at on auth.users
  for each row execute function public.confirm_member_marketing();

-- Hesabim: ticari ileti tercihi (giris yapmis ve e-postasi dogrulanmis uye)
create or replace function public.my_marketing_pref() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select s.confirmed_at is not null and s.consent and not s.unsubscribed
                   from public.subscribers s
                   where s.email = lower((select u.email from auth.users u where u.id = auth.uid()))), false)
$$;

create or replace function public.set_marketing_pref(p_on boolean) returns void
language plpgsql security definer set search_path = public as $$
declare v_mail text;
begin
  if auth.uid() is null then raise exception 'Giriş yapmalısın' using errcode = '42501'; end if;
  select lower(email) into v_mail from auth.users where id = auth.uid() and email_confirmed_at is not null;
  if v_mail is null then raise exception 'E-postanı doğrulaman gerekiyor' using errcode = '42501'; end if;
  if p_on then
    insert into public.subscribers (email, source, consent, unsubscribed, consent_at, consent_text, confirmed_at)
    values (v_mail, 'hesabim', true, false, now(), 'Hesabım: ticari elektronik ileti tercihi açıldı', now())
    on conflict (email) do update set consent = true, unsubscribed = false, unsubscribed_at = null,
      consent_at = now(), consent_text = excluded.consent_text, confirmed_at = now();
  else
    update public.subscribers set unsubscribed = true, unsubscribed_at = now() where email = v_mail;
  end if;
end $$;
revoke all on function public.my_marketing_pref() from public, anon;
revoke all on function public.set_marketing_pref(boolean) from public, anon;
grant execute on function public.my_marketing_pref() to authenticated;
grant execute on function public.set_marketing_pref(boolean) to authenticated;
