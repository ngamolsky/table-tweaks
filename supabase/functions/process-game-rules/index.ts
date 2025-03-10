import { createClient, SupabaseClient } from "jsr:@supabase/supabase-js@2";
import { ChatOpenAI } from "npm:@langchain/openai@0.3.14";
import { corsHeaders } from "../_shared/cors.ts";
import type {
    Database,
    Json,
    Tables,
} from "../../../src/types/database.types.ts";
import { z } from "npm:zod";

type RequestBody = {
    gameId: string;
    images: {
        path: string;
        order_index?: number;
    }[];
};

type ImageType = Database["public"]["Enums"]["image_type"];

// Schema for player count information
const PlayerCountSchema = z.object({
    min: z.number().describe("Minimum number of players required"),
    max: z.number().describe("Maximum number of players allowed"),
    recommended: z.number().optional().describe(
        "Recommended number of players",
    ),
});

// Schema for structured metadata about the game rules
const MetadataSchema = z.object({
    key_mechanics: z.array(z.string()).describe(
        "List of key gameplay mechanics identified",
    ),
    setup_instructions: z.string().optional().describe(
        "Instructions for setting up the game",
    ),
    victory_conditions: z.string().optional().describe(
        "Conditions for winning the game",
    ),
    player_count: PlayerCountSchema.optional().describe(
        "Player count requirements",
    ),
    components: z.array(z.string()).optional().describe(
        "List of game components needed",
    ),
    phases_of_play: z.array(z.string()).optional().describe(
        "Main phases or steps of gameplay",
    ),
});

// Schema for the complete game rules extraction
const GameRulesSchema = z.object({
    raw_text: z.string().describe(
        "The complete, unstructured rules text extracted from all images",
    ),
    metadata: MetadataSchema,
});

type GameRulesSchema = z.infer<typeof GameRulesSchema>;

// Prompt for the AI to extract game rules
const EXTRACT_GAME_RULES_PROMPT =
    `Analyze the provided game rule images and extract structured information.

Important:
1. Extract the complete rules text exactly as written in the images for raw_text
2. For player_count, use actual numbers (e.g. "2" not "two")
3. Include all key mechanics you can identify
4. List components and phases if clearly specified

Process all images together as they may contain different parts of the rules.`;

/**
 * Updates the processing progress for a game rule
 */
async function updateProcessingProgress(
    supabaseClient: SupabaseClient<Database>,
    ruleId: string,
    progress: Record<string, unknown>,
    requestId: string,
): Promise<void> {
    console.log(
        `[${requestId}] Updating processing progress: ${
            JSON.stringify(progress)
        }`,
    );

    const { error } = await supabaseClient
        .from("game_rules")
        .update({
            processing_progress: progress as Json,
            updated_at: new Date().toISOString(),
        })
        .eq("id", ruleId);

    if (error) {
        console.error(`[${requestId}] Error updating progress:`, error);
    }
}

/**
 * Downloads an image from Supabase storage and converts it to base64
 */
async function downloadAndConvertToBase64(
    supabaseClient: SupabaseClient<Database>,
    imagePath: string,
    requestId: string,
): Promise<string> {
    console.log(`[${requestId}] Downloading image ${imagePath}`);
    const { data, error } = await supabaseClient
        .storage
        .from("game_images")
        .download(imagePath);

    if (error) throw error;

    return await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(data);
    });
}

/**
 * Process game rules images and extract structured information
 */
