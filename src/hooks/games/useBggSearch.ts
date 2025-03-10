import { useMutation, useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Tables } from "@/types/database.types";

export type BggSearchResult = {
    id: string;
    name: string;
    yearPublished?: string;
    thumbnail?: string;
    description?: string;
    minPlayers?: number;
    maxPlayers?: number;
    playingTime?: number;
    bggWeight?: number; // Game weight/complexity rating
};

export type BggGameData = {
    bggId: string;
    name: string;
    description?: string;
    yearPublished?: number;
    minPlayers?: number;
    maxPlayers?: number;
    playingTime?: number;
    minAge?: number;
    imageUrl?: string;
    thumbnailUrl?: string;
    categories?: string[];
    mechanics?: string[];
    designers?: string[];
    publishers?: string[];
    bggRating?: number;
    bggWeight?: number; // Game weight/complexity rating
    recommendedPlayers?: {
        count: number;
        recommendation: "Best" | "Recommended" | "Not Recommended";
        votes: number;
    }[];
    languageDependence?: number;
};

// Simplified game type with only the fields we need for search results
export type GameSearchResult =
    & Pick<
        Tables<"games">,
        "id" | "name" | "description" | "bgg_id" | "cover_image_id"
    >
    & {
        cover_image_url: string | null;
        has_complete_rules: boolean;
    };

/**
 * Hook for BoardGameGeek search and import functionality
 */
export const useBggSearch = () => {
    /**
     * Search for games on BoardGameGeek
     * @param query The search query
     * @param options Query options
     */
    const useSearchBgg = (query: string, options?: { enabled?: boolean }) => {
        return useQuery({
            queryKey: ["bgg", "search", query],
            queryFn: async () => {
                if (!query.trim()) return [];

                const { data } = await supabase.functions.invoke<
                    { results: BggSearchResult[] }
                >("search-bgg", {
                    body: { query },
                });

                return data?.results || [];
            },
            enabled: !!query.trim() && options?.enabled !== false,
        });
    };

    /**
     * Fetch detailed game data from BoardGameGeek
     * @param bggId The BGG ID of the game
     * @param options Query options
     */
    const useFetchBggGame = (
        bggId: string,
        options?: { enabled?: boolean },
    ) => {
        return useQuery({
            queryKey: ["bgg", "game", bggId],
            queryFn: async () => {
                if (!bggId) return null;

                const { data } = await supabase.functions.invoke<
                    { game: BggGameData }
                >(
                    "fetch-bgg-game",
                    {
                        body: { bggId },
                    },
                );

                return data?.game || { bggId, name: "Unknown Game" };
            },
            enabled: !!bggId && options?.enabled !== false,
        });
    };

    /**
     * Import a game from BoardGameGeek to our database
     */
    const useImportBggGame = () => {
        return useMutation({
            mutationKey: ["bgg", "import"],
            mutationFn: async (bggId: string) => {
                if (!bggId) throw new Error("BGG ID is required");

                const { data } = await supabase.functions.invoke<
                    { game: Tables<"games">; imported: boolean }
                >("fetch-bgg-game", {
                    body: { bggId, importGame: true },
                });

                if (!data?.game) {
                    throw new Error("Failed to import game");
                }

                return data.game;
            },
        });
    };

    return {
        useSearchBgg,
        useFetchBggGame,
        useImportBggGame,
    };
};
