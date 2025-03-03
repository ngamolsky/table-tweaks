import { useStorage } from "@/hooks/storage";
import { useGamesQueries } from "./useGamesQueries";
import { useMutation, useQueryClient } from "@tanstack/react-query";

/**
 * Hook for game image operations
 */
export const useGameImages = () => {
    const { getFileUrl, uploadFiles } = useStorage();
    const { getGameImages } = useGamesQueries();
    const queryClient = useQueryClient();

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

    /**
     * Upload game images to storage
     */
    const uploadGameImagesMutation = uploadFiles("game_images");

    /**
     * Upload game images with metadata
     */
    const uploadGameImages = useMutation({
        mutationFn: async ({
            userId,
            images,
        }: {
            userId: string;
            images: Array<{ file: File; isCover: boolean }>;
        }) => {
            // Generate timestamp for unique filenames
            const timestamp = new Date().getTime();
            // Format the files for the upload mutation with timestamp in filename
            const files = images.map((image) => {
                const originalName = image.file.name;
                const extension = originalName.split(".").pop() || "";
                const baseName = encodeURIComponent(
                    originalName.substring(0, originalName.lastIndexOf(".")) ||
                        originalName,
                );

                // Create a new file with timestamped name
                const newFileName = `${baseName}_${timestamp}.${extension}`;
                return new File([image.file], newFileName, {
                    type: image.file.type,
                });
            });

            const path = `user.${userId}/rules`;

            // Use the upload mutation
            const results = await uploadGameImagesMutation.mutateAsync({
                files,
                path,
            });

            // Process the results
            return results.map((result, index) => {
                // Check if the upload was successful
                if (!result.data) {
                    throw new Error(
                        `Failed to upload file: ${
                            result.error?.message || "Unknown error"
                        }`,
                    );
                }

                return {
                    path: result.data.path,
                    isCover: images[index].isCover,
                };
            });
        },
        onSuccess: () => {
            // Invalidate relevant queries
            queryClient.invalidateQueries({
                queryKey: ["storage", "game-images"],
            });
        },
    });

    return {
        getGameImageUrl,
        getGameImagesWithUrls,
        uploadGameImages,
        isUploading: uploadGameImages.isPending,
    };
};
