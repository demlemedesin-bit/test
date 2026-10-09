-- İade talebinde açıklama zorunlu; 14 günlük hak (tesliminden itibaren). Süre geçtiyse talep yine açılır ama "late" işaretlenir
-- ve panelde yönetici (Garen) onayına bağlı görünür.
alter table public.orders add column if not exists delivered_at timestamptz;
alter table public.returns add column if not exists late boolean not null default false;

create or replace function public.orders_set_delivered() returns trigger language plpgsql as $$
begin
  if new.status = 'teslim_edildi' and old.status is distinct from 'teslim_edildi' then
    new.delivered_at := coalesce(new.delivered_at, now());
  end if;
  return new;
end $$;
create or replace trigger orders_set_delivered before update on public.orders for each row execute function public.orders_set_delivered();

create or replace function public.request_return(p_order_no text, p_email text, p_items jsonb, p_kind text, p_reason text, p_note text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  o public.orders%rowtype;
  it jsonb; idx int; q int; line jsonb; taken int; made int := 0; v_late boolean;
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
  if length(v_note) < 5 then
    return jsonb_build_object('ok', false, 'error', 'İade sebebini yazman gerekiyor.');
  end if;
  v_late := now() > coalesce(o.delivered_at, o.shipped_at, o.created_at) + interval '14 days';
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
    insert into public.returns (order_no, product_slug, qty, amount, kind, reason, status, note, customer_note, source, email, late)
    values (o.order_no, coalesce(line ->> 'slug', ''), q, coalesce((line ->> 'unit_price')::numeric, 0) * q, v_kind, v_reason, 'talep',
            null, v_note, 'musteri', o.email, v_late);
    made := made + 1;
  end loop;
  if made = 0 then return jsonb_build_object('ok', false, 'error', 'Talep oluşturulamadı.'); end if;
  return jsonb_build_object('ok', true, 'count', made, 'late', v_late);
end $$;

create or replace function public.get_return_status(p_order_no text, p_email text) returns jsonb
language sql security definer set search_path = public as $$
  select jsonb_build_object(
    'late', now() > coalesce(o.delivered_at, o.shipped_at, o.created_at) + interval '14 days',
    'deadline', coalesce(o.delivered_at, o.shipped_at, o.created_at) + interval '14 days',
    'items', coalesce((select jsonb_agg(jsonb_build_object('product_slug', r.product_slug, 'qty', r.qty, 'kind', r.kind, 'reason', r.reason,
                           'status', r.status, 'late', r.late, 'created_at', r.created_at) order by r.created_at desc)
                       from public.returns r where r.order_no = o.order_no), '[]'::jsonb))
  from public.orders o
  where o.order_no = upper(trim(p_order_no)) and o.email = lower(trim(p_email))
  limit 1;
$$;
grant execute on function public.get_return_status(text, text) to anon, authenticated;
