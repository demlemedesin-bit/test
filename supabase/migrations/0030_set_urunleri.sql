-- Kampanyalı set ürünleri: sepette set içeriği tamamlandığında otomatik set indirimi.
create table if not exists public.product_sets (
  slug text primary key,
  name text not null,
  subtitle text not null default '',
  price numeric(10,2) not null check (price > 0),
  slots jsonb not null default '[]'::jsonb,  -- [{label, slugs:[...], qty}]
  img text,
  active boolean not null default false,
  sort int not null default 0,
  created_at timestamptz not null default now()
);
alter table public.product_sets enable row level security;
drop policy if exists "aktif setler herkese açık" on public.product_sets;
create policy "aktif setler herkese açık" on public.product_sets for select to public using (active);
drop policy if exists "yönetici setleri görür" on public.product_sets;
create policy "yönetici setleri görür" on public.product_sets for select to authenticated using (public.has_perm('products'));
drop policy if exists "yönetici set ekler" on public.product_sets;
create policy "yönetici set ekler" on public.product_sets for insert to authenticated with check (public.has_perm('products'));
drop policy if exists "yönetici set günceller" on public.product_sets;
create policy "yönetici set günceller" on public.product_sets for update to authenticated using (public.has_perm('products')) with check (public.has_perm('products'));
drop policy if exists "yönetici set siler" on public.product_sets;
create policy "yönetici set siler" on public.product_sets for delete to authenticated using (public.has_perm('products'));

-- Sepet satırlarından ({slug, unit, qty}) uygulanabilir set indirimini hesaplar. Aktif set yoksa 0 döner.
create or replace function public.set_discount(p_lines jsonb) returns jsonb
language plpgsql stable security definer set search_path to 'public' as $$
declare
  u_slug text[] := '{}'; u_unit numeric[] := '{}'; u_used boolean[] := '{}';
  l jsonb; i int; q int; n int;
  s public.product_sets; sl jsonb; need int; got int; j int; k int;
  best_s text; best_name text; best_sav numeric; sav numeric; tot numeric; picked int[]; best_picked int[];
  total numeric := 0; names text[] := '{}'; guard int := 0; ok boolean; cand int; cur numeric; ci int;
begin
  if p_lines is null or jsonb_typeof(p_lines) <> 'array' then return jsonb_build_object('discount', 0, 'names', '[]'::jsonb); end if;
  if not exists (select 1 from public.product_sets where active) then return jsonb_build_object('discount', 0, 'names', '[]'::jsonb); end if;
  for l in select * from jsonb_array_elements(p_lines) loop
    q := greatest(1, coalesce((l ->> 'qty')::int, 1));
    for i in 1..q loop
      u_slug := u_slug || (l ->> 'slug'); u_unit := u_unit || coalesce((l ->> 'unit')::numeric, 0); u_used := u_used || false;
    end loop;
  end loop;
  n := coalesce(array_length(u_slug, 1), 0);
  if n = 0 then return jsonb_build_object('discount', 0, 'names', '[]'::jsonb); end if;
  loop
    guard := guard + 1; exit when guard > 12;
    best_s := null; best_sav := 0; best_picked := null;
    for s in select * from public.product_sets where active order by sort, slug loop
      picked := '{}'; ok := true; tot := 0;
      for sl in select * from jsonb_array_elements(s.slots) loop
        need := greatest(1, coalesce((sl ->> 'qty')::int, 1)); got := 0;
        while got < need loop
          cand := null; cur := null;
          for j in 1..n loop
            if not u_used[j] and not (j = any (picked)) and u_slug[j] in (select jsonb_array_elements_text(sl -> 'slugs')) then
              if cur is null or u_unit[j] < cur then cur := u_unit[j]; cand := j; end if;
            end if;
          end loop;
          if cand is null then ok := false; exit; end if;
          picked := picked || cand; tot := tot + cur; got := got + 1;
        end loop;
        exit when not ok;
      end loop;
      if ok and coalesce(array_length(picked, 1), 0) > 0 then
        sav := tot - s.price;
        if sav > best_sav then best_sav := sav; best_s := s.slug; best_name := s.name; best_picked := picked; end if;
      end if;
    end loop;
    exit when best_s is null;
    foreach ci in array best_picked loop u_used[ci] := true; end loop;
    total := total + best_sav; names := names || best_name;
  end loop;
  return jsonb_build_object('discount', total, 'names', to_jsonb(names));
end $$;
revoke all on function public.set_discount(jsonb) from public;
grant execute on function public.set_discount(jsonb) to anon, authenticated;
