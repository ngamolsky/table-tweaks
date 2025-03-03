import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useEffect } from "react";
import { REALTIME_POSTGRES_CHANGES_LISTEN_EVENT } from "@supabase/supabase-js";
import { Game } from "./types";

/**
 * Hook for game-related subscriptions
 */
export const useGamesSubscriptions = () => {
    const queryClient = useQueryClient();

    /**
     * Subscribe to changes in the games table
     */
    const subscribeToGames = (options?: { enabled?: boolean }) => {
        useEffect(() => {
            if (options?.enabled === false) return;

            const channel = supabase
                .channel("games-changes")
                .on(
                    "postgres_changes",
                    {
                        event: "*",
                        schema: "public",
                        table: "games",
                    },
                    (payload) => {
                        // Handle different events
                        if (
                            payload.eventType ===
                                REALTIME_POSTGRES_CHANGES_LISTEN_EVENT.INSERT
                        ) {
                            queryClient.invalidateQueries({
                                queryKey: ["games"],
                            });
                        } else if (
                            payload.eventType ===
                                REALTIME_POSTGRES_CHANGES_LISTEN_EVENT.UPDATE
                        ) {
                            const updatedGame = payload.new as Game;
                            queryClient.invalidateQueries({
                                queryKey: ["games"],
                            });
                            queryClient.invalidateQueries({
                                queryKey: ["game", updatedGame.id],
                            });
                        } else if (
                            payload.eventType ===
                                REALTIME_POSTGRES_CHANGES_LISTEN_EVENT.DELETE
                        ) {
                            const deletedGame = payload.old as Game;
                            queryClient.invalidateQueries({
                                queryKey: ["games"],
                            });
                            queryClient.invalidateQueries({
                                queryKey: ["game", deletedGame.id],
                            });
                        }
                    },
                )
                .subscribe();

            return () => {
                supabase.removeChannel(channel);
            };
        }, [queryClient]);
    };

    /**
     * Subscribe to changes in the game_images table for a specific game
     */
    const subscribeToGameImages = (
        gameId: string,
        options?: { enabled?: boolean },
    ) => {
        useEffect(() => {
            if (options?.enabled === false || !gameId) return;

            const channel = supabase
                .channel(`game-images-${gameId}`)
                .on(
                    "postgres_changes",
                    {
                        event: "*",
                        schema: "public",
                        table: "game_images",
                        filter: `game_id=eq.${gameId}`,
                    },
                    () => {
                        queryClient.invalidateQueries({
                            queryKey: ["game-images", gameId],
                        });
                        queryClient.invalidateQueries({
                            queryKey: ["game", gameId],
                        });
                    },
                )
                .subscribe();

            return () => {
                supabase.removeChannel(channel);
            };
        }, [gameId, queryClient, options?.enabled]);
    };

    return {
        subscribeToGames,
        subscribeToGameImages,
    };
};
