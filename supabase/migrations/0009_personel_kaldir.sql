-- Personeli kaldırır: yetkileri sıfırlanır (satır silinmez), listeden düşer; yeniden eklenirse admin_set_staff aynı satırı günceller.
create or replace function public.admin_remove_staff(p_user uuid) returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Yetkisiz' using errcode = '42501'; end if;
  update public.staff_roles set perms = '{}'::text[] where user_id = p_user;
end $$;
revoke all on function public.admin_remove_staff(uuid) from public;
revoke execute on function public.admin_remove_staff(uuid) from anon;
grant execute on function public.admin_remove_staff(uuid) to authenticated;

create or replace function public.admin_staff() returns jsonb
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Yetkisiz' using errcode = '42501'; end if;
  return coalesce((select jsonb_agg(jsonb_build_object('id', s.user_id, 'email', au.email, 'name', coalesce(p.full_name, ''), 'role', s.role, 'perms', s.perms) order by s.created_at)
                   from public.staff_roles s join auth.users au on au.id = s.user_id left join public.profiles p on p.id = s.user_id
                   where cardinality(s.perms) > 0), '[]'::jsonb);
end $$;
