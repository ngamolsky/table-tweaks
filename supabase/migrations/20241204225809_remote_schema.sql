create type "public"."ai_model" as enum ('openai__gpt-4o-mini', 'openai__gpt-4o-2024-11-20', 'anthropic__claude-3-5-sonnet-20241022', 'anthropic__claude-3-haiku-20240307');

create type "public"."processing_status" as enum ('pending', 'processing', 'completed', 'error');

drop policy "Users can insert their own example images" on "public"."example_images";

drop policy "Users can read their own example images" on "public"."example_images";

drop policy "Users can insert their own games" on "public"."games";

drop policy "Users can read their own games" on "public"."games";

drop policy "Users can delete their own rules images" on "public"."rules_images";

drop policy "Users can insert their own rules images" on "public"."rules_images";

drop policy "Users can read their own rules images" on "public"."rules_images";

drop policy "Users can update their own rules images" on "public"."rules_images";

alter table "public"."example_images" drop constraint "exemplar_images_game_id_fkey";

alter table "public"."rules_images" drop constraint "instruction_images_game_id_fkey";

alter table "public"."games" drop constraint "games_user_id_fkey";

alter table "public"."example_images" drop constraint "exemplar_images_pkey";

alter table "public"."rules_images" drop constraint "instruction_images_pkey";

drop index if exists "public"."exemplar_images_pkey";

drop index if exists "public"."instruction_images_pkey";

create table "public"."user_preferences" (
    "user_id" uuid not null,
    "ai_model" ai_model,
    "created_at" timestamp with time zone not null default timezone('utc'::text, now()),
    "updated_at" timestamp with time zone not null default timezone('utc'::text, now())
);


alter table "public"."user_preferences" enable row level security;

alter table "public"."example_images" add column "additional_info" text;

alter table "public"."example_images" add column "extracted_content" text;

alter table "public"."example_images" add column "extracted_pattern" text;

alter table "public"."example_images" add column "model_used" ai_model;

alter table "public"."example_images" add column "processed_at" timestamp with time zone;

alter table "public"."example_images" add column "processing_status" processing_status not null default 'pending'::processing_status;

alter table "public"."games" alter column "description" drop not null;

alter table "public"."games" alter column "user_id" set not null;

alter table "public"."rules_images" add column "additional_info" text;

alter table "public"."rules_images" add column "extracted_text" text;

alter table "public"."rules_images" add column "model_used" ai_model;

alter table "public"."rules_images" add column "processed_at" timestamp with time zone;

alter table "public"."rules_images" add column "processing_status" processing_status not null default 'pending'::processing_status;

CREATE UNIQUE INDEX example_images_pkey ON public.example_images USING btree (id);

CREATE INDEX idx_example_images_game_id ON public.example_images USING btree (game_id);

CREATE INDEX idx_example_images_processing_status ON public.example_images USING btree (processing_status);

CREATE INDEX idx_games_user_id ON public.games USING btree (user_id);

CREATE INDEX idx_rules_images_game_id ON public.rules_images USING btree (game_id);

CREATE INDEX idx_rules_images_processing_status ON public.rules_images USING btree (processing_status);

CREATE UNIQUE INDEX rules_images_pkey ON public.rules_images USING btree (id);

CREATE UNIQUE INDEX user_preferences_pkey ON public.user_preferences USING btree (user_id);

alter table "public"."example_images" add constraint "example_images_pkey" PRIMARY KEY using index "example_images_pkey";

alter table "public"."rules_images" add constraint "rules_images_pkey" PRIMARY KEY using index "rules_images_pkey";

alter table "public"."user_preferences" add constraint "user_preferences_pkey" PRIMARY KEY using index "user_preferences_pkey";

alter table "public"."example_images" add constraint "example_images_game_id_fkey" FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE not valid;

alter table "public"."example_images" validate constraint "example_images_game_id_fkey";

alter table "public"."rules_images" add constraint "rules_images_game_id_fkey" FOREIGN KEY (game_id) REFERENCES games(id) ON DELETE CASCADE not valid;

