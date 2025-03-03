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
    const createGame = useInsertMutation(supabase.from("games"), ["id"], null);

    /**
     * Create a new game image
     */
    const createGameImage = useInsertMutation(supabase.from("game_images"), [
        "id",
    ], null);

    /**
     * Update a game
     */
    const updateGame = useUpdateMutation(supabase.from("games"), ["id"], null);

    /**
     * Delete a game
     */
    const deleteGame = useDeleteMutation(supabase.from("games"), ["id"], null);

    /**
     * Update a game's status
     */
    const updateGameStatus = useMutation({
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
    const setGameCoverImage = useMutation({
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

    return {
        createGame,
        createGameImage,
        updateGame,
        deleteGame,
        updateGameStatus,
        setGameCoverImage,
    };
};
