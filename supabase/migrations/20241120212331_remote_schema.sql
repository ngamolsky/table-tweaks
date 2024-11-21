drop policy "Allow authenticated access to game images" on "storage"."objects";

drop policy "Allow authenticated uploads to game images" on "storage"."objects";

drop policy "Users can upload to their own folders" on "storage"."objects";

drop policy "Users can view their own uploads" on "storage"."objects";

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