alter table "public"."rules_images" validate constraint "rules_images_game_id_fkey";

alter table "public"."user_preferences" add constraint "user_preferences_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."user_preferences" validate constraint "user_preferences_user_id_fkey";

alter table "public"."games" add constraint "games_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."games" validate constraint "games_user_id_fkey";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$ 
BEGIN     
    -- Set the search path to an empty string     
    EXECUTE 'SET search_path TO '''';'; 

    NEW.updated_at = now();     
    RETURN NEW; 
END; 
$function$
;

grant delete on table "public"."user_preferences" to "anon";

grant insert on table "public"."user_preferences" to "anon";

grant references on table "public"."user_preferences" to "anon";

grant select on table "public"."user_preferences" to "anon";

grant trigger on table "public"."user_preferences" to "anon";

grant truncate on table "public"."user_preferences" to "anon";

grant update on table "public"."user_preferences" to "anon";

grant delete on table "public"."user_preferences" to "authenticated";

grant insert on table "public"."user_preferences" to "authenticated";

grant references on table "public"."user_preferences" to "authenticated";

grant select on table "public"."user_preferences" to "authenticated";

grant trigger on table "public"."user_preferences" to "authenticated";

grant truncate on table "public"."user_preferences" to "authenticated";

grant update on table "public"."user_preferences" to "authenticated";

grant delete on table "public"."user_preferences" to "service_role";

grant insert on table "public"."user_preferences" to "service_role";

grant references on table "public"."user_preferences" to "service_role";

grant select on table "public"."user_preferences" to "service_role";

grant trigger on table "public"."user_preferences" to "service_role";

grant truncate on table "public"."user_preferences" to "service_role";

grant update on table "public"."user_preferences" to "service_role";

create policy "Users can create their own example images"
on "public"."example_images"
as permissive
for insert
to public
with check ((auth.uid() = ( SELECT games.user_id
   FROM games
  WHERE (games.id = example_images.game_id))));


create policy "Users can view their own example images"
on "public"."example_images"
as permissive
for select
to public
using ((auth.uid() = ( SELECT games.user_id
   FROM games
  WHERE (games.id = example_images.game_id))));


create policy "Users can create their own games"
on "public"."games"
as permissive
for insert
to public
with check ((auth.uid() = user_id));


create policy "Users can view their own games"
on "public"."games"
as permissive
for select
to public
using ((auth.uid() = user_id));


create policy "Users can create their own rule images"
on "public"."rules_images"
as permissive
for insert
to public
with check ((auth.uid() = ( SELECT games.user_id
   FROM games
  WHERE (games.id = rules_images.game_id))));


create policy "Users can delete their own rule images"
on "public"."rules_images"
as permissive
for delete
to public
using ((auth.uid() = ( SELECT games.user_id
   FROM games
  WHERE (games.id = rules_images.game_id))));


create policy "Users can update their own rule images"
on "public"."rules_images"
as permissive
for update
to public
using ((auth.uid() = ( SELECT games.user_id
   FROM games
  WHERE (games.id = rules_images.game_id))));


create policy "Users can view their own rule images"
on "public"."rules_images"
as permissive
for select
to public
using ((auth.uid() = ( SELECT games.user_id
   FROM games
  WHERE (games.id = rules_images.game_id))));


create policy "Users can insert their own preferences"
on "public"."user_preferences"
as permissive
for insert
to public
with check ((auth.uid() = user_id));


create policy "Users can update their own preferences"
on "public"."user_preferences"
as permissive
for update
to public
using ((auth.uid() = user_id));


create policy "Users can view their own preferences"
on "public"."user_preferences"
as permissive
for select
to public
using ((auth.uid() = user_id));


CREATE TRIGGER update_example_images_updated_at BEFORE UPDATE ON public.example_images FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_games_updated_at BEFORE UPDATE ON public.games FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_rules_images_updated_at BEFORE UPDATE ON public.rules_images FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_preferences_updated_at BEFORE UPDATE ON public.user_preferences FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


