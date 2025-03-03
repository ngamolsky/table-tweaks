import { supabase } from "@/lib/supabase";

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
