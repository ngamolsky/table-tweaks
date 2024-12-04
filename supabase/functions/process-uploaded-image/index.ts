import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
import { ChatOpenAI } from "npm:@langchain/openai@0.3.14";
import { ChatAnthropic } from "npm:@langchain/anthropic@0.3.8";
import { Runnable } from "npm:@langchain/core@0.3.20/runnables/base";
import { z } from "npm:zod";

import { corsHeaders } from "../_shared/cors.ts";
import type { Database, Enums } from "../../../types/database.types.ts";

// Types
type StoragePayload = {
    type: "INSERT";
    table: string;
    record: {
        id: string;
        name: string;
        bucket_id: string;
        owner: string;
    };
};

// Schemas
const RulesOutputSchema = z.object({
    extracted_text: z.string().describe(
        "The complete text content extracted from the rules image",
    ),
    additional_info: z.string().optional().describe(
        "Optional metadata about text positioning, confidence level, or visual styling. Add any additional information that helps with understanding the extracted text.",
    ),
});

const ExampleOutputSchema = z.object({
    extracted_pattern: z.string().describe(
        "The pattern or structure identified in the example",
    ),
    extracted_content: z.string().describe(
        "The actual content/text extracted from the example image",
    ),
    additional_info: z.string().optional().describe(
        "Optional metadata about the example's characteristics or context. Add any additional information that helps with understanding the extracted content.",
    ),
});

// Helper functions
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

async function processRulesImage(
    supabaseClient: ReturnType<typeof createClient<Database>>,
    structuredLlm: Runnable,
    imagePath: string,
    imageData: Blob,
    modelPreference: Enums<"ai_model">,
) {
    console.log(`Processing rules image: ${imagePath}`);
    const table = "rules_images";
    const base64Image = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(imageData);
    });

    console.log("Updating processing status to 'processing'");
    await supabaseClient
        .from(table)
        .update({
            processing_status: "processing" as const,
            model_used: modelPreference,
        })
        .eq("image_path", imagePath);

    const prompt =
        "Extract and format all text content from this game rule image. Focus on capturing the complete text while preserving any hierarchical structure. Include any important formatting or visual emphasis. Also note any additional metadata like confidence level, text positioning, or visual styling in the additional_info field.";

    console.log("Invoking AI model for rules processing");
    const rulesResult = await structuredLlm.invoke([{
        role: "user",
        content: [
            { type: "text", text: prompt },
            { type: "image_url", image_url: { url: base64Image } },
        ],
    }]);

    console.log("Updating database with processed rules results");
    const { error: updateError } = await supabaseClient
        .from(table)
        .update({
            extracted_text: rulesResult.extracted_text,
            additional_info: rulesResult.additional_info,
            processing_status: "completed" as const,
            processed_at: new Date().toISOString(),
        })
        .eq("image_path", imagePath);

    if (updateError) {
        console.error(`Database update error: ${updateError.message}`);
        throw new Error(`Failed to update ${table}: ${updateError.message}`);
    }

    return rulesResult;
}

async function processExampleImage(
    supabaseClient: ReturnType<typeof createClient<Database>>,
    structuredLlm: Runnable,
    imagePath: string,
    imageData: Blob,
    modelPreference: Enums<"ai_model">,
) {
    console.log(`Processing example image: ${imagePath}`);
    const table = "example_images";
    const base64Image = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(imageData);
    });

    console.log("Updating processing status to 'processing'");
    await supabaseClient
        .from(table)
        .update({
            processing_status: "processing" as const,
            model_used: modelPreference,
        })
        .eq("image_path", imagePath);

    const prompt =
        "Extract the content of the examples, as well as the pattern or structure that is being displayed.";

    console.log("Invoking AI model for example processing");
    const exampleResult = await structuredLlm.invoke([{
        role: "user",
        content: [
            { type: "text", text: prompt },
            { type: "image_url", image_url: { url: base64Image } },
        ],
    }]);

    console.log("Updating database with processed example results");
    const { error: updateError } = await supabaseClient
        .from(table)
        .update({
            extracted_pattern: exampleResult.extracted_pattern,
            extracted_content: exampleResult.extracted_content,
            additional_info: exampleResult.additional_info,
            processing_status: "completed" as const,
            processed_at: new Date().toISOString(),
        })
        .eq("image_path", imagePath);

    if (updateError) {
        console.error(`Database update error: ${updateError.message}`);
        throw new Error(`Failed to update ${table}: ${updateError.message}`);
    }

    return exampleResult;
}

// Main handler
Deno.serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        const payload: StoragePayload = await req.json();
        console.log("Received payload:", payload);

        const { name: imagePath, owner: userId } = payload.record;
        const pathParts = imagePath.split("/");
        const gameId = pathParts[1].split(".")[2];
        const imageType = pathParts[2] === "rules" ? "rule" : "example";

        console.log(`Processing ${imageType} image for game ${gameId}`);

        const supabaseClient = createClient<Database>(
            Deno.env.get("SUPABASE_URL")!,
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
        );

        console.log("Fetching user preferences");
        const { data: preferences } = await supabaseClient
            .from("user_preferences")
            .select("ai_model")
            .eq("user_id", userId)
            .single();

        const modelPreference = preferences?.ai_model ?? null;
        console.log(`Using model preference: ${modelPreference}`);
        const aiModel = getAIModel(modelPreference);

        console.log("Downloading image from storage");
        const { data: imageData } = await supabaseClient
            .storage
            .from(payload.record.bucket_id)
            .download(imagePath);

        if (!imageData) {
            console.error("Failed to download image");
            throw new Error("Failed to download image");
        }

        if (imageType === "rule") {
            console.log("Processing as rules image");
            const typedAiModel = aiModel as Runnable<typeof RulesOutputSchema>;
            const structuredLlm = typedAiModel.withStructuredOutput(
                RulesOutputSchema,
            );
            const result = await processRulesImage(
                supabaseClient,
                structuredLlm,
                imagePath,
                imageData,
                modelPreference || "anthropic__claude-3-haiku-20240307",
            );
            return new Response(JSON.stringify(result), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: 200,
            });
        } else {
            console.log("Processing as example image");
            const typedAiModel = aiModel as Runnable<
                typeof ExampleOutputSchema
            >;
            const structuredLlm = typedAiModel.withStructuredOutput(
                ExampleOutputSchema,
            );
            const result = await processExampleImage(
                supabaseClient,
                structuredLlm,
                imagePath,
                imageData,
                modelPreference || "anthropic__claude-3-haiku-20240307",
            );
            return new Response(JSON.stringify(result), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: 200,
            });
        }
    } catch (error) {
        console.error("Error processing image:", error);
        const message = error instanceof Error
            ? error.message
            : "Unknown error";
        return new Response(JSON.stringify({ error: message }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 500,
        });
    }
});
