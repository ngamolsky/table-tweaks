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

interface GameRulesProcessingResult {
    message: string;
    gameId: string;
}

interface RuleImage {
    path: string;
    order_index?: number;
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
 * Processes game rules images through the dedicated edge function
 * This is used to add rules to an existing game, either created manually
 * or imported from BoardGameGeek
 */
export const processGameRules = async (
    gameId: string,
    uploadedImages: RuleImage[],
): Promise<GameRulesProcessingResult> => {
    const { data, error } = await supabase.functions.invoke<
        GameRulesProcessingResult
    >(
        "process-game-rules",
        {
            body: {
                gameId,
                images: uploadedImages,
            },
        },
    );

    if (error || !data) {
        throw new Error(error?.message || "Failed to process game rules");
    }

    return data;
};
