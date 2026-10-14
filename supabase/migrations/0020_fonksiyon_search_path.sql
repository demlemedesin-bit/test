-- Güvenlik: tetikleyici fonksiyonlarda search_path sabitlenir.
alter function public.orders_before_update() set search_path = public;
alter function public.orders_set_delivered() set search_path = public;
alter function public.touch_updated_at() set search_path = public;
