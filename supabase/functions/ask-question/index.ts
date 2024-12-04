// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { ChatOpenAI } from "npm:@langchain/openai@0.3.14";
import { ChatAnthropic } from "npm:@langchain/anthropic@0.3.8";
import { corsHeaders } from "../_shared/cors.ts";
import type { Database, Enums, Tables } from "../../../types/database.types.ts";

type Game = Tables<"games"> & {
  rules_images: Array<Tables<"rules_images">>;
  example_images: Array<Tables<"example_images">>;
};

// Add type definitions
type QuestionType = "rules" | "examples";

interface RequestBody {
  gameId: string;
  userPrompt: string;
  n?: number;
  questionType: QuestionType;
}

// Helper function to get AI model
function getAIModel(
  modelPreference: Enums<"ai_model"> | null = null,
) {
  const defaultModel = "anthropic__claude-3-haiku-20240307";
  const modelToUse = modelPreference || defaultModel;

  console.log(`Getting AI model for preference: ${modelToUse}`);
  const [provider, model] = modelToUse.split("__");

  if (provider === "anthropic") {
    console.log(`Using Anthropic model: ${model}`);
    return new ChatAnthropic({
      apiKey: Deno.env.get("ANTHROPIC_API_KEY")!,
      modelName: model,
    });
  }

  console.log(`Using OpenAI model: ${model || "gpt-4o-mini"}`);
  return new ChatOpenAI({
    apiKey: Deno.env.get("OPENAI_API_KEY")!,
    modelName: model || "gpt-4o-mini",
  });
}

function generatePrompt(
  game: Game,
  questionType: QuestionType,
  userPrompt: string,
  rulesImagesData: Array<{
    extracted_text: string | null;
    additional_info: string | null;
    display_order: number;
  }>,
  exampleImagesData: Array<{
    extracted_pattern: string | null;
    extracted_content: string | null;
    additional_info: string | null;
  }>,
  n?: number,
): string {
  const rulesText = rulesImagesData
    .sort((a, b) => a.display_order - b.display_order)
    .map((rule) =>
      [rule.extracted_text, rule.additional_info]
        .filter(Boolean)
        .join("\n")
    )
    .join("\n\n");

  const examplesText = exampleImagesData
    .map((example) =>
      [
        example.extracted_pattern,
        example.extracted_content,
        example.additional_info,
      ]
        .filter(Boolean)
        .join("\n")
    )
    .join("\n\n");

  const baseContext = `
    Game Title: ${game.title}
    Game Description: ${game.description}

    Game Rules:
    ${rulesText}

    Game Examples:
    ${examplesText}

    Additional Context from User: ${userPrompt}
  `;

  if (questionType === "rules") {
    return `
      ${baseContext}
      
      Please answer the user's question about the game rules based on the provided information.
      Be specific and reference the rules directly when possible.
    `;
  }

  return `
    ${baseContext}
    
    Based on the provided game rules and examples, generate ${
    n ?? 1
  } creative examples that follow the same pattern and rules.
    Only include the examples themselves, with no additional text or explanation.
    The generated examples should be in the same style and format as the examples provided.
    
  `;
}

Deno.serve(async (req) => {
  console.log(`Received ${req.method} request`);

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const requestBody = await req.json() as RequestBody;

    const { gameId, userPrompt, n = 1, questionType } = requestBody;
    console.log("Request payload:", { gameId, userPrompt, n, questionType });

    if (!gameId) {
      throw new Error("gameId is required");
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY");
    const gameAssetsBucket = Deno.env.get("GAME_ASSETS_BUCKET");

    if (!supabaseUrl || !supabaseKey || !gameAssetsBucket) {
      throw new Error("Missing Supabase environment variables");
    }

    const supabaseClient = createClient<Database>(
      supabaseUrl,
      supabaseKey,
      {
        global: {
          headers: { Authorization: req.headers.get("Authorization")! },
        },
      },
    );

    console.log(
      "Fetching user data...",
    );

    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;

    if (!user) {
      throw new Error("User not found");
    }

    console.log("Fetching game data...");
    // Fetch game data and user preferences
    const [gameResult, preferencesResult] = await Promise.all([
      supabaseClient
        .from("games")
        .select(`
          *,
          rules_images (
            image_path,
            display_order,
            extracted_text,
            additional_info,
            processing_status
          ),
          example_images (
            image_path,
            extracted_pattern,
            extracted_content,
            additional_info,
            processing_status
          )
        `)
        .eq("id", gameId)
        .single(),
      supabaseClient
        .from("user_preferences")
        .select("ai_model")
        .eq("user_id", user.id)
        .single(),
    ]);

    if (gameResult.error) {
      console.error("Error fetching game:", gameResult.error);
      throw gameResult.error;
    }

    const game = gameResult.data as Game;

    if (!game) {
      throw new Error(`Game not found with id: ${gameId}`);
    }

    console.log("Game data:", {
      id: game.id,
      title: game.title,
      rulesImagesCount: game.rules_images.length,
      exampleImagesCount: game.example_images.length,
    });

    // Check if any rules images are not processed yet
    const unprocessedRules = game.rules_images.filter(
      (img) => img.processing_status !== "completed",
    );

    // Check if any example images are not processed yet
    const unprocessedExamples = game.example_images.filter(
      (img) => img.processing_status !== "completed",
    );

    console.log("Unprocessed rules:", unprocessedRules);
    console.log("Unprocessed examples:", unprocessedExamples);

    if (unprocessedRules.length > 0 || unprocessedExamples.length > 0) {
      const unprocessedPaths = [
        ...unprocessedRules.map((img) => img.image_path),
        ...unprocessedExamples.map((img) => img.image_path),
      ];
      throw new Error(
        `The following images are still being processed: ${
          unprocessedPaths.join(", ")
        }. Please try again in a few moments.`,
      );
    }

    // Get processed fields from rules and example images
    console.log("Getting processed rules images data...");
    const rulesImagesData = game.rules_images.map((img) => ({
      image_path: img.image_path,
      display_order: img.display_order,
      extracted_text: img.extracted_text,
      additional_info: img.additional_info,
    }));

    console.log("Getting processed example images data...");
    const exampleImagesData = game.example_images.map((img) => ({
      image_path: img.image_path,
      extracted_pattern: img.extracted_pattern,
      extracted_content: img.extracted_content,
      additional_info: img.additional_info,
    }));

    console.log("Successfully gathered all processed image data");

    const prompt = generatePrompt(
      game,
      questionType,
      userPrompt,
      rulesImagesData,
      exampleImagesData,
      n,
    );

    console.log("Generated prompt:", prompt);

    const modelPreference = preferencesResult.data?.ai_model ?? null;
    const aiModel = getAIModel(modelPreference);

    console.log("Calling AI model...");
    const response = await aiModel.invoke([
      {
        role: "user",
        content: prompt,
      },
    ]);

    const reply = response.content;
    console.log("Successfully received AI response");
    console.log("Reply:", reply);

    return new Response(JSON.stringify({ suggestion: reply }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error processing request:", error);
    const errorMessage = error instanceof Error
      ? error.message
      : "An unknown error occurred";
    return new Response(
      JSON.stringify({
        error: errorMessage,
        timestamp: new Date().toISOString(),
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      },
    );
  }
});
