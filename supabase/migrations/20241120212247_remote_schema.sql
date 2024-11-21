drop policy "Allow authenticated insert access" on "public"."exemplar_images";

drop policy "Allow authenticated read access" on "public"."exemplar_images";

drop policy "Allow authenticated insert access" on "public"."games";

drop policy "Allow authenticated read access" on "public"."games";

drop policy "Allow authenticated insert access" on "public"."instruction_images";

drop policy "Allow authenticated read access" on "public"."instruction_images";

revoke delete on table "public"."exemplar_images" from "anon";

revoke insert on table "public"."exemplar_images" from "anon";

revoke references on table "public"."exemplar_images" from "anon";

revoke select on table "public"."exemplar_images" from "anon";

revoke trigger on table "public"."exemplar_images" from "anon";

revoke truncate on table "public"."exemplar_images" from "anon";

revoke update on table "public"."exemplar_images" from "anon";

revoke delete on table "public"."exemplar_images" from "authenticated";

revoke insert on table "public"."exemplar_images" from "authenticated";

revoke references on table "public"."exemplar_images" from "authenticated";

revoke select on table "public"."exemplar_images" from "authenticated";

revoke trigger on table "public"."exemplar_images" from "authenticated";

revoke truncate on table "public"."exemplar_images" from "authenticated";

revoke update on table "public"."exemplar_images" from "authenticated";

revoke delete on table "public"."exemplar_images" from "service_role";

revoke insert on table "public"."exemplar_images" from "service_role";

revoke references on table "public"."exemplar_images" from "service_role";

revoke select on table "public"."exemplar_images" from "service_role";

revoke trigger on table "public"."exemplar_images" from "service_role";

revoke truncate on table "public"."exemplar_images" from "service_role";

revoke update on table "public"."exemplar_images" from "service_role";

revoke delete on table "public"."instruction_images" from "anon";

revoke insert on table "public"."instruction_images" from "anon";

revoke references on table "public"."instruction_images" from "anon";

revoke select on table "public"."instruction_images" from "anon";

revoke trigger on table "public"."instruction_images" from "anon";

revoke truncate on table "public"."instruction_images" from "anon";

revoke update on table "public"."instruction_images" from "anon";

revoke delete on table "public"."instruction_images" from "authenticated";

revoke insert on table "public"."instruction_images" from "authenticated";

revoke references on table "public"."instruction_images" from "authenticated";

revoke select on table "public"."instruction_images" from "authenticated";

revoke trigger on table "public"."instruction_images" from "authenticated";

revoke truncate on table "public"."instruction_images" from "authenticated";

revoke update on table "public"."instruction_images" from "authenticated";

revoke delete on table "public"."instruction_images" from "service_role";

revoke insert on table "public"."instruction_images" from "service_role";

revoke references on table "public"."instruction_images" from "service_role";

revoke select on table "public"."instruction_images" from "service_role";

revoke trigger on table "public"."instruction_images" from "service_role";

revoke truncate on table "public"."instruction_images" from "service_role";

revoke update on table "public"."instruction_images" from "service_role";

alter table "public"."exemplar_images" drop constraint "exemplar_images_game_id_fkey";

alter table "public"."instruction_images" drop constraint "instruction_images_game_id_fkey";

alter table "public"."exemplar_images" drop constraint "exemplar_images_pkey";

alter table "public"."instruction_images" drop constraint "instruction_images_pkey";

drop index if exists "public"."exemplar_images_pkey";

drop index if exists "public"."instruction_images_pkey";

drop table "public"."exemplar_images";

drop table "public"."instruction_images";

create table "public"."example_images" (
    "id" uuid not null default gen_random_uuid(),
    "game_id" uuid not null,
    "image_path" text not null,
    "created_at" timestamp with time zone not null default timezone('utc'::text, now()),
    "updated_at" timestamp with time zone not null default timezone('utc'::text, now())
);


alter table "public"."example_images" enable row level security;

create table "public"."rules_images" (
    "id" uuid not null default gen_random_uuid(),
    "game_id" uuid not null,
    "image_path" text not null,
    "display_order" integer not null,
    "created_at" timestamp with time zone not null default timezone('utc'::text, now()),
    "updated_at" timestamp with time zone not null default timezone('utc'::text, now())
);


alter table "public"."rules_images" enable row level security;

alter table "public"."games" add column "user_id" uuid;

CREATE UNIQUE INDEX exemplar_images_pkey ON public.example_images USING btree (id);

CREATE UNIQUE INDEX instruction_images_pkey ON public.rules_images USING btree (id);

alter table "public"."example_images" add constraint "exemplar_images_pkey" PRIMARY KEY using index "exemplar_images_pkey";

alter table "public"."rules_images" add constraint "instruction_images_pkey" PRIMARY KEY using index "instruction_images_pkey";

alter table "public"."example_images" add constraint "exemplar_images_game_id_fkey" FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE not valid;

