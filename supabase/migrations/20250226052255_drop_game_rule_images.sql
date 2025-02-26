create type "public"."game_status" as enum ('draft', 'published', 'archived', 'under_review');

create type "public"."image_type" as enum ('rules', 'cover', 'component', 'game_state', 'other');

create type "public"."metadata_type" as enum ('rules', 'examples', 'scoring', 'pieces');

drop trigger if exists "update_example_images_updated_at" on "public"."example_images";

drop trigger if exists "update_games_updated_at" on "public"."games";

drop trigger if exists "update_rules_images_updated_at" on "public"."rules_images";

drop trigger if exists "update_user_preferences_updated_at" on "public"."user_preferences";

drop policy "Users can create their own example images" on "public"."example_images";

drop policy "Users can delete their own example images" on "public"."example_images";

drop policy "Users can update their own example images" on "public"."example_images";

drop policy "Users can view their own example images" on "public"."example_images";

drop policy "Users can create their own games" on "public"."games";

drop policy "Users can delete their own games" on "public"."games";

drop policy "Users can update their own games" on "public"."games";

drop policy "Users can view their own games" on "public"."games";

drop policy "Users can create their own rule images" on "public"."rules_images";

drop policy "Users can delete their own rule images" on "public"."rules_images";

drop policy "Users can update their own rule images" on "public"."rules_images";

drop policy "Users can view their own rule images" on "public"."rules_images";

drop policy "Users can insert their own preferences" on "public"."user_preferences";

drop policy "Users can update their own preferences" on "public"."user_preferences";

drop policy "Users can view their own preferences" on "public"."user_preferences";

revoke delete on table "public"."example_images" from "anon";

revoke insert on table "public"."example_images" from "anon";

revoke references on table "public"."example_images" from "anon";

revoke select on table "public"."example_images" from "anon";

revoke trigger on table "public"."example_images" from "anon";

revoke truncate on table "public"."example_images" from "anon";

revoke update on table "public"."example_images" from "anon";

revoke delete on table "public"."example_images" from "authenticated";

revoke insert on table "public"."example_images" from "authenticated";

revoke references on table "public"."example_images" from "authenticated";

revoke select on table "public"."example_images" from "authenticated";

revoke trigger on table "public"."example_images" from "authenticated";

revoke truncate on table "public"."example_images" from "authenticated";

revoke update on table "public"."example_images" from "authenticated";

revoke delete on table "public"."example_images" from "service_role";

revoke insert on table "public"."example_images" from "service_role";

revoke references on table "public"."example_images" from "service_role";

revoke select on table "public"."example_images" from "service_role";

revoke trigger on table "public"."example_images" from "service_role";

revoke truncate on table "public"."example_images" from "service_role";

revoke update on table "public"."example_images" from "service_role";

revoke delete on table "public"."rules_images" from "anon";

revoke insert on table "public"."rules_images" from "anon";

revoke references on table "public"."rules_images" from "anon";

revoke select on table "public"."rules_images" from "anon";

revoke trigger on table "public"."rules_images" from "anon";

revoke truncate on table "public"."rules_images" from "anon";

revoke update on table "public"."rules_images" from "anon";

revoke delete on table "public"."rules_images" from "authenticated";

revoke insert on table "public"."rules_images" from "authenticated";

revoke references on table "public"."rules_images" from "authenticated";

revoke select on table "public"."rules_images" from "authenticated";

revoke trigger on table "public"."rules_images" from "authenticated";

revoke truncate on table "public"."rules_images" from "authenticated";

revoke update on table "public"."rules_images" from "authenticated";

revoke delete on table "public"."rules_images" from "service_role";

revoke insert on table "public"."rules_images" from "service_role";

revoke references on table "public"."rules_images" from "service_role";

revoke select on table "public"."rules_images" from "service_role";

revoke trigger on table "public"."rules_images" from "service_role";

revoke truncate on table "public"."rules_images" from "service_role";

revoke update on table "public"."rules_images" from "service_role";

revoke delete on table "public"."user_preferences" from "anon";

revoke insert on table "public"."user_preferences" from "anon";

revoke references on table "public"."user_preferences" from "anon";

revoke select on table "public"."user_preferences" from "anon";

revoke trigger on table "public"."user_preferences" from "anon";

revoke truncate on table "public"."user_preferences" from "anon";

