import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
    useDeleteMutation,
    useInsertMutation,
    useUpdateMutation,
} from "@supabase-cache-helpers/postgrest-react-query";
import { supabase } from "@/lib/supabase";
import { Game } from "./types";

/**
 * Hook for game-related mutations
 */
export const useGamesMutations = () => {
    const queryClient = useQueryClient();

    /**
     * Create a new game
     */
    const useCreateGame = useInsertMutation(
        supabase.from("games"),
        ["id"],
        null,
    );

    /**
     * Create a new game image
     */
    const useCreateGameImage = useInsertMutation(supabase.from("game_images"), [
        "id",
    ], null);

    /**
     * Update a game
     */
    const useUpdateGame = useUpdateMutation(
        supabase.from("games"),
        ["id"],
        null,
    );

    /**
     * Delete a game
     */
    const useDeleteGame = useDeleteMutation(
        supabase.from("games"),
        ["id"],
        null,
    );

    /**
     * Update a game's status
     */
    const useUpdateGameStatus = useMutation({
        mutationFn: async ({
            id,
            status,
        }: {
            id: string;
            status: Game["status"];
        }) => {
            const { data, error } = await supabase
                .from("games")
                .update({ status })
                .eq("id", id)
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ["games"] });
            queryClient.invalidateQueries({
                queryKey: ["game", variables.id],
            });
        },
    });

    /**
     * Set a game's cover image
     */
    const useSetGameCoverImage = useMutation({
        mutationFn: async ({
            gameId,
            imageId,
        }: {
            gameId: string;
            imageId: string;
        }) => {
            const { data, error } = await supabase
                .from("games")
                .update({ cover_image_id: imageId })
                .eq("id", gameId)
                .select()
                .single();

            if (error) throw error;
            return data;
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ["games"] });
            queryClient.invalidateQueries({
                queryKey: ["game", variables.gameId],
            });
        },
    });

    /**
     * Retry processing rules for a game
     */
    const useRetryProcessRules = useMutation({
        mutationFn: async (
            { gameId, images }: { gameId: string; images: { path: string }[] },
        ) => {
            const { data, error } = await supabase.functions.invoke(
                "process-game-rules",
                {
                    body: { gameId, images },
                },
            );

            if (error) throw error;
            return data;
        },
    });

    return {
        useCreateGame,
        useCreateGameImage,
        useUpdateGame,
        useDeleteGame,
        useUpdateGameStatus,
        useSetGameCoverImage,
        useRetryProcessRules,
    };
};