alter table "public"."example_images" validate constraint "exemplar_images_game_id_fkey";

alter table "public"."games" add constraint "games_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) not valid;

alter table "public"."games" validate constraint "games_user_id_fkey";

alter table "public"."rules_images" add constraint "instruction_images_game_id_fkey" FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE not valid;

alter table "public"."rules_images" validate constraint "instruction_images_game_id_fkey";

grant delete on table "public"."example_images" to "anon";

grant insert on table "public"."example_images" to "anon";

grant references on table "public"."example_images" to "anon";

grant select on table "public"."example_images" to "anon";

grant trigger on table "public"."example_images" to "anon";

grant truncate on table "public"."example_images" to "anon";

grant update on table "public"."example_images" to "anon";

grant delete on table "public"."example_images" to "authenticated";

grant insert on table "public"."example_images" to "authenticated";

grant references on table "public"."example_images" to "authenticated";

grant select on table "public"."example_images" to "authenticated";

grant trigger on table "public"."example_images" to "authenticated";

grant truncate on table "public"."example_images" to "authenticated";

grant update on table "public"."example_images" to "authenticated";

grant delete on table "public"."example_images" to "service_role";

grant insert on table "public"."example_images" to "service_role";

grant references on table "public"."example_images" to "service_role";

grant select on table "public"."example_images" to "service_role";

grant trigger on table "public"."example_images" to "service_role";

grant truncate on table "public"."example_images" to "service_role";

grant update on table "public"."example_images" to "service_role";

grant delete on table "public"."rules_images" to "anon";

grant insert on table "public"."rules_images" to "anon";

grant references on table "public"."rules_images" to "anon";

grant select on table "public"."rules_images" to "anon";

grant trigger on table "public"."rules_images" to "anon";

grant truncate on table "public"."rules_images" to "anon";

grant update on table "public"."rules_images" to "anon";

grant delete on table "public"."rules_images" to "authenticated";

grant insert on table "public"."rules_images" to "authenticated";

grant references on table "public"."rules_images" to "authenticated";

grant select on table "public"."rules_images" to "authenticated";

grant trigger on table "public"."rules_images" to "authenticated";

grant truncate on table "public"."rules_images" to "authenticated";

grant update on table "public"."rules_images" to "authenticated";

grant delete on table "public"."rules_images" to "service_role";

grant insert on table "public"."rules_images" to "service_role";

grant references on table "public"."rules_images" to "service_role";

grant select on table "public"."rules_images" to "service_role";

grant trigger on table "public"."rules_images" to "service_role";

grant truncate on table "public"."rules_images" to "service_role";

grant update on table "public"."rules_images" to "service_role";

create policy "Users can delete their own example images"
on "public"."example_images"
as permissive
for delete
to public
using ((auth.uid() = ( SELECT games.user_id
   FROM games
  WHERE (games.id = example_images.game_id))));


create policy "Users can insert their own example images"
on "public"."example_images"
as permissive
for insert
to public
with check ((auth.uid() = ( SELECT games.user_id
   FROM games
  WHERE (games.id = example_images.game_id))));


create policy "Users can read their own example images"
on "public"."example_images"
as permissive
for select
to public
using ((auth.uid() = ( SELECT games.user_id
   FROM games
  WHERE (games.id = example_images.game_id))));


create policy "Users can update their own example images"
on "public"."example_images"
as permissive
for update
to public
using ((auth.uid() = ( SELECT games.user_id
   FROM games
  WHERE (games.id = example_images.game_id))));


create policy "Users can delete their own games"
on "public"."games"
as permissive
for delete
to public
using ((auth.uid() = user_id));


create policy "Users can insert their own games"
on "public"."games"
as permissive
for insert
to public
with check ((auth.uid() = user_id));


create policy "Users can read their own games"
on "public"."games"
as permissive
for select
to public
using ((auth.uid() = user_id));


create policy "Users can update their own games"
on "public"."games"
as permissive
for update
to public
using ((auth.uid() = user_id));


create policy "Users can delete their own rules images"
on "public"."rules_images"
as permissive
for delete
to public
using ((auth.uid() = ( SELECT games.user_id
   FROM games
  WHERE (games.id = rules_images.game_id))));


create policy "Users can insert their own rules images"
on "public"."rules_images"
as permissive
for insert
to public
with check ((auth.uid() = ( SELECT games.user_id
   FROM games
  WHERE (games.id = rules_images.game_id))));


create policy "Users can read their own rules images"
on "public"."rules_images"
as permissive
for select
to public
using ((auth.uid() = ( SELECT games.user_id
   FROM games
  WHERE (games.id = rules_images.game_id))));


create policy "Users can update their own rules images"
on "public"."rules_images"
as permissive
for update
to public
using ((auth.uid() = ( SELECT games.user_id
   FROM games
  WHERE (games.id = rules_images.game_id))));



