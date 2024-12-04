import { useQuery } from "@supabase-cache-helpers/postgrest-react-query";
import { supabase } from "@/lib/supabase";
import { GameWithImages } from "types/composite.types";

export function useCurrentGame(gameId: string | undefined) {
  return useQuery(
    supabase
      .from("games")
      .select(`
      created_at,
      description,
      id,
      title,
      updated_at,
      user_id,
      rules_images (
        id,
        image_path, 
        display_order
      ),
      example_images (
        id,
        image_path
      )
    `)
      .eq("id", gameId ?? "")
      .returns<GameWithImages[]>()
      .single(),
  );
}