async function processGameRules(
    supabaseClient: SupabaseClient<Database>,
    gameId: string,
    imageData: { path: string; order_index?: number }[],
    requestId: string,
): Promise<Tables<"game_rules">> {
    console.time(`[${requestId}] Rules Processing`);

    // Get the rule entry that was created in the main function
    const { data: ruleData, error: ruleError } = await supabaseClient
        .from("game_rules")
        .select("*")
        .eq("game_id", gameId)
        .eq("processing_request_id", requestId)
        .single();

    if (ruleError || !ruleData) {
        throw new Error(
            `Failed to find rule entry: ${ruleError?.message || "Not found"}`,
        );
    }

    // Update to processing status
    const { error: updateError } = await supabaseClient
        .from("game_rules")
        .update({
            processing_status: "processing" as const,
            processing_attempts: (ruleData.processing_attempts || 0) + 1,
            last_attempt_at: new Date().toISOString(),
            processing_progress: {
                stage: "started",
                total_images: imageData.length,
            },
            error_message: null, // Clear any previous error
        })
        .eq("id", ruleData.id)
        .select()
        .single();

    if (updateError) throw updateError;

    try {
        // Sort images by order_index if available
        const sortedImageData = [...imageData].sort((a, b) =>
            (a.order_index ?? Number.MAX_SAFE_INTEGER) -
            (b.order_index ?? Number.MAX_SAFE_INTEGER)
        );

        // Extract just the paths for backward compatibility
        const imagePaths = sortedImageData.map((img) => img.path);

        // Download all images in parallel
        console.time(`[${requestId}] Download Images`);
        await updateProcessingProgress(
            supabaseClient,
            ruleData.id,
            {
                stage: "downloading_images",
                progress: 0,
                total: imagePaths.length,
            },
            requestId,
        );

        const base64Images = await Promise.all(
            imagePaths.map(async (path, index) => {
                const result = await downloadAndConvertToBase64(
                    supabaseClient,
                    path,
                    requestId,
                );
                // Update progress after each image
                await updateProcessingProgress(
                    supabaseClient,
                    ruleData.id,
                    {
                        stage: "downloading_images",
                        progress: index + 1,
                        total: imagePaths.length,
                    },
                    requestId,
                );
                return result;
            }),
        );
        console.timeEnd(`[${requestId}] Download Images`);

        // Create game image records if they don't exist
        console.time(`[${requestId}] Create Game Images`);
        await updateProcessingProgress(
            supabaseClient,
            ruleData.id,
            { stage: "creating_image_records" },
            requestId,
        );

        const { data: existingImages } = await supabaseClient
            .from("game_images")
            .select("image_url")
            .eq("game_id", gameId)
            .eq("image_type", "rules");

        const existingImagePaths = existingImages?.map((img) =>
            img.image_url
        ) || [];

        // Filter out existing images and keep the order_index information
        const newImages = sortedImageData.filter((img) =>
            !existingImagePaths.includes(img.path)
        );

        if (newImages.length > 0) {
            // Get user ID from the game record
            const { data: gameData } = await supabaseClient
                .from("games")
                .select("author_id")
                .eq("id", gameId)
                .single();

            if (!gameData) throw new Error("Game not found");

            await supabaseClient
                .from("game_images")
                .insert(
                    newImages.map((img, index) => ({
                        game_id: gameId,
                        image_url: img.path,
                        is_cover: false,
                        image_type: "rules" as ImageType,
                        uploader_id: gameData.author_id,
                        order_index: img.order_index ?? index,
                    })),
                );
        }
        console.timeEnd(`[${requestId}] Create Game Images`);

        // Extract rules using AI
        console.time(`[${requestId}] AI Rules Extraction`);
        await updateProcessingProgress(
            supabaseClient,
            ruleData.id,
            { stage: "ai_processing", model: "gpt-4o" },
            requestId,
        );

        console.log(`[${requestId}] Extracting detailed rules using AI`);
        const structuredLlm = new ChatOpenAI({
            modelName: "gpt-4o",
        }).withStructuredOutput(GameRulesSchema);

        const processedRules = await structuredLlm.invoke([{
            role: "system",
            content: EXTRACT_GAME_RULES_PROMPT,
        }, {
            role: "user",
            content: base64Images.map((base64Image) => ({
                type: "image_url",
                image_url: { url: base64Image },
            })),
        }]);
        console.timeEnd(`[${requestId}] AI Rules Extraction`);

        // Update rules with extracted data
        await updateProcessingProgress(
            supabaseClient,
            ruleData.id,
            { stage: "finalizing", status: "success" },
            requestId,
        );

        const { data: updatedRules, error: updateError } = await supabaseClient
            .from("game_rules")
            .update({
                raw_text: processedRules.raw_text,
                structured_content: processedRules.metadata,
                processing_status: "completed" as const,
                processed_at: new Date().toISOString(),
                processing_progress: { stage: "completed", status: "success" },
            })
            .eq("id", ruleData.id)
            .select()
            .single();

        if (updateError) throw updateError;

        console.timeEnd(`[${requestId}] Rules Processing`);
        return updatedRules;
    } catch (error) {
        console.error(`[${requestId}] Rules processing failed:`, error);

        // Update rules entry with error status
        const errorMessage = error instanceof Error
            ? error.message
            : "Unknown error";

        const { data: errorRules, error: updateError } = await supabaseClient
            .from("game_rules")
            .update({
                processing_status: "error" as const,
                processed_at: new Date().toISOString(),
                error_message: errorMessage,
                processing_progress: {
                    stage: "error",
                    error: errorMessage,
                    timestamp: new Date().toISOString(),
                },
            })
            .eq("id", ruleData.id)
            .select()
            .single();

        if (updateError) {
            console.error(
                `[${requestId}] Error updating rules status:`,
                updateError,
            );
        }

        console.timeEnd(`[${requestId}] Rules Processing`);
        return errorRules!;
    }
}

