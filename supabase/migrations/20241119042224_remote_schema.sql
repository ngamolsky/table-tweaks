create policy "Allow authenticated access to game images"
on "storage"."objects"
as permissive
for select
to public
using (((bucket_id = 'game-images'::text) AND (auth.role() = 'authenticated'::text)));


create policy "Allow authenticated uploads to game images"
on "storage"."objects"
as permissive
for insert
to public
with check (((bucket_id = 'game-images'::text) AND (auth.role() = 'authenticated'::text)));


create policy "Users can upload to their own folders"
on "storage"."objects"
as permissive
for insert
to authenticated
with check (((bucket_id = 'game-images'::text) AND ((name ~~ (auth.uid() || '/%'::text)) OR (name ~~ (auth.uid() || '/%/%'::text)))));


create policy "Users can view their own uploads"
on "storage"."objects"
as permissive
for select
to authenticated
using (((bucket_id = 'game-images'::text) AND ((name ~~ (auth.uid() || '/%'::text)) OR (name ~~ (auth.uid() || '/%/%'::text)))));



