import { useQuery } from "@supabase-cache-helpers/postgrest-react-query";
import { supabase } from "@/lib/supabase";
import { Game } from "./types";

/**
 * Hook for game-related queries
 */
export const useGamesQueries = () => {
    /**
     * Get all games with optional filtering
     */
    const useGames = (options?: {
        status?: Game["status"][];
        authorId?: string;
        enabled?: boolean;
        name?: string;
    }) => {
        let query = supabase.from("games").select(`
      *,
      cover_image_id,
      cover_image:game_images!games_cover_image_id_fkey(*)
    `);

        if (options?.status && options.status.length > 0) {
            query = query.in("status", options.status);
        }

        if (options?.authorId) {
            query = query.eq("author_id", options.authorId);
        }

        if (options?.name) {
            query = query.ilike("name", `%${options.name}%`);
        }

        return useQuery(query, {
            enabled: options?.enabled !== false,
        });
    };

    /**
     * Get a single game by ID
     */
    const useGame = (id: string, options?: { enabled?: boolean }) => {
        return useQuery(
            supabase
                .from("games")
                .select(`
          *,
          cover_image_id,
          cover_image:game_images!games_cover_image_id_fkey(*),
          game_rule:game_rules!game_rules_game_id_fkey(*),
          tags:game_tag_relations!game_id(
            id:tag_id,
            name:game_tags!tag_id(name),
            type:game_tags!tag_id(type)
          )
        `)
                .eq("id", id)
                .single(),
            {
                enabled: !!id && options?.enabled !== false,
            },
        );
    };

    /**
     * Get game images for a specific game
     */
    const useGameImages = (gameId: string, options?: { enabled?: boolean }) => {
        return useQuery(
            supabase.from("game_images").select("*").eq("game_id", gameId),
            {
                enabled: !!gameId && options?.enabled !== false,
            },
        );
    };

    /**
     * Get game rules for a specific game
     */
    const useGameRules = (
        gameId: string,
        options?: {
            enabled?: boolean;
        },
    ) => {
        const query = supabase.from("game_rules").select("*").eq(
            "game_id",
            gameId,
        ).maybeSingle();

        return useQuery(
            query,
            {
                enabled: !!gameId && options?.enabled !== false,
            },
        );
    };

    return {
        useGames,
        useGame,
        useGameImages,
        useGameRules,
    };
};
