-- Create the game_images storage bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public, avif_autodetection, file_size_limit, allowed_mime_types, owner)
VALUES 
  ('game_images', 'game_images', false, false, 50000000, -- 50MB limit
   ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp']::text[],
   NULL)
ON CONFLICT (id) DO NOTHING;

create policy "Enable delete access for authenticated users"
on "storage"."objects"
as permissive
for delete
to public
using (((bucket_id = 'game_images'::text) AND (auth.role() = 'authenticated'::text) AND ((storage.foldername(name))[1] = ('user.'::text || auth.uid()))));


create policy "Enable insert access for authenticated users"
on "storage"."objects"
as permissive
for insert
to public
with check (((bucket_id = 'game_images'::text) AND (auth.role() = 'authenticated'::text) AND ((storage.foldername(name))[1] = ('user.'::text || auth.uid()))));


create policy "Enable read access for authenticated users"
on "storage"."objects"
as permissive
for select
to public
using (((bucket_id = 'game_images'::text) AND (auth.role() = 'authenticated'::text) AND ((storage.foldername(name))[1] = ('user.'::text || auth.uid()))));


create policy "Enable update access for authenticated users"
on "storage"."objects"
as permissive
for update
to public
using (((bucket_id = 'game_images'::text) AND (auth.role() = 'authenticated'::text) AND ((storage.foldername(name))[1] = ('user.'::text || auth.uid()))));



