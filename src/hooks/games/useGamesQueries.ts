import { useQuery } from "@supabase-cache-helpers/postgrest-react-query";
import { supabase } from "src/lib/supabase";
import { Game } from "./types";

/**
 * Hook for game-related queries
 */
export const useGamesQueries = () => {
    /**
     * Get all games with optional filtering
     */
    const getGames = (options?: {
        status?: Game["status"][];
        authorId?: string;
        enabled?: boolean;
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

        return useQuery(query, {
            enabled: options?.enabled !== false,
        });
    };

    /**
     * Get a single game by ID
     */
    const getGame = (id: string, options?: { enabled?: boolean }) => {
        return useQuery(
            supabase
                .from("games")
                .select(`
          *,
          cover_image_id,
          cover_image:game_images!games_cover_image_id_fkey(*)
        `)
                .eq("id", id)
                .single(),
            {
                enabled: options?.enabled !== false,
            },
        );
    };

    /**
     * Get game images for a specific game
     */
    const getGameImages = (gameId: string, options?: { enabled?: boolean }) => {
        return useQuery(
            supabase.from("game_images").select("*").eq("game_id", gameId),
            {
                enabled: options?.enabled !== false,
            },
        );
    };

    /**
     * Get game rules for a specific game
     */
    const getGameRules = (gameId: string, options?: { enabled?: boolean }) => {
        return useQuery(
            supabase.from("game_rules").select("*").eq("game_id", gameId),
            {
                enabled: options?.enabled !== false,
            },
        );
    };

    return {
        getGames,
        getGame,
        getGameImages,
        getGameRules,
    };
};
