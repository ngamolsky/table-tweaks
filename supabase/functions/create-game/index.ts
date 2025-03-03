import { createClient, SupabaseClient } from "jsr:@supabase/supabase-js@2";
import { ChatOpenAI } from "npm:@langchain/openai@0.3.14";
import { corsHeaders } from "../_shared/cors.ts";
import type { Database } from "../../../src/types/database.types.ts";
import { z } from "npm:zod";

const GameSchema = z.object({
    title: z.string().describe("The title of the game"),
    description: z.string().describe("The description of the game"),
    estimated_play_time: z.string().optional().describe(
        "The estimated play time of the game",
    ),
});

type GameSchema = z.infer<typeof GameSchema>;

type RequestBody = {
    images: {
        path: string;
        isCover: boolean;
    }[];
};

type ImageType = Database["public"]["Enums"]["image_type"];

const EXTRACT_GAME_DATA_PROMPT = `
    Please extract the title, description, and estimated play time from the rule images supplied.
    If any of these fields are already provided, use those values instead of extracting them.
`;

async function downloadAndConvertToBase64(
    supabaseClient: SupabaseClient<Database>,
    imagePath: string,
    requestId: string,
): Promise<string> {
    console.log(`[${requestId}]  Downloading image ${imagePath}`);
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

Deno.serve(async (req) => {
    const requestId = crypto.randomUUID();
    console.time(`[${requestId}] Total Request`);
    console.log(`[${requestId}] Starting request processing`);

    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        const { images } = await req
            .json() as RequestBody;
        console.log(`[${requestId}] Processing ${images.length} images`);

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

        // Create initial game record
        console.time(`[${requestId}] Create Game Record`);
        const { data: game, error: gameError } = await supabaseClient
            .from("games")
            .insert({
                author_id: user.id,
                name: "Draft Game",
                status: "draft",
            })
            .select()
            .single();

        if (gameError) throw gameError;
        console.timeEnd(`[${requestId}] Create Game Record`);

        // Create game images
        console.time(`[${requestId}] Create Game Images`);
        const { error: imagesError, data: imagesData } = await supabaseClient
            .from("game_images")
            .insert(
                images.map((img) => ({
                    game_id: game.id,
                    image_url: img.path,
                    is_cover: img.isCover,
                    image_type: "rules" as ImageType,
                    uploader_id: user.id,
                })),
            )
            .select();

        if (imagesError) throw imagesError;
        console.timeEnd(`[${requestId}] Create Game Images`);

        console.time(`[${requestId}] Game Info Extraction`);
        const structuredLlm = new ChatOpenAI({
            modelName: "gpt-4o-mini",
        }).withStructuredOutput(GameSchema);

        const base64Images = await Promise.all(
            images.map((img) =>
                downloadAndConvertToBase64(supabaseClient, img.path, requestId)
            ),
        );

        const gameResponse = await structuredLlm.invoke([{
            role: "system",
            content: EXTRACT_GAME_DATA_PROMPT,
        }, {
            role: "user",
            content: base64Images.map((base64Image) => ({
                type: "image_url",
                image_url: { url: base64Image },
            })),
        }]);
        console.timeEnd(`[${requestId}] Quick Game Info Extraction`);

        // Update game with extracted info
        console.log(`[${requestId}] Updating game with extracted info`);
        const { data: gameData, error: gameUpdateError } = await supabaseClient
            .from("games")
            .update({
                name: gameResponse.title,
                description: gameResponse.description,
                estimated_time: gameResponse.estimated_play_time,
                cover_image_id: imagesData.find((img) => img.is_cover)?.id,
            })
            .eq("id", game.id)
            .select()
            .single();

        if (gameUpdateError) throw gameUpdateError;
        game.name = gameData.name;
        game.description = gameData.description;
        game.estimated_time = gameData.estimated_time;

        // Start background processing
        console.log(`[${requestId}] Starting background processing`);
        const processPromise = processGameRulesInBackground(
            supabaseClient,
            game.id,
            images.map((img) => img.path),
        );

        // @ts-ignore - Deno Deploy specific API
        EdgeRuntime.waitUntil(processPromise);

        console.timeEnd(`[${requestId}] Total Request`);

        return new Response(
            JSON.stringify({
                game: {
                    id: game.id,
                    name: game.name,
                    description: game.description,
                    estimatedTime: game.estimated_time,
                },
                message: "Game created successfully, rules processing started",
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

async function processGameRulesInBackground(
    supabaseClient: SupabaseClient<Database>,
    gameId: string,
    imagePaths: string[],
) {
    const processId = crypto.randomUUID();
    console.time(`[${processId}] Total Background Processing`);
    console.log(
        `[${processId}] Starting background processing for game ${gameId}`,
    );

    let initialRuleData: { id: string } | null = null;

    try {
        // Download all images in parallel
        console.time(`[${processId}] Download Images`);
        const base64Images = await Promise.all(
            imagePaths.map((path) =>
                downloadAndConvertToBase64(supabaseClient, path, processId)
            ),
        );
        console.timeEnd(`[${processId}] Download Images`);

        // Create initial rules entry
        console.log(`[${processId}] Creating initial rules entry`);
        const { data, error: initialRuleError } = await supabaseClient
            .from("game_rules")
            .insert({
                game_id: gameId,
                processing_status: "processing" as const,
            })
            .select()
            .single();

        if (initialRuleError) throw initialRuleError;
        initialRuleData = data;

        console.time(`[${processId}] AI Rules Extraction`);
        console.log(`[${processId}] Extracting detailed rules using AI`);
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

        console.timeEnd(`[${processId}] AI Rules Extraction`);

        // Update rules with extracted data
        await supabaseClient
            .from("game_rules")
            .update({
                raw_text: processedRules.raw_text,
                structured_content: processedRules.metadata,
                processing_status: "completed" as const,
                processed_at: new Date().toISOString(),
            })
            .eq("id", initialRuleData.id);

        console.timeEnd(`[${processId}] Total Background Processing`);
    } catch (error) {
        console.timeEnd(`[${processId}] Total Background Processing`);
        console.error(`[${processId}] Background processing failed:`, error);

        // Update rules entry with error status if it was created
        if (initialRuleData) {
            await supabaseClient
                .from("game_rules")
                .update({
                    processing_status: "error" as const,
                    processed_at: new Date().toISOString(),
                })
                .eq("id", initialRuleData.id);
        }
    }
}

const PlayerCountSchema = z.object({
    min: z.number().describe("Minimum number of players required"),
    max: z.number().describe("Maximum number of players allowed"),
    recommended: z.number().optional().describe(
        "Recommended number of players",
    ),
});

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

const GameRulesSchema = z.object({
    raw_text: z.string().describe(
        "The complete, unstructured rules text extracted from all images",
    ),
    metadata: MetadataSchema,
});

type GameRulesSchema = z.infer<typeof GameRulesSchema>;

const EXTRACT_GAME_RULES_PROMPT =
    `Analyze the provided game rule images and extract structured information.

Important:
1. Extract the complete rules text exactly as written in the images for raw_text
3. For player_count, use actual numbers (e.g. "2" not "two")
4. Include all key mechanics you can identify
5. List components and phases if clearly specified

Process all images together as they may contain different parts of the rules.`;
