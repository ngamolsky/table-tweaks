import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useSubscription } from "@supabase-cache-helpers/postgrest-react-query";
import { RealtimePostgresChangesPayload } from "@supabase/supabase-js";
import { Game } from "./types";

/**
 * Hook for game-related subscriptions
 */
export const useGamesSubscriptions = () => {
    const queryClient = useQueryClient();

    /**
     * Subscribe to changes in the games table
     */
    const useSubscribeToGames = (options?: { enabled?: boolean }) => {
        // Only subscribe if enabled is not explicitly set to false
        if (options?.enabled === false) {
            return { status: "disabled" };
        }

        return useSubscription(
            supabase,
            "games-changes",
            {
                event: "*",
                schema: "public",
                table: "games",
            },
            ["id"],
            {
                callback: (payload: RealtimePostgresChangesPayload<Game>) => {
                    // Handle different events
                    if (payload.eventType === "INSERT") {
                        queryClient.invalidateQueries({
                            queryKey: ["games"],
                        });
                    } else if (payload.eventType === "UPDATE") {
                        const updatedGame = payload.new as Game;
                        queryClient.invalidateQueries({
                            queryKey: ["games"],
                        });
                        queryClient.invalidateQueries({
                            queryKey: ["game", updatedGame.id],
                        });
                    } else if (payload.eventType === "DELETE") {
                        const deletedGame = payload.old as Game;
                        queryClient.invalidateQueries({
                            queryKey: ["games"],
                        });
                        queryClient.invalidateQueries({
                            queryKey: ["game", deletedGame.id],
                        });
                    }
                },
            },
        );
    };

    /**
     * Subscribe to changes in the game_images table for a specific game
     */
    const useSubscribeToGameImages = (
        gameId: string,
        options?: { enabled?: boolean },
    ) => {
        // Only subscribe if enabled is not explicitly set to false and gameId exists
        if (options?.enabled === false || !gameId) {
            return { status: "disabled" };
        }

        return useSubscription(
            supabase,
            `game-images-${gameId}`,
            {
                event: "*",
                schema: "public",
                table: "game_images",
                filter: `game_id=eq.${gameId}`,
            },
            ["id"],
            {
                callback: () => {
                    queryClient.invalidateQueries({
                        queryKey: ["game-images", gameId],
                    });
                    queryClient.invalidateQueries({
                        queryKey: ["game", gameId],
                    });
                },
            },
        );
    };

    /**
     * Subscribe to changes in the game_rules table for a specific game
     * This is useful for tracking rule processing status
     */
    const useSubscribeToGameRules = (
        gameId: string,
        options?: { enabled?: boolean },
    ) => {
        // Only subscribe if enabled is not explicitly set to false and gameId exists
        if (options?.enabled === false || !gameId) {
            return { status: "disabled" };
        }

        return useSubscription(
            supabase,
            `game-rules-${gameId}`,
            {
                event: "*",
                schema: "public",
                table: "game_rules",
                filter: `game_id=eq.${gameId}`,
            },
            ["id"],
            {
                callback: () => {
                    console.log("game rules changed");
                    // Invalidate game rules queries
                    queryClient.invalidateQueries({
                        queryKey: ["game-rules", gameId],
                    });
                    // Also invalidate the game query since rules status affects the game
                    queryClient.invalidateQueries({
                        queryKey: ["game", gameId],
                    });
                },
            },
        );
    };

    return {
        useSubscribeToGames,
        useSubscribeToGameImages,
        useSubscribeToGameRules,
    };
};
