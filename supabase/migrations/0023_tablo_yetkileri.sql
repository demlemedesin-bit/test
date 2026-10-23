-- error_log ve demleyen_oylar: anon doğrudan tablo yetkisi gerekmez (yazma/okuma RPC ile yapılır), panel yalnızca okur.
-- Not: 30 Ekim 2026'dan sonra public şemasında açılan yeni tablolara Veri API yetkisi otomatik verilmez;
-- yeni her tablo için ilgili migration'a açık GRANT yazılmalı (anon: gerekiyorsa SELECT, authenticated, service_role).
revoke all on table public.error_log from anon, authenticated;
grant select on table public.error_log to authenticated;
grant select, insert, update on table public.error_log to service_role;

revoke all on table public.demleyen_oylar from anon, authenticated;
grant select on table public.demleyen_oylar to authenticated;
grant select, insert, update on table public.demleyen_oylar to service_role;
