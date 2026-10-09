-- Konuk reels videoları: public bucket (en çok 50 MB; mp4/webm/mov), yükleme/silme yalnızca yönetici.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('reels-videos', 'reels-videos', true, 52428800, array['video/mp4','video/webm','video/quicktime'])
on conflict (id) do nothing;
create policy "reels videoları herkese açık" on storage.objects for select using (bucket_id = 'reels-videos');
create policy "yönetici reels video yükler" on storage.objects for insert to authenticated with check (bucket_id = 'reels-videos' and public.is_admin());
create policy "yönetici reels video günceller" on storage.objects for update to authenticated using (bucket_id = 'reels-videos' and public.is_admin());
create policy "yönetici reels video siler" on storage.objects for delete to authenticated using (bucket_id = 'reels-videos' and public.is_admin());