Deno.serve(async (req) => {
    const requestId = crypto.randomUUID();
    console.time(`[${requestId}] Total Request`);
    console.log(`[${requestId}] Starting game rules processing request`);

    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        const { gameId, images } = await req.json() as RequestBody;
        console.log(
            `[${requestId}] Processing rules for game ${gameId} with ${images.length} images`,
        );

        if (!gameId) throw new Error("Missing gameId parameter");
        if (!images || !images.length) throw new Error("No images provided");

        console.time(`[${requestId}] Authentication`);
        const authHeader = req.headers.get("Authorization");
        if (!authHeader) throw new Error("Missing authorization header");

        const supabaseClient = createClient<Database>(
            Deno.env.get("SUPABASE_URL")!,
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
        );

        const { data: { user }, error: userError } = await supabaseClient.auth
            .getUser(authHeader.replace("Bearer ", ""));

        if (userError || !user) throw new Error("Invalid authorization token");
        console.timeEnd(`[${requestId}] Authentication`);

        // Check if the game exists and user has access
        const { data: game, error: gameError } = await supabaseClient
            .from("games")
            .select("*")
            .eq("id", gameId)
            .single();

        if (gameError || !game) throw new Error("Game not found");
        if (game.author_id !== user.id) {
            throw new Error("Unauthorized access to game");
        }

        // Check if there's an existing game_rules entry
        const { data: existingRules, error: existingRulesError } =
            await supabaseClient
                .from("game_rules")
                .select("id")
                .eq("game_id", gameId)
                .maybeSingle();

        if (existingRulesError) {
            throw new Error(
                `Failed to check for existing rules: ${existingRulesError.message}`,
            );
        }

        let ruleData;
        if (existingRules) {
            // Get current attempts count
            const { data: currentRule } = await supabaseClient
                .from("game_rules")
                .select("processing_attempts")
                .eq("id", existingRules.id)
                .single();

            const currentAttempts = currentRule?.processing_attempts || 0;

            // Update existing rule
            const { data: updatedRule, error: updateError } =
                await supabaseClient
                    .from("game_rules")
                    .update({
                        processing_status: "queued",
                        processing_attempts: currentAttempts + 1,
                        last_attempt_at: new Date().toISOString(),
                        processing_progress: {
                            stage: "queued",
                            queued_at: new Date().toISOString(),
                            images_count: images.length,
                        },
                        processing_request_id: requestId,
                        error_message: null,
                    })
                    .eq("id", existingRules.id)
                    .select()
                    .single();

            if (updateError || !updatedRule) {
                throw new Error(
                    `Failed to update rule: ${
                        updateError?.message || "Unknown error"
                    }`,
                );
            }
            ruleData = updatedRule;
        } else {
            // Create new rule
            const { data: newRule, error: insertError } = await supabaseClient
                .from("game_rules")
                .insert({
                    game_id: gameId,
                    processing_status: "queued",
                    processing_attempts: 1,
                    last_attempt_at: new Date().toISOString(),
                    processing_progress: {
                        stage: "queued",
                        queued_at: new Date().toISOString(),
                        images_count: images.length,
                    },
                    processing_request_id: requestId,
                })
                .select()
                .single();

            if (insertError || !newRule) {
                throw new Error(
                    `Failed to create rule: ${
                        insertError?.message || "Unknown error"
                    }`,
                );
            }
            ruleData = newRule;

            // Update the game to point to this rule
            const { error: gameUpdateError } = await supabaseClient
                .from("games")
                .update({
                    game_rule_id: newRule.id,
                    updated_at: new Date().toISOString(),
                })
                .eq("id", gameId);

            if (gameUpdateError) {
                console.error(
                    `Failed to update game with rule ID: ${gameUpdateError.message}`,
                );
                // Continue processing even if this fails
            }
        }

        // Process rules in the background
        const processPromise = processGameRules(
            supabaseClient,
            gameId,
            images,
            requestId,
        );

        // @ts-ignore - Deno Deploy specific API
        EdgeRuntime.waitUntil(processPromise);

        console.timeEnd(`[${requestId}] Total Request`);

        return new Response(
            JSON.stringify({
                message: "Game rules processing started",
                gameId: gameId,
                requestId: requestId,
                ruleId: ruleData.id,
            }),
            {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: 200,
            },
        );
    } catch (error) {
        console.timeEnd(`[${requestId}] Total Request`);
        console.error(`[${requestId}] Error processing request:`, error);

        const message = error instanceof Error
            ? error.message
            : "Unknown error";
        return new Response(
            JSON.stringify({ error: message }),
            {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: 500,
            },
        );
    }
});
