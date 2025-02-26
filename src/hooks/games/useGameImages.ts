import { useStorage } from "@/hooks/storage";
import { useGamesQueries } from "./useGamesQueries";

/**
 * Hook for game image operations
 */
export const useGameImages = () => {
    const { getFileUrl } = useStorage();
    const { getGameImages } = useGamesQueries();

    /**
     * Get the URL for a game image
     */
    const getGameImageUrl = (
        path: string,
        options?: { enabled?: boolean; expiresIn?: number },
    ) => {
        return getFileUrl("game-images", path, options);
    };

    /**
     * Get all images for a game with their URLs
     */
    const getGameImagesWithUrls = (
        gameId: string,
        options?: { enabled?: boolean },
    ) => {
        // Get the game images from the database
        const imagesQuery = getGameImages(gameId, options);

        // If we have images, get their URLs
        const images = imagesQuery.data?.map((image) => {
            // The image_url field contains the path in storage
            // Get the URL for each image
            const urlQuery = getGameImageUrl(image.image_url, {
                enabled: imagesQuery.isSuccess && !!image.image_url,
                expiresIn: 60 * 60 * 24, // 24 hours
            });

            return {
                ...image,
                url: urlQuery.data,
                isLoadingUrl: urlQuery.isLoading,
                urlError: urlQuery.error,
            };
        }) || [];

        return {
            ...imagesQuery,
            imagesWithUrls: images,
        };
    };

    return {
        getGameImageUrl,
        getGameImagesWithUrls,
    };
};
