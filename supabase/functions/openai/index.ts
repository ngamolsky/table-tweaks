// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import OpenAI from "https://deno.land/x/openai@v4.24.0/mod.ts";
import { corsHeaders } from "../_shared/cors.ts";
import type { Database, Tables } from "../../../types/database.types.ts";

type Game = Tables<"games"> & {
  rules_images: Array<Tables<"rules_images">>;
  example_images: Array<Tables<"example_images">>;
};

// Update helper function to get signed URL and fetch image
async function getBase64Image(
  imagePath: string,
  supabaseClient: ReturnType<typeof createClient<Database>>,
  gameAssetsBucket: string,
): Promise<string> {
  try {
    const { data: blob, error: downloadError } = await supabaseClient
      .storage
      .from(gameAssetsBucket)
      .download(imagePath);

    if (downloadError) {
      throw new Error(`Failed to download image: ${downloadError.message}`);
    }

    // Process the array buffer in chunks
    const arrayBuffer = await blob.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    const chunkSize = 1024; // Process 1KB at a time
    const chunks: string[] = [];

    for (let i = 0; i < uint8Array.length; i += chunkSize) {
      const chunk = uint8Array.slice(i, i + chunkSize);
      chunks.push(String.fromCharCode(...chunk));
    }

    const base64String = btoa(chunks.join(""));
    return `data:image/${blob.type};base64,${base64String}`;
  } catch (error) {
    console.error(`Error encoding image ${imagePath}:`, error);
    throw error;
  }
}

Deno.serve(async (req) => {
  console.log(`Received ${req.method} request`);

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Get request data
    const requestBody = await req.json();
    const { gameId, userPrompt, n } = requestBody;
    console.log("Request payload:", { gameId, userPrompt, n });

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

    console.log("Fetching game data...");
    // Fetch game data
    const { data, error: gameError } = await supabaseClient
      .from("games")
      .select(`
        *,
        rules_images (
          image_path,
          display_order
        ),
        example_images (
          image_path
        )
      `)
      .eq("id", gameId)
      .single();

    if (gameError) {
      console.error("Error fetching game:", gameError);
      throw gameError;
    }

    const game = data as Game;

    if (!game) {
      throw new Error(`Game not found with id: ${gameId}`);
    }

    console.log("Game data:", {
      id: game.id,
      title: game.title,
      rulesImagesCount: game.rules_images.length,
      exampleImagesCount: game.example_images.length,
    });

    // Update the image processing sections to pass supabaseClient
    console.log("Processing rules images...");
    const rulesImagesPromises = game.rules_images.map(async (img) => ({
      ...img,
      base64: await getBase64Image(
        img.image_path,
        supabaseClient,
        gameAssetsBucket,
      ),
    }));

    console.log("Processing example images...");
    const exampleImagesPromises = game.example_images.map(async (img) => ({
      ...img,
      base64: await getBase64Image(
        img.image_path,
        supabaseClient,
        gameAssetsBucket,
      ),
    }));

    const [encodedRulesImages, encodedExampleImages] = await Promise.all(
      [
        Promise.all(rulesImagesPromises),
        Promise.all(exampleImagesPromises),
      ],
    );

    console.log("Successfully encoded all images");

    // Modify the prompt construction to handle images more efficiently
    const prompt = `
      Game Title: ${game.title}
      Game Description: ${game.description}
      
      Based on the provided game rules and examples, generate ${n} creative examples that follow the same pattern and rules. 
      
      Only include the examples themselves, with no additional text or explanation.

      The generated examples should be in the same style and format as the examples provided.
      
      [Instructions and examples have been provided as encoded images]
      
      Additional Context from User: ${userPrompt}
      
      Format your response as:
      ${
      Array.from({ length: n }, (_, i) => `${i + 1}. [Example ${i + 1}]`).join(
        "\n",
      )
    }
    `;

    // Call OpenAI
    const openaiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openaiKey) {
      throw new Error("Missing OpenAI API key");
    }

    console.log("Calling OpenAI API...");
    const openai = new OpenAI({
      apiKey: openaiKey,
    });

    const chatCompletion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: prompt },
            ...encodedRulesImages.map((img) => ({
              type: "image_url" as const,
              image_url: {
                url: img.base64,
              },
            })),
            ...encodedExampleImages.map((img) => ({
              type: "image_url" as const,
              image_url: {
                url: img.base64,
              },
            })),
          ],
        },
      ],
    });

    const reply = chatCompletion.choices[0].message.content;
    console.log("Successfully received OpenAI response");
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
