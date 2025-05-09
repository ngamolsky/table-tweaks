import { useStorage } from "@/hooks/storage";
import { useGamesQueries } from "./useGamesQueries";
import { useMutation, useQueryClient } from "@tanstack/react-query";

/**
 * Hook for game image operations
 */
export const useGameImages = () => {
    const { useFileUrl, useUploadFiles } = useStorage();
    const { useGameImages } = useGamesQueries();
    const queryClient = useQueryClient();

    /**
     * Get the URL for a game image
     */
    const useGameImageUrl = (
        path: string,
        options?: { enabled?: boolean; expiresIn?: number },
    ) => {
        return useFileUrl("game-images", path, options);
    };

    /**
     * Get all images for a game with their URLs
     */
    const useGameImagesWithUrls = (
        gameId: string,
        options?: { enabled?: boolean },
    ) => {
        // Get the game images from the database
        const imagesQuery = useGameImages(gameId, options);

        // If we have images, get their URLs
        const images = imagesQuery.data?.map((image) => {
            // The image_url field contains the path in storage
            // Get the URL for each image
            const urlQuery = useGameImageUrl(image.image_url, {
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
    const uploadGameImagesMutation = useUploadFiles("game_images");

    /**
     * Upload game images with metadata
     */
    const useUploadGameImages = useMutation({
        mutationFn: async ({
            userId,
            images,
        }: {
            userId: string;
            images: Array<
                { file: File; isCover: boolean; order_index?: number }
            >;
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
                    order_index: images[index].order_index || index,
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
        useGameImageUrl,
        useGameImagesWithUrls,
        useUploadGameImages,
        isUploading: useUploadGameImages.isPending,
    };
};
