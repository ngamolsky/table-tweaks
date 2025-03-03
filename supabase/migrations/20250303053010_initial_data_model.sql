create type "public"."ai_model" as enum ('openai__gpt-4o-mini', 'openai__gpt-4o-2024-11-20', 'anthropic__claude-3-5-sonnet-20241022', 'anthropic__claude-3-haiku-20240307');

create type "public"."game_status" as enum ('draft', 'published', 'archived', 'under_review');

create type "public"."image_type" as enum ('rules', 'cover', 'component', 'game_state', 'other');

create type "public"."metadata_type" as enum ('rules', 'examples', 'scoring', 'pieces');

create type "public"."processing_status" as enum ('pending', 'processing', 'completed', 'error');

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

create table "public"."games" (
    "id" uuid not null default uuid_generate_v4(),
    "description" text,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now(),
    "author_id" uuid not null,
    "cover_image_id" uuid,
    "estimated_time" text,
    "name" text not null,
    "status" game_status not null default 'draft'::game_status,
    "weight" double precision
);


alter table "public"."games" enable row level security;

CREATE UNIQUE INDEX game_images_pkey ON public.game_images USING btree (id);

CREATE UNIQUE INDEX game_rules_pkey ON public.game_rules USING btree (id);

CREATE UNIQUE INDEX games_pkey ON public.games USING btree (id);

CREATE INDEX idx_game_images_game ON public.game_images USING btree (game_id);

CREATE INDEX idx_game_images_uploader ON public.game_images USING btree (uploader_id);

CREATE INDEX idx_game_rules_game_id ON public.game_rules USING btree (game_id);

CREATE INDEX idx_games_author ON public.games USING btree (author_id);

alter table "public"."game_images" add constraint "game_images_pkey" PRIMARY KEY using index "game_images_pkey";

alter table "public"."game_rules" add constraint "game_rules_pkey" PRIMARY KEY using index "game_rules_pkey";

alter table "public"."games" add constraint "games_pkey" PRIMARY KEY using index "games_pkey";

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

grant delete on table "public"."games" to "anon";

grant insert on table "public"."games" to "anon";

grant references on table "public"."games" to "anon";

grant select on table "public"."games" to "anon";

grant trigger on table "public"."games" to "anon";

grant truncate on table "public"."games" to "anon";

grant update on table "public"."games" to "anon";

grant delete on table "public"."games" to "authenticated";

grant insert on table "public"."games" to "authenticated";

grant references on table "public"."games" to "authenticated";

grant select on table "public"."games" to "authenticated";

grant trigger on table "public"."games" to "authenticated";

grant truncate on table "public"."games" to "authenticated";

grant update on table "public"."games" to "authenticated";

grant delete on table "public"."games" to "service_role";

grant insert on table "public"."games" to "service_role";

grant references on table "public"."games" to "service_role";

grant select on table "public"."games" to "service_role";

grant trigger on table "public"."games" to "service_role";

grant truncate on table "public"."games" to "service_role";

grant update on table "public"."games" to "service_role";

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



