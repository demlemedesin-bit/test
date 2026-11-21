-- "2. ürüne %N indirim" kampanya türü (second_half). Otomatik ya da kodlu olabilir; Kampanyalar sayfasından açılıp kapatılır.
-- Fonksiyonlar canlı tanımlarından yamalanır; yama tutmazsa migration hata verir (yarım uygulanmaz).
alter table public.coupons drop constraint if exists coupons_kind_check;
alter table public.coupons add constraint coupons_kind_check check (kind in ('percent', 'fixed', 'free_shipping', 'second_half'));
alter table public.coupons drop constraint if exists coupons_check1;
alter table public.coupons add constraint coupons_check1 check (kind not in ('percent', 'second_half') or value <= 100);

do $m$
declare d text;
begin
  -- 1) kupon hesabı
  select pg_get_functiondef(oid) into d from pg_proc where pronamespace = 'public'::regnamespace and proname = 'coupon_discount';
  if d not like '%when ''fixed'' then least(c.value, elig)%else 0 end;%d := least(d, p_sub);%' then raise exception 'coupon_discount yamasi eslesmedi'; end if;
  d := replace(d, E'           when ''fixed'' then least(c.value, elig)\n           else 0 end;',
$r$           when 'fixed' then least(c.value, elig)
           when 'second_half' then coalesce((
             select sum(round(u.unit * c.value / 100, 2)) from (
               select (l ->> 'unit')::numeric as unit, row_number() over (order by (l ->> 'unit')::numeric desc) as rn
               from jsonb_array_elements(p_lines) l, generate_series(1, greatest(1, coalesce((l ->> 'qty')::int, 1))) g
               where coalesce(array_length(c.product_slugs, 1), 0) = 0 or l ->> 'slug' = any (c.product_slugs)) u
             where u.rn % 2 = 0), 0)
           else 0 end;
    if c.kind = 'second_half' and d <= 0 then
      if not c.auto then err := 'Bu kampanya için sepette en az 2 ürün olmalı'; end if;
      continue;
    end if;$r$);
  execute d;

  -- 2) sepet özeti: satırlara adet ve birim fiyat eklenir
  select pg_get_functiondef(oid) into d from pg_proc where pronamespace = 'public'::regnamespace and proname = 'quote_cart';
  if position($a$jsonb_build_object('slug', prod.slug, 'line_total', pr * qty)$a$ in d) = 0 then raise exception 'quote_cart yamasi eslesmedi'; end if;
  d := replace(d, $a$jsonb_build_object('slug', prod.slug, 'line_total', pr * qty)$a$, $b$jsonb_build_object('slug', prod.slug, 'line_total', pr * qty, 'qty', qty, 'unit', pr)$b$);
  execute d;

  -- 3) sipariş oluşturma: aynı satır bilgisi
  select pg_get_functiondef(oid) into d from pg_proc where pronamespace = 'public'::regnamespace and proname = 'create_order';
  if position($a$'line_total', (l ->> 'line_total')::numeric)) from jsonb_array_elements(lines) l$a$ in d) = 0 then raise exception 'create_order yamasi eslesmedi'; end if;
  d := replace(d, $a$'line_total', (l ->> 'line_total')::numeric)) from jsonb_array_elements(lines) l$a$, $b$'line_total', (l ->> 'line_total')::numeric, 'qty', (l ->> 'qty')::int, 'unit', (l ->> 'unit_price')::numeric)) from jsonb_array_elements(lines) l$b$);
  execute d;
end $m$;
