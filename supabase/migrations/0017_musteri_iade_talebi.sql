-- Müşteri iade/değişim talebi: müşteri sipariş no + e-posta ile talep açar, sebebini yazar;
-- talep panelde "İade ve değişim" listesine düşer, onay/ret ve iade muhasebede yürür.
alter table public.returns add column if not exists source text not null default 'panel';
alter table public.returns add column if not exists customer_note text;
alter table public.returns add column if not exists email text;

create or replace function public.request_return(p_order_no text, p_email text, p_items jsonb, p_kind text, p_reason text, p_note text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  o public.orders%rowtype;
  it jsonb; idx int; q int; line jsonb; taken int; made int := 0;
  v_kind text := case when p_kind = 'degisim' then 'degisim' else 'iade' end;
  v_reason text := case when p_reason in ('beden', 'kusurlu', 'yanlis', 'begenmedi', 'gec', 'diger') then p_reason else 'diger' end;
  v_note text := left(trim(coalesce(p_note, '')), 600);
begin
  select * into o from public.orders where order_no = upper(trim(p_order_no)) and email = lower(trim(p_email)) limit 1;
  if not found then return jsonb_build_object('ok', false, 'error', 'Sipariş bulunamadı.'); end if;
  if o.status not in ('kargoda', 'teslim_edildi') then
    return jsonb_build_object('ok', false, 'error', 'İade talebi, ürün kargoya verildikten sonra açılabilir.');
  end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    return jsonb_build_object('ok', false, 'error', 'En az bir ürün seç.');
  end if;
  if v_reason = 'diger' and length(v_note) < 5 then
    return jsonb_build_object('ok', false, 'error', 'Lütfen sebebi kısaca yaz.');
  end if;
  for it in select * from jsonb_array_elements(p_items) loop
    idx := coalesce((it ->> 'idx')::int, -1);
    q := coalesce((it ->> 'qty')::int, 0);
    line := o.items -> idx;
    if line is null or q < 1 then continue; end if;
    select coalesce(sum(qty), 0) into taken from public.returns
      where order_no = o.order_no and product_slug = coalesce(line ->> 'slug', '') and status <> 'red';
    if q > (line ->> 'qty')::int - taken then
      return jsonb_build_object('ok', false, 'error', 'Bu ürün için daha önce talep açılmış.');
    end if;
    insert into public.returns (order_no, product_slug, qty, amount, kind, reason, status, note, customer_note, source, email)
    values (o.order_no, coalesce(line ->> 'slug', ''), q, coalesce((line ->> 'unit_price')::numeric, 0) * q, v_kind, v_reason, 'talep',
            null, nullif(v_note, ''), 'musteri', o.email);
    made := made + 1;
  end loop;
  if made = 0 then return jsonb_build_object('ok', false, 'error', 'Talep oluşturulamadı.'); end if;
  return jsonb_build_object('ok', true, 'count', made);
end $$;
grant execute on function public.request_return(text, text, jsonb, text, text, text) to anon, authenticated;

create or replace function public.get_returns(p_order_no text, p_email text) returns jsonb
language sql security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object('product_slug', r.product_slug, 'qty', r.qty, 'kind', r.kind, 'reason', r.reason,
                           'status', r.status, 'customer_note', r.customer_note, 'created_at', r.created_at) order by r.created_at desc), '[]'::jsonb)
  from public.returns r join public.orders o on o.order_no = r.order_no
  where o.order_no = upper(trim(p_order_no)) and o.email = lower(trim(p_email));
$$;
grant execute on function public.get_returns(text, text) to anon, authenticated;
