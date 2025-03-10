-- Drop existing RLS policies to avoid conflicts
DROP POLICY IF EXISTS "Game images are viewable by everyone" ON "public"."game_images";
DROP POLICY IF EXISTS "Uploaders can delete their images" ON "public"."game_images";
DROP POLICY IF EXISTS "Uploaders can update their images" ON "public"."game_images";
DROP POLICY IF EXISTS "Users can upload images to games" ON "public"."game_images";

-- Make sure RLS is enabled on all tables
ALTER TABLE "public"."games" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."game_images" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."game_rules" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."game_tags" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."game_tag_relations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "public"."game_player_counts" ENABLE ROW LEVEL SECURITY;

-- Create admin role if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'admin') THEN
    CREATE ROLE admin;
  END IF;
END
$$;

-- Grant admin role to service_role
GRANT admin TO service_role;

-- Create a function to check if a user is an admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (
    EXISTS (
      SELECT 1
      FROM pg_roles
      WHERE rolname = 'admin'
      AND pg_has_role(current_user, oid, 'member')
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to check if a user owns a game
CREATE OR REPLACE FUNCTION public.owns_game(game_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (
    EXISTS (
      SELECT 1
      FROM public.games
      WHERE id = game_id
      AND author_id = auth.uid()
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ==================== GAMES TABLE POLICIES ====================

-- Everyone can view published games
CREATE POLICY "Anyone can view published games"
  ON "public"."games"
  FOR SELECT
  USING (status = 'published' OR status = 'under_review');

-- Users can view their own games regardless of status
CREATE POLICY "Users can view their own games"
  ON "public"."games"
  FOR SELECT
  USING (author_id = auth.uid());

-- Users can create their own games
CREATE POLICY "Users can create their own games"
  ON "public"."games"
  FOR INSERT
  WITH CHECK (author_id = auth.uid());

-- Users can update their own games
CREATE POLICY "Users can update their own games"
  ON "public"."games"
  FOR UPDATE
  USING (author_id = auth.uid());

-- Users can delete their own games
CREATE POLICY "Users can delete their own games"
  ON "public"."games"
  FOR DELETE
  USING (author_id = auth.uid());

-- Admins can do anything with games
CREATE POLICY "Admins can do anything with games"
  ON "public"."games"
  USING (is_admin());

-- ==================== GAME IMAGES TABLE POLICIES ====================

-- Everyone can view game images for published games
CREATE POLICY "Anyone can view game images for published games"
  ON "public"."game_images"
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.games
      WHERE id = game_id
      AND (status = 'published' OR status = 'under_review')
    )
  );

-- Users can view images for their own games
CREATE POLICY "Users can view images for their own games"
  ON "public"."game_images"
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.games
      WHERE id = game_id
      AND author_id = auth.uid()
    )
  );

-- Users can upload images to their own games
CREATE POLICY "Users can upload images to their own games"
  ON "public"."game_images"
  FOR INSERT
  WITH CHECK (
    uploader_id = auth.uid() AND
    EXISTS (
      SELECT 1
      FROM public.games
      WHERE id = game_id
      AND author_id = auth.uid()
    )
  );

-- Users can update their own uploaded images
CREATE POLICY "Users can update their own uploaded images"
  ON "public"."game_images"
  FOR UPDATE
  USING (uploader_id = auth.uid());

-- Users can delete their own uploaded images
CREATE POLICY "Users can delete their own uploaded images"
  ON "public"."game_images"
  FOR DELETE
  USING (uploader_id = auth.uid());

-- Admins can do anything with game images
CREATE POLICY "Admins can do anything with game images"
  ON "public"."game_images"
  USING (is_admin());

-- ==================== GAME RULES TABLE POLICIES ====================

-- Everyone can view game rules for published games
CREATE POLICY "Anyone can view game rules for published games"
  ON "public"."game_rules"
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.games
      WHERE id = game_id
      AND (status = 'published' OR status = 'under_review')
    )
  );

-- Users can view rules for their own games
CREATE POLICY "Users can view rules for their own games"
  ON "public"."game_rules"
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.games
      WHERE id = game_id
      AND author_id = auth.uid()
    )
  );

-- Users can create rules for their own games
CREATE POLICY "Users can create rules for their own games"
  ON "public"."game_rules"
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.games
      WHERE id = game_id
      AND author_id = auth.uid()
    )
  );

-- Users can update rules for their own games
CREATE POLICY "Users can update rules for their own games"
  ON "public"."game_rules"
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM public.games
      WHERE id = game_id
      AND author_id = auth.uid()
    )
  );

-- Users can delete rules for their own games
CREATE POLICY "Users can delete rules for their own games"
  ON "public"."game_rules"
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM public.games
      WHERE id = game_id
      AND author_id = auth.uid()
    )
  );

-- Admins can do anything with game rules
CREATE POLICY "Admins can do anything with game rules"
  ON "public"."game_rules"
  USING (is_admin());

-- ==================== GAME TAGS TABLE POLICIES ====================

-- Everyone can view game tags
CREATE POLICY "Anyone can view game tags"
  ON "public"."game_tags"
  FOR SELECT
  USING (true);

