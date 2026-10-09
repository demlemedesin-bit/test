-- Kapıda ödeme kaldırıldı: yeni siparişlerde yalnızca havale/EFT ve kart kabul edilir.
-- Eski siparişlerdeki 'kapida' değeri geçmiş kayıt olarak kalır (orders check kısıtı değişmedi).
do $$ declare d text;
begin
  d := pg_get_functiondef('public.create_order(jsonb,jsonb,text,text)'::regprocedure);
  d := replace(d, '(''havale'', ''kapida'', ''kart'')', '(''havale'', ''kart'')');
  execute d;
end $$;
