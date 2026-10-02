-- Terk edilen sepet toplamı ve satır fiyatı süreli kampanya fiyatını (eff_price) kullanır.
create or replace function public.save_cart(p_email text, p_items jsonb) returns void
language plpgsql security definer set search_path to 'public' as $$
declare v_email text := lower(trim(coalesce(p_email, ''))); it jsonb; prod public.products%rowtype; qty int; norm jsonb := '[]'::jsonb; tot numeric(10, 2) := 0; pr numeric;
begin
  if v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' or length(v_email) > 120 then return; end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    delete from public.abandoned_carts where email = v_email; return;
  end if;
  if jsonb_array_length(p_items) > 30 then return; end if;
  for it in select * from jsonb_array_elements(p_items) loop
    select * into prod from public.products where slug = it ->> 'slug' and active;
    if not found then continue; end if;
    qty := greatest(1, least(9, coalesce((it ->> 'qty')::int, 1)));
    pr := public.eff_price(prod);
    tot := tot + pr * qty;
    norm := norm || jsonb_build_array(jsonb_build_object('slug', prod.slug, 'name', prod.name, 'qty', qty, 'color', it ->> 'color', 'size', it ->> 'size', 'price', pr));
  end loop;
  if jsonb_array_length(norm) = 0 then return; end if;
  insert into public.abandoned_carts (email, user_id, items, total) values (v_email, auth.uid(), norm, tot)
  on conflict (email) do update set items = excluded.items, total = excluded.total, user_id = coalesce(excluded.user_id, public.abandoned_carts.user_id), updated_at = now();
end $$;