revoke update on table "public"."user_preferences" from "anon";

revoke delete on table "public"."user_preferences" from "authenticated";

revoke insert on table "public"."user_preferences" from "authenticated";

revoke references on table "public"."user_preferences" from "authenticated";

revoke select on table "public"."user_preferences" from "authenticated";

revoke trigger on table "public"."user_preferences" from "authenticated";

revoke truncate on table "public"."user_preferences" from "authenticated";

revoke update on table "public"."user_preferences" from "authenticated";

revoke delete on table "public"."user_preferences" from "service_role";

revoke insert on table "public"."user_preferences" from "service_role";

revoke references on table "public"."user_preferences" from "service_role";

revoke select on table "public"."user_preferences" from "service_role";

revoke trigger on table "public"."user_preferences" from "service_role";

revoke truncate on table "public"."user_preferences" from "service_role";

revoke update on table "public"."user_preferences" from "service_role";

alter table "public"."example_images" drop constraint "example_images_game_id_fkey";

alter table "public"."games" drop constraint "games_user_id_fkey";

alter table "public"."rules_images" drop constraint "rules_images_game_id_fkey";

alter table "public"."user_preferences" drop constraint "user_preferences_user_id_fkey";

drop function if exists "public"."update_updated_at_column"();

alter table "public"."example_images" drop constraint "example_images_pkey";

alter table "public"."rules_images" drop constraint "rules_images_pkey";

alter table "public"."user_preferences" drop constraint "user_preferences_pkey";

drop index if exists "public"."example_images_pkey";

drop index if exists "public"."idx_example_images_game_id";

drop index if exists "public"."idx_example_images_processing_status";

drop index if exists "public"."idx_games_user_id";

drop index if exists "public"."idx_rules_images_game_id";

drop index if exists "public"."idx_rules_images_processing_status";

drop index if exists "public"."rules_images_pkey";

drop index if exists "public"."user_preferences_pkey";

drop table "public"."example_images";

drop table "public"."rules_images";

drop table "public"."user_preferences";

create table "public"."game_images" (
    "id" uuid not null default uuid_generate_v4(),
    "game_id" uuid not null,
    "uploader_id" uuid not null,
    "image_url" text not null,
    "image_type" image_type not null,
    "uploaded_at" timestamp with time zone not null default now(),
    "is_cover" boolean default false
);


alter table "public"."game_images" enable row level security;

create table "public"."game_rules" (
    "id" uuid not null default gen_random_uuid(),
    "game_id" uuid not null,
    "raw_text" text,
    "structured_content" jsonb,
    "processing_status" processing_status default 'pending'::processing_status,
    "processed_at" timestamp with time zone,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
);


alter table "public"."game_rules" enable row level security;

alter table "public"."games" drop column "title";

alter table "public"."games" drop column "user_id";

alter table "public"."games" add column "author_id" uuid not null;

alter table "public"."games" add column "cover_image_id" uuid;

alter table "public"."games" add column "estimated_time" text;

alter table "public"."games" add column "name" text not null;

alter table "public"."games" add column "status" game_status not null default 'draft'::game_status;

alter table "public"."games" add column "weight" double precision;

alter table "public"."games" alter column "created_at" set default now();

alter table "public"."games" alter column "id" set default uuid_generate_v4();

alter table "public"."games" alter column "updated_at" set default now();

CREATE UNIQUE INDEX game_images_pkey ON public.game_images USING btree (id);

CREATE UNIQUE INDEX game_rules_pkey ON public.game_rules USING btree (id);

CREATE INDEX idx_game_images_game ON public.game_images USING btree (game_id);

CREATE INDEX idx_game_images_uploader ON public.game_images USING btree (uploader_id);

CREATE INDEX idx_game_rules_game_id ON public.game_rules USING btree (game_id);

CREATE INDEX idx_games_author ON public.games USING btree (author_id);

alter table "public"."game_images" add constraint "game_images_pkey" PRIMARY KEY using index "game_images_pkey";

alter table "public"."game_rules" add constraint "game_rules_pkey" PRIMARY KEY using index "game_rules_pkey";

alter table "public"."game_images" add constraint "game_images_game_id_fkey" FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE not valid;

alter table "public"."game_images" validate constraint "game_images_game_id_fkey";

