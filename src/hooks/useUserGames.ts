import { useQuery } from "@supabase-cache-helpers/postgrest-react-query";
import { supabase } from "@/lib/supabase";

export function useUserGames(userId: string) {
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
      .eq("user_id", userId)
      .order("created_at", { ascending: false }),
  );
}
