import { supabase } from "@/lib/supabase";
import { QueryData } from "@supabase/supabase-js";

export const gamesWithImagesQuery = supabase
    .from("games")
    .select(
        `
  *,
  rules_images (
    id,
    image_path,
    display_order
  ),
  example_images (
    id,
    image_path
  )
`,
    );

export type GamesWithImages = QueryData<typeof gamesWithImagesQuery>;

export type GameWithImages = GamesWithImages[number];
