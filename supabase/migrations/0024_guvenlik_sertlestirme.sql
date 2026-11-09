-- Guvenlik sertlestirme (tam denetim sonrasi)
-- 1) Bulten: abonelikten cikmis kisiyi baskasi yeniden abone edemez; saatlik toplu giris siniri
create or replace function public.subscribe_newsletter(p_email text, p_source text default 'site')
returns void language plpgsql security definer set search_path to 'public' as $$
declare v_email text := lower(trim(coalesce(p_email, '')));
begin
  if v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' or length(v_email) > 120 then raise exception 'Geçerli bir e-posta gir' using errcode = '22023'; end if;
  if (select count(*) from public.subscribers where created_at > now() - interval '1 hour') > 200 then
    raise exception 'Şu an çok fazla kayıt var, biraz sonra tekrar dene' using errcode = '53400';
  end if;
  insert into public.subscribers (email, source) values (v_email, left(coalesce(p_source, 'site'), 40))
  on conflict (email) do nothing;
end $$;

-- 2) Yorum: saatlik toplu giris siniri (onaysiz yorum yigilmasin)
create or replace function public.submit_review(p_slug text, p_name text, p_email text, p_rating integer, p_title text, p_body text)
returns text language plpgsql security definer set search_path to 'public' as $$
declare v_email text := lower(trim(coalesce(p_email, ''))); v_ver boolean;
begin
  if v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'Geçerli bir e-posta gir' using errcode = '22023'; end if;
  if char_length(trim(coalesce(p_name, ''))) < 2 then raise exception 'Adını yaz' using errcode = '22023'; end if;
  if p_rating is null or p_rating < 1 or p_rating > 5 then raise exception 'Puan 1-5 arası olmalı' using errcode = '22023'; end if;
  if char_length(coalesce(p_body, '')) < 5 then raise exception 'Yorumunu biraz daha ayrıntılı yaz' using errcode = '22023'; end if;
  if not exists (select 1 from public.products where slug = p_slug and active) then raise exception 'Ürün bulunamadı' using errcode = '22023'; end if;
  if (select count(*) from public.reviews where created_at > now() - interval '1 hour') > 60 then
    raise exception 'Şu an çok fazla yorum var, biraz sonra tekrar dene' using errcode = '53400';
  end if;
  v_ver := exists (select 1 from public.orders o, jsonb_array_elements(o.items) it where o.email = v_email and o.status <> 'iptal' and it ->> 'slug' = p_slug);
  insert into public.reviews (product_slug, name, email, rating, title, body, verified)
  values (p_slug, left(trim(p_name), 60), v_email, p_rating, left(trim(coalesce(p_title, '')), 120), left(trim(p_body), 2000), v_ver)
  on conflict (product_slug, email) do nothing;
  if not found then return 'var'; end if;
  return 'ok';
end $$;

-- 3) Stok bildirimi: saatlik toplu giris siniri
create or replace function public.subscribe_stock(p_email text, p_slug text)
returns void language plpgsql security definer set search_path to 'public' as $$
declare v_email text := lower(trim(coalesce(p_email, '')));
begin
  if v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' or length(v_email) > 120 then raise exception 'Geçerli bir e-posta gir' using errcode = '22023'; end if;
  if not exists (select 1 from public.products where slug = p_slug) then raise exception 'Ürün bulunamadı' using errcode = '22023'; end if;
  if (select count(*) from public.stock_alerts where created_at > now() - interval '1 hour') > 200 then
    raise exception 'Şu an çok fazla istek var, biraz sonra tekrar dene' using errcode = '53400';
  end if;
  insert into public.stock_alerts (email, product_slug) values (v_email, p_slug)
  on conflict (email, product_slug) do update set notified_at = null;
end $$;
