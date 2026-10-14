-- Yönetici: ödenmemiş (ödeme bekleyen) ya da iptal edilmiş siparişi siler.
-- Mail / SMS göndermez; uygulama kodu çağrılmaz. Ödeme bekleyen siparişin stoğu geri eklenir.
create or replace function public.delete_order(p_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare o public.orders%rowtype; it jsonb;
begin
  if auth.uid() is null or not public.has_perm('orders') then
    raise exception 'yetkin yok';
  end if;
  select * into o from public.orders where id = p_id;
  if not found then raise exception 'sipariş bulunamadı'; end if;
  if o.status not in ('odeme_bekleniyor', 'iptal') then
    raise exception 'yalnızca ödeme bekleyen veya iptal edilmiş sipariş silinebilir';
  end if;
  if o.status = 'odeme_bekleniyor' then
    for it in select * from jsonb_array_elements(o.items) loop
      update public.products set stock = stock + (it ->> 'qty')::int where slug = it ->> 'slug' and stock is not null;
    end loop;
  end if;
  delete from public.coupon_redemptions where order_no = o.order_no;
  delete from public.payments where order_no = o.order_no;
  delete from public.orders where id = p_id;
  insert into public.audit_log (user_id, email, action, entity, entity_id, detail)
  values (auth.uid(), (select email from auth.users where id = auth.uid()), 'delete', 'orders', o.order_no, jsonb_build_object('ad', o.order_no, 'durum', o.status));
  return o.order_no;
end $$;

revoke all on function public.delete_order(uuid) from public, anon;
grant execute on function public.delete_order(uuid) to authenticated;
