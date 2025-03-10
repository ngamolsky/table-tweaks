-- Consolidated migration file that combines all previous migrations
-- This file replaces all previous migrations

-- Create enums
CREATE TYPE "public"."ai_model" AS ENUM (
  'openai__gpt-4o-mini',
  'openai__gpt-4o-2024-11-20',
  'anthropic__claude-3-5-sonnet-20241022',
  'anthropic__claude-3-haiku-20240307'
);

CREATE TYPE "public"."game_status" AS ENUM (
  'draft',
  'published',
  'archived',
  'under_review'
);

CREATE TYPE "public"."image_type" AS ENUM (
  'rules',
  'cover',
  'component',
  'game_state',
  'other'
);

CREATE TYPE "public"."metadata_type" AS ENUM (
  'rules',
  'examples',
  'scoring',
  'pieces'
);

CREATE TYPE "public"."processing_status" AS ENUM (
  'pending',
  'processing',
  'completed',
  'error',
  'queued',
  'retrying'
);

-- Create tables
CREATE TABLE "public"."games" (
  "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
  "name" TEXT NOT NULL,
  "description" TEXT,
  "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  "author_id" UUID NOT NULL,
  "cover_image_id" UUID,
  "estimated_time" TEXT,
  "status" game_status NOT NULL DEFAULT 'draft'::game_status,
  "bgg_weight" DOUBLE PRECISION,
  "bgg_id" TEXT,
  "bgg_year_published" INTEGER,
  "min_players" INTEGER,
  "max_players" INTEGER,
  "min_age" INTEGER,
  "bgg_rating" NUMERIC(3,1),
  "bgg_image_url" TEXT,
  "bgg_thumbnail_url" TEXT,
  "language_dependence" INTEGER,
  "has_complete_rules" BOOLEAN DEFAULT FALSE,
  CONSTRAINT "games_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "bgg_weight_check" CHECK ((bgg_weight >= 1 AND bgg_weight <= 5))
);

CREATE TABLE "public"."game_images" (
  "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
  "game_id" UUID NOT NULL,
  "uploader_id" UUID NOT NULL,
  "image_url" TEXT NOT NULL,
  "image_type" image_type NOT NULL,
  "uploaded_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  "is_cover" BOOLEAN DEFAULT FALSE,
  "is_external" BOOLEAN DEFAULT FALSE,
  CONSTRAINT "game_images_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "public"."game_rules" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "game_id" UUID NOT NULL,
  "raw_text" TEXT,
  "structured_content" JSONB,
  "processing_status" processing_status DEFAULT 'pending'::processing_status,
  "processed_at" TIMESTAMP WITH TIME ZONE,
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT now(),
  "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT now(),
  "error_message" TEXT,
  "processing_attempts" INTEGER DEFAULT 0,
  "last_attempt_at" TIMESTAMP WITH TIME ZONE,
  "processing_progress" JSONB,
  "processing_request_id" UUID,
  CONSTRAINT "game_rules_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "public"."game_tags" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "name" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT now(),
  CONSTRAINT "game_tags_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "game_tags_name_type_key" UNIQUE ("name", "type")
);

CREATE TABLE "public"."game_tag_relations" (
  "game_id" UUID NOT NULL,
  "tag_id" UUID NOT NULL,
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT now(),
  CONSTRAINT "game_tag_relations_pkey" PRIMARY KEY ("game_id", "tag_id")
);

CREATE TABLE "public"."game_player_counts" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "game_id" UUID NOT NULL,
  "player_count" INTEGER NOT NULL,
  "recommendation" TEXT NOT NULL,
  "votes" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT now(),
  CONSTRAINT "game_player_counts_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "game_player_counts_game_id_player_count_key" UNIQUE ("game_id", "player_count")
);

-- Create indexes
CREATE INDEX "idx_game_images_game" ON "public"."game_images" ("game_id");
CREATE INDEX "idx_game_images_uploader" ON "public"."game_images" ("uploader_id");
CREATE INDEX "idx_game_rules_game_id" ON "public"."game_rules" ("game_id");
CREATE INDEX "idx_games_author" ON "public"."games" ("author_id");
CREATE INDEX "idx_games_bgg_id" ON "public"."games" ("bgg_id");
CREATE INDEX "idx_game_tags_type" ON "public"."game_tags" ("type");
CREATE INDEX "idx_game_player_counts_game_id" ON "public"."game_player_counts" ("game_id");
CREATE INDEX "idx_game_tag_relations_game_id" ON "public"."game_tag_relations" ("game_id");
CREATE INDEX "idx_game_tag_relations_tag_id" ON "public"."game_tag_relations" ("tag_id");
CREATE INDEX "game_rules_game_id_status_idx" ON "public"."game_rules" ("game_id", "processing_status");

-- Add foreign key constraints
ALTER TABLE "public"."games" ADD CONSTRAINT "games_author_id_fkey" 
  FOREIGN KEY ("author_id") REFERENCES auth.users(id);

ALTER TABLE "public"."games" ADD CONSTRAINT "games_cover_image_id_fkey" 
  FOREIGN KEY ("cover_image_id") REFERENCES game_images(id);

ALTER TABLE "public"."game_images" ADD CONSTRAINT "game_images_game_id_fkey" 
  FOREIGN KEY ("game_id") REFERENCES games(id) ON DELETE CASCADE;

ALTER TABLE "public"."game_images" ADD CONSTRAINT "game_images_uploader_id_fkey" 
  FOREIGN KEY ("uploader_id") REFERENCES auth.users(id);

