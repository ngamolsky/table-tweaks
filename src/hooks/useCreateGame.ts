import { useInsertMutation } from "@supabase-cache-helpers/postgrest-react-query";
import { supabase } from "@/lib/supabase";

export function useCreateGame() {
    return useInsertMutation(
        supabase.from("games"),
        ["id"],
        `
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
        `,
        {
            onError: (error) => {
                console.error("Error creating game:", error);
            },
        },
    );
}
