import { supabase } from "src/lib/supabase";
import { useStorage } from "@/hooks/storage";

interface UploadedImage {
    path: string;
    isCover: boolean;
}

interface GameProcessingResult {
    game: {
        id: string;
        name: string;
        description: string;
        estimatedTime: string;
    };
    message: string;
}

/**
 * Processes game images through the edge function
 * This handles uploading images to storage and creating the initial game
 * with AI processing of the rules
 */
export const processGameImages = async (
    uploadedImages: UploadedImage[],
): Promise<GameProcessingResult> => {
    const { data, error } = await supabase.functions.invoke<
        GameProcessingResult
    >(
        "create-game",
        {
            body: {
                images: uploadedImages,
            },
        },
    );

    if (error || !data) {
        throw new Error(error?.message || "Failed to create game");
    }

    return data;
};

/**
 * Uploads game images to storage
 * @param userId The ID of the user uploading the images
 * @param images The images to upload
 * @returns An array of uploaded image objects
 */
export const uploadGameImages = async (
    userId: string,
    images: Array<{ file: File; isCover: boolean }>,
): Promise<UploadedImage[]> => {
    // We can't use the React hooks directly in a non-React function
    // So we'll use the direct Supabase client here
    return Promise.all(
        images.map(async (image) => {
            const path =
                `user.${userId}/rules/${crypto.randomUUID()}-${image.file.name}`;
            const { error } = await supabase.storage
                .from("game-images")
                .upload(path, image.file);

            if (error) throw error;

            return {
                path,
                isCover: image.isCover,
            };
        }),
    );
};

/**
 * React component hook for uploading game images
 * This is a wrapper around the useStorage hook that provides a more specific API
 * for game image uploads
 */
export const useGameImageUpload = () => {
    const { uploadFiles } = useStorage();

    // Get the upload mutation for the game-images bucket
    const uploadMutation = uploadFiles("game-images");

    // Return a function that handles the upload with the correct path format
    const uploadGameImages = (
        userId: string,
        images: Array<{ file: File; isCover: boolean }>,
    ) => {
        // Format the files for the upload mutation
        const files = images.map((image) => image.file);
        const path = `user.${userId}/rules`;

        // Use the mutation
        return uploadMutation.mutateAsync({
            files,
            path,
        }).then((results) => {
            // Map the results to the expected format
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
                    path: `${path}/${result.data.path}`,
                    isCover: images[index].isCover,
                };
            });
        });
    };

    return {
        uploadGameImages,
        isUploading: uploadMutation.isPending,
    };
};