ALTER TABLE "public"."game_rules" ADD CONSTRAINT "game_rules_game_id_fkey" 
  FOREIGN KEY ("game_id") REFERENCES games(id) ON DELETE CASCADE;

ALTER TABLE "public"."game_tag_relations" ADD CONSTRAINT "game_tag_relations_game_id_fkey" 
  FOREIGN KEY ("game_id") REFERENCES games(id) ON DELETE CASCADE;

ALTER TABLE "public"."game_tag_relations" ADD CONSTRAINT "game_tag_relations_tag_id_fkey" 
  FOREIGN KEY ("tag_id") REFERENCES game_tags(id) ON DELETE CASCADE;

ALTER TABLE "public"."game_player_counts" ADD CONSTRAINT "game_player_counts_game_id_fkey" 
  FOREIGN KEY ("game_id") REFERENCES games(id) ON DELETE CASCADE;

-- Enable row level security
ALTER TABLE "public"."games" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."game_images" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."game_rules" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."game_tags" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."game_tag_relations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."game_player_counts" ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Game images are viewable by everyone"
  ON "public"."game_images"
  AS PERMISSIVE
  FOR SELECT
  TO PUBLIC
  USING (true);

CREATE POLICY "Uploaders can delete their images"
  ON "public"."game_images"
  AS PERMISSIVE
  FOR DELETE
  TO PUBLIC
  USING ((auth.uid() = uploader_id));

CREATE POLICY "Uploaders can update their images"
  ON "public"."game_images"
  AS PERMISSIVE
  FOR UPDATE
  TO PUBLIC
  USING ((auth.uid() = uploader_id));

CREATE POLICY "Users can upload images to games"
  ON "public"."game_images"
  AS PERMISSIVE
  FOR INSERT
  TO PUBLIC
  WITH CHECK (true);

-- Create storage bucket for game images
INSERT INTO storage.buckets (id, name, public, avif_autodetection, file_size_limit, allowed_mime_types, owner)
VALUES 
  ('game_images', 'game_images', false, false, 50000000, -- 50MB limit
   ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp']::text[],
   NULL)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies
CREATE POLICY "Enable delete access for authenticated users"
  ON "storage"."objects"
  AS PERMISSIVE
  FOR DELETE
  TO PUBLIC
  USING (((bucket_id = 'game_images'::text) AND (auth.role() = 'authenticated'::text) AND ((storage.foldername(name))[1] = ('user.'::text || auth.uid()))));

CREATE POLICY "Enable insert access for authenticated users"
  ON "storage"."objects"
  AS PERMISSIVE
  FOR INSERT
  TO PUBLIC
  WITH CHECK (((bucket_id = 'game_images'::text) AND (auth.role() = 'authenticated'::text) AND ((storage.foldername(name))[1] = ('user.'::text || auth.uid()))));

CREATE POLICY "Enable read access for authenticated users"
  ON "storage"."objects"
  AS PERMISSIVE
  FOR SELECT
  TO PUBLIC
  USING (((bucket_id = 'game_images'::text) AND (auth.role() = 'authenticated'::text) AND ((storage.foldername(name))[1] = ('user.'::text || auth.uid()))));

CREATE POLICY "Enable update access for authenticated users"
  ON "storage"."objects"
  AS PERMISSIVE
  FOR UPDATE
  TO PUBLIC
  USING (((bucket_id = 'game_images'::text) AND (auth.role() = 'authenticated'::text) AND ((storage.foldername(name))[1] = ('user.'::text || auth.uid()))));

-- Create function to update game has_complete_rules status
CREATE OR REPLACE FUNCTION public.update_game_rules_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the game's has_complete_rules status based on the rules processing status
  IF NEW.processing_status = 'completed' THEN
    -- Check if all rules for this game are completed
    IF NOT EXISTS (
      SELECT 1 FROM public.game_rules 
      WHERE game_id = NEW.game_id 
      AND processing_status != 'completed'
    ) THEN
      UPDATE public.games 
      SET has_complete_rules = TRUE, 
          updated_at = NOW() 
      WHERE id = NEW.game_id;
    END IF;
  ELSIF NEW.processing_status = 'error' THEN
    -- If this is the only rule entry and it's in error state, mark game as not having complete rules
    IF NOT EXISTS (
      SELECT 1 FROM public.game_rules 
      WHERE game_id = NEW.game_id 
      AND id != NEW.id
      AND processing_status != 'error'
    ) THEN
      UPDATE public.games 
      SET has_complete_rules = FALSE, 
          updated_at = NOW() 
      WHERE id = NEW.game_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for game rules status updates
CREATE TRIGGER update_game_rules_status_trigger
AFTER UPDATE OF processing_status ON public.game_rules
FOR EACH ROW
EXECUTE FUNCTION public.update_game_rules_status();

-- Grant permissions
GRANT ALL ON TABLE "public"."games" TO anon, authenticated, service_role;
GRANT ALL ON TABLE "public"."game_images" TO anon, authenticated, service_role;
GRANT ALL ON TABLE "public"."game_rules" TO anon, authenticated, service_role;
GRANT ALL ON TABLE "public"."game_tags" TO anon, authenticated, service_role;
GRANT ALL ON TABLE "public"."game_tag_relations" TO anon, authenticated, service_role;
GRANT ALL ON TABLE "public"."game_player_counts" TO anon, authenticated, service_role;

-- Add comments
COMMENT ON COLUMN games.has_complete_rules IS 'Indicates whether the game has complete rules data';
COMMENT ON COLUMN games.bgg_weight IS 'Game weight/complexity rating from BoardGameGeek'; 