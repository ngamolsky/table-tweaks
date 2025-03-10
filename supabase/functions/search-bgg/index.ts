import { createClient } from "jsr:@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import type { Database } from "../../../src/types/database.types.ts";
import { Parser } from "npm:xml2js";

type RequestBody = {
    query: string;
};

type BGGSearchResult = {
    id: string;
    name: string;
    yearPublished?: string;
    thumbnail?: string;
    description?: string;
    minPlayers?: number;
    maxPlayers?: number;
    playingTime?: number;
    bggWeight?: number;
};

// BGG API response types for detailed game info
type BGGItem = {
    $: {
        id: string;
        type: string;
    };
    name: Array<{ $: { type: string; value: string } }>;
    description?: string[];
    yearpublished?: Array<{ $: { value: string } }>;
    minplayers?: Array<{ $: { value: string } }>;
    maxplayers?: Array<{ $: { value: string } }>;
    playingtime?: Array<{ $: { value: string } }>;
    minage?: Array<{ $: { value: string } }>;
    image?: string[];
    thumbnail?: string[];
    link?: Array<{
        $: {
            type: string;
            id: string;
            value: string;
        };
    }>;
    statistics?: Array<{
        ratings: Array<{
            average?: Array<{ $: { value: string } }>;
            averageweight?: Array<{ $: { value: string } }>;
        }>;
    }>;
};

type BGGResponse = {
    items: {
        item: BGGItem[];
    };
};

/**
 * Decodes HTML entities in a string
 */
function decodeHtmlEntities(text: string): string {
    if (!text) return "";

    return text
        .replace(/&quot;/g, '"')
        .replace(/&#039;/g, "'")
        .replace(/&amp;/g, "&")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&mdash;/g, "—")
        .replace(/&ndash;/g, "–")
        .replace(/&#10;/g, "\n");
}

Deno.serve(async (req) => {
    const requestId = crypto.randomUUID();
    console.time(`[${requestId}] Total Request`);
    console.log(`[${requestId}] Starting BGG search request`);

    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        const { query } = await req.json() as RequestBody;
        console.log(`[${requestId}] Searching BGG for: ${query}`);

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

        // Search BoardGameGeek API
        console.time(`[${requestId}] BGG API Search`);
        const searchUrl = `https://boardgamegeek.com/xmlapi2/search?query=${
            encodeURIComponent(query)
        }&type=boardgame`;

        const searchResponse = await fetch(searchUrl);
        if (!searchResponse.ok) {
            throw new Error(`BGG search failed: ${searchResponse.status}`);
        }

        const searchText = await searchResponse.text();
        const parser = new Parser();
        const searchDoc = await parser.parseStringPromise(searchText);

        // Process search results
        const basicResults: { id: string; name: string }[] = [];

        if (searchDoc.items && searchDoc.items.item) {
            // Limit to first 5 results
            const limitedItems = searchDoc.items.item.slice(0, 5);

            for (const item of limitedItems) {
                basicResults.push({
                    id: item.$.id,
                    name: item.name?.[0]?.$.value || "Unknown Game",
                });
            }
        }
        console.timeEnd(`[${requestId}] BGG API Search`);

        // If we have results, fetch detailed information for each game
        const results: BGGSearchResult[] = [];

        if (basicResults.length > 0) {
            console.time(`[${requestId}] BGG API Details`);

            // Get all game IDs
            const gameIds = basicResults.map((game) => game.id).join(",");

            // Fetch detailed information for all games in a single request
            const detailsUrl =
                `https://boardgamegeek.com/xmlapi2/thing?id=${gameIds}&stats=1`;
            const detailsResponse = await fetch(detailsUrl);

            if (!detailsResponse.ok) {
                throw new Error(
                    `BGG details fetch failed: ${detailsResponse.status}`,
                );
            }

            const detailsText = await detailsResponse.text();
            const detailsDoc = await parser.parseStringPromise(
                detailsText,
            ) as BGGResponse;

            if (detailsDoc.items && detailsDoc.items.item) {
                for (const item of detailsDoc.items.item) {
                    // Clean description HTML
                    let cleanDescription = item.description?.[0];
                    if (cleanDescription) {
                        // Remove HTML tags
                        cleanDescription = cleanDescription.replace(
                            /<[^>]*>?/gm,
                            "",
                        );
                        // Decode HTML entities
                        cleanDescription = decodeHtmlEntities(cleanDescription);
                        // Trim to reasonable length
                        if (cleanDescription.length > 300) {
                            cleanDescription =
                                cleanDescription.substring(0, 300) + "...";
                        }
                    }

                    // Get weight/complexity rating
                    const bggWeight = item.statistics?.[0]?.ratings?.[0]
                        ?.averageweight?.[0]?.$.value;

                    const result: BGGSearchResult = {
                        id: item.$.id,
                        name: item.name?.[0]?.$.value || "Unknown Game",
                        yearPublished: item.yearpublished?.[0]?.$.value,
                        thumbnail: item.thumbnail?.[0],
                        description: cleanDescription,
                        minPlayers: item.minplayers?.[0]?.$.value
                            ? parseInt(item.minplayers[0].$.value)
                            : undefined,
                        maxPlayers: item.maxplayers?.[0]?.$.value
                            ? parseInt(item.maxplayers[0].$.value)
                            : undefined,
                        playingTime: item.playingtime?.[0]?.$.value
                            ? parseInt(item.playingtime[0].$.value)
                            : undefined,
                        bggWeight: bggWeight
                            ? parseFloat(bggWeight)
                            : undefined,
                    };

                    results.push(result);
                }
            }

            console.timeEnd(`[${requestId}] BGG API Details`);
        }

        console.timeEnd(`[${requestId}] Total Request`);

        return new Response(
            JSON.stringify({
                results,
                count: results.length,
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
