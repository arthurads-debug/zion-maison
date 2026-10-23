-- Supabase Storage managed schemas are supplied by the local/hosted platform.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values
 ('originals','originals',false,104857600,array['image/jpeg','image/png','image/webp','video/mp4','video/webm']),
 ('published','published',true,104857600,array['image/webp','video/mp4','video/webm'])
on conflict(id) do nothing;
-- All writes and original reads use scoped signed upload/download URLs issued by authenticated server endpoints.
-- No anon/authenticated object write policy is created. Service credentials never reach browsers.