-- Only admins can create, update, or delete game tags
CREATE POLICY "Only admins can create game tags"
  ON "public"."game_tags"
  FOR INSERT
  WITH CHECK (is_admin());

CREATE POLICY "Only admins can update game tags"
  ON "public"."game_tags"
  FOR UPDATE
  USING (is_admin());

CREATE POLICY "Only admins can delete game tags"
  ON "public"."game_tags"
  FOR DELETE
  USING (is_admin());

-- ==================== GAME TAG RELATIONS TABLE POLICIES ====================

-- Everyone can view tag relations for published games
CREATE POLICY "Anyone can view tag relations for published games"
  ON "public"."game_tag_relations"
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.games
      WHERE id = game_id
      AND (status = 'published' OR status = 'under_review')
    )
  );

-- Users can view tag relations for their own games
CREATE POLICY "Users can view tag relations for their own games"
  ON "public"."game_tag_relations"
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.games
      WHERE id = game_id
      AND author_id = auth.uid()
    )
  );

-- Users can create tag relations for their own games
CREATE POLICY "Users can create tag relations for their own games"
  ON "public"."game_tag_relations"
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.games
      WHERE id = game_id
      AND author_id = auth.uid()
    )
  );

-- Users can delete tag relations for their own games
CREATE POLICY "Users can delete tag relations for their own games"
  ON "public"."game_tag_relations"
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM public.games
      WHERE id = game_id
      AND author_id = auth.uid()
    )
  );

-- Admins can do anything with game tag relations
CREATE POLICY "Admins can do anything with game tag relations"
  ON "public"."game_tag_relations"
  USING (is_admin());

-- ==================== GAME PLAYER COUNTS TABLE POLICIES ====================

-- Everyone can view player counts for published games
CREATE POLICY "Anyone can view player counts for published games"
  ON "public"."game_player_counts"
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.games
      WHERE id = game_id
      AND (status = 'published' OR status = 'under_review')
    )
  );

-- Users can view player counts for their own games
CREATE POLICY "Users can view player counts for their own games"
  ON "public"."game_player_counts"
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.games
      WHERE id = game_id
      AND author_id = auth.uid()
    )
  );

-- Users can create player counts for their own games
CREATE POLICY "Users can create player counts for their own games"
  ON "public"."game_player_counts"
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.games
      WHERE id = game_id
      AND author_id = auth.uid()
    )
  );

-- Users can update player counts for their own games
CREATE POLICY "Users can update player counts for their own games"
  ON "public"."game_player_counts"
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM public.games
      WHERE id = game_id
      AND author_id = auth.uid()
    )
  );

-- Users can delete player counts for their own games
CREATE POLICY "Users can delete player counts for their own games"
  ON "public"."game_player_counts"
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM public.games
      WHERE id = game_id
      AND author_id = auth.uid()
    )
  );

-- Admins can do anything with game player counts
CREATE POLICY "Admins can do anything with game player counts"
  ON "public"."game_player_counts"
  USING (is_admin());

-- ==================== STORAGE POLICIES ====================

-- Drop existing storage policies
DROP POLICY IF EXISTS "Enable delete access for authenticated users" ON "storage"."objects";
DROP POLICY IF EXISTS "Enable insert access for authenticated users" ON "storage"."objects";
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON "storage"."objects";
DROP POLICY IF EXISTS "Enable update access for authenticated users" ON "storage"."objects";

-- Create improved storage policies
CREATE POLICY "Public read access for game images"
  ON "storage"."objects"
  FOR SELECT
  USING (
    bucket_id = 'game_images' AND
    EXISTS (
      SELECT 1
      FROM public.game_images gi
      JOIN public.games g ON gi.game_id = g.id
      WHERE 
        (storage.foldername(name))[1] = ('user.' || gi.uploader_id) AND
        (g.status = 'published' OR g.status = 'under_review')
    )
  );

CREATE POLICY "Authenticated users can read their own uploads"
  ON "storage"."objects"
  FOR SELECT
  USING (
    bucket_id = 'game_images' AND
    auth.role() = 'authenticated' AND
    (storage.foldername(name))[1] = ('user.' || auth.uid())
  );

CREATE POLICY "Authenticated users can upload to their own folder"
  ON "storage"."objects"
  FOR INSERT
  WITH CHECK (
    bucket_id = 'game_images' AND
    auth.role() = 'authenticated' AND
    (storage.foldername(name))[1] = ('user.' || auth.uid())
  );

CREATE POLICY "Authenticated users can update their own uploads"
  ON "storage"."objects"
  FOR UPDATE
  USING (
    bucket_id = 'game_images' AND
    auth.role() = 'authenticated' AND
    (storage.foldername(name))[1] = ('user.' || auth.uid())
  );

CREATE POLICY "Authenticated users can delete their own uploads"
  ON "storage"."objects"
  FOR DELETE
  USING (
    bucket_id = 'game_images' AND
    auth.role() = 'authenticated' AND
    (storage.foldername(name))[1] = ('user.' || auth.uid())
  );

-- Admins can do anything with storage objects
CREATE POLICY "Admins can do anything with storage objects"
  ON "storage"."objects"
  USING (is_admin());
