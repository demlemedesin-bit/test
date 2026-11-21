-- Desi tabanlı kargo: ürün desisi (products.data.desi, boşsa 1) x adet toplanır, kademe tablosundan ücret bulunur.
-- Tablo shop_settings 'shipping_desi_tiers' anahtarında, her satır "üst_desi=ücret" (KDV dahil). Tablo yoksa eski sabit ücret kullanılır.
-- 40 desiyi aşan sepet 40'lık parçalara bölünür; her parça kendi kademesinden ücretlenir.
insert into public.shop_settings (key, value, is_public) values ('shipping_desi_tiers', E'4=96.80\n10=126.13\n20=183.33\n30=262.53\n40=366.66', true)
on conflict (key) do nothing;

create or replace function public.cart_desi(p_lines jsonb) returns numeric
language sql stable security definer set search_path = public as $$
  select coalesce(sum(greatest(1, coalesce(case when p.data ->> 'desi' ~ '^[0-9]+([.,][0-9]+)?$' then replace(p.data ->> 'desi', ',', '.')::numeric end, 1)) * greatest(1, coalesce((l ->> 'qty')::int, 1))), 0)
  from jsonb_array_elements(coalesce(p_lines, '[]'::jsonb)) l join public.products p on p.slug = l ->> 'slug'
$$;

create or replace function public.ship_fee(p_desi numeric, p_fallback numeric) returns numeric
language plpgsql stable security definer set search_path = public as $$
declare txt text; top numeric; top_pr numeric; n int; rest numeric; part numeric;
begin
  select value into txt from public.shop_settings where key = 'shipping_desi_tiers';
  if txt is null or coalesce(p_desi, 0) <= 0 then return p_fallback; end if;
  select max(mx) into top from public.shipping_tiers_parse(txt);
  if top is null then return p_fallback; end if;
  select pr into top_pr from public.shipping_tiers_parse(txt) where mx = top limit 1;
  n := ceil(p_desi / top);
  rest := p_desi - (n - 1) * top;
  select pr into part from public.shipping_tiers_parse(txt) where mx >= rest order by mx limit 1;
  return round((n - 1) * top_pr + coalesce(part, top_pr), 2);
end $$;

create or replace function public.shipping_tiers_parse(txt text) returns table (mx numeric, pr numeric)
language sql immutable as $$
  select btrim(split_part(x, '=', 1))::numeric, replace(btrim(split_part(x, '=', 2)), ',', '.')::numeric
  from regexp_split_to_table(txt, E'[\n\r]+') x
  where x ~ '^\s*[0-9]+([.,][0-9]+)?\s*=\s*[0-9]+([.,][0-9]+)?\s*$'
$$;

do $m$
declare d text; k int;
begin
  for k in 1..2 loop
    select pg_get_functiondef(oid) into d from pg_proc where pronamespace = 'public'::regnamespace and proname = case k when 1 then 'quote_cart' else 'create_order' end;
    if (length(d) - length(replace(d, 'else coalesce(fee, 0) end;', ''))) / length('else coalesce(fee, 0) end;') <> 1 then raise exception 'kargo yamasi eslesmedi (%)', k; end if;
    d := replace(d, 'else coalesce(fee, 0) end;', 'else public.ship_fee(public.cart_desi(lines), coalesce(fee, 0)) end;');
    execute d;
  end loop;
end $m$;
