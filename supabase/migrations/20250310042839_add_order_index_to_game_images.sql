-- Add order_index column to game_images table
ALTER TABLE "public"."game_images" ADD COLUMN "order_index" integer NOT NULL DEFAULT 0;

-- Create an index on game_id and order_index for efficient ordering queries
CREATE INDEX "idx_game_images_game_id_order_index" ON "public"."game_images" ("game_id", "order_index");

-- Add a comment to explain the purpose of the column
COMMENT ON COLUMN "public"."game_images"."order_index" IS 'Used to specify the display order of images, particularly for rule images';
