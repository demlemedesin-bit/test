-- YouTube yönlendirme tıklamaları: track_events'e 'youtube_click' türü (content = tıklanan yer: menü / hero / alt bilgi).
alter table public.track_events drop constraint if exists track_events_type_check;
alter table public.track_events add constraint track_events_type_check check (type in ('view','click','add_to_cart','begin_checkout','order','rec_click','youtube_click'));
-- track_event(p jsonb) işlevi: izin verilen türler listesine 'youtube_click' eklendi (canlıda uygulandı; gövde 0003/0010 sürümüyle aynı).