alter table "public"."game_images" add constraint "game_images_uploader_id_fkey" FOREIGN KEY (uploader_id) REFERENCES auth.users(id) not valid;

alter table "public"."game_images" validate constraint "game_images_uploader_id_fkey";

alter table "public"."game_rules" add constraint "game_rules_game_id_fkey" FOREIGN KEY (game_id) REFERENCES games(id) not valid;

alter table "public"."game_rules" validate constraint "game_rules_game_id_fkey";

alter table "public"."games" add constraint "games_author_id_fkey" FOREIGN KEY (author_id) REFERENCES auth.users(id) not valid;

alter table "public"."games" validate constraint "games_author_id_fkey";

alter table "public"."games" add constraint "games_cover_image_id_fkey" FOREIGN KEY (cover_image_id) REFERENCES game_images(id) not valid;

alter table "public"."games" validate constraint "games_cover_image_id_fkey";

alter table "public"."games" add constraint "weight_check" CHECK (((weight >= (1)::double precision) AND (weight <= (5)::double precision))) not valid;

alter table "public"."games" validate constraint "weight_check";

grant delete on table "public"."game_images" to "anon";

grant insert on table "public"."game_images" to "anon";

grant references on table "public"."game_images" to "anon";

grant select on table "public"."game_images" to "anon";

grant trigger on table "public"."game_images" to "anon";

grant truncate on table "public"."game_images" to "anon";

grant update on table "public"."game_images" to "anon";

grant delete on table "public"."game_images" to "authenticated";

grant insert on table "public"."game_images" to "authenticated";

grant references on table "public"."game_images" to "authenticated";

grant select on table "public"."game_images" to "authenticated";

grant trigger on table "public"."game_images" to "authenticated";

grant truncate on table "public"."game_images" to "authenticated";

grant update on table "public"."game_images" to "authenticated";

grant delete on table "public"."game_images" to "service_role";

grant insert on table "public"."game_images" to "service_role";

grant references on table "public"."game_images" to "service_role";

grant select on table "public"."game_images" to "service_role";

grant trigger on table "public"."game_images" to "service_role";

grant truncate on table "public"."game_images" to "service_role";

grant update on table "public"."game_images" to "service_role";

grant delete on table "public"."game_rules" to "anon";

grant insert on table "public"."game_rules" to "anon";

grant references on table "public"."game_rules" to "anon";

grant select on table "public"."game_rules" to "anon";

grant trigger on table "public"."game_rules" to "anon";

grant truncate on table "public"."game_rules" to "anon";

grant update on table "public"."game_rules" to "anon";

grant delete on table "public"."game_rules" to "authenticated";

grant insert on table "public"."game_rules" to "authenticated";

grant references on table "public"."game_rules" to "authenticated";

grant select on table "public"."game_rules" to "authenticated";

grant trigger on table "public"."game_rules" to "authenticated";

grant truncate on table "public"."game_rules" to "authenticated";

grant update on table "public"."game_rules" to "authenticated";

grant delete on table "public"."game_rules" to "service_role";

grant insert on table "public"."game_rules" to "service_role";

grant references on table "public"."game_rules" to "service_role";

grant select on table "public"."game_rules" to "service_role";

grant trigger on table "public"."game_rules" to "service_role";

grant truncate on table "public"."game_rules" to "service_role";

grant update on table "public"."game_rules" to "service_role";

create policy "Game images are viewable by everyone"
on "public"."game_images"
as permissive
for select
to public
using (true);


create policy "Uploaders can delete their images"
on "public"."game_images"
as permissive
for delete
to public
using ((auth.uid() = uploader_id));


create policy "Uploaders can update their images"
on "public"."game_images"
as permissive
for update
to public
using ((auth.uid() = uploader_id));


create policy "Users can upload images to games"
on "public"."game_images"
as permissive
for insert
to public
with check ((auth.uid() = uploader_id));


create policy "Authors can delete their games"
on "public"."games"
as permissive
for delete
to public
using ((auth.uid() = author_id));


create policy "Authors can update their games"
on "public"."games"
as permissive
for update
to public
using ((auth.uid() = author_id));


create policy "Games are viewable by everyone"
on "public"."games"
as permissive
for select
to public
using (true);


create policy "Users can create games"
on "public"."games"
as permissive
for insert
to public
with check ((auth.uid() = author_id));



