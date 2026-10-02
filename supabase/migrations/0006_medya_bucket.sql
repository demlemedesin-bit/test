-- Medya sıkıştırma sonrası yüklemeler için bucket sınırlarını genişlet
update storage.buckets set file_size_limit = 10485760,
  allowed_mime_types = array['image/webp','image/png','image/jpeg','image/avif','image/gif']
where id = 'product-images';
