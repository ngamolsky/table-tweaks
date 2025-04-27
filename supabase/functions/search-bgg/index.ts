import { createClient } from "jsr:@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import type { Database, Tables } from "../../../src/types/database.types.ts";
import { Parser } from "npm:xml2js";

type RequestBody = {
    query: string;
    page?: number;
    pageSize?: number;
};

type BGGSearchResult = {
    id: string;
    name: string;
    yearPublished?: string;
    description?: string;
    minPlayers?: number;
    maxPlayers?: number;
    playingTime?: number;
    bggWeight?: number;
    isLocal: boolean;
    imageUrl: string | null;
    hasCompleteRules: boolean;
    bggId: string;
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
    console.log(`[${requestId}] Starting unified game search request`);

    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        const { query, page = 1, pageSize = 10 } = await req
            .json() as RequestBody;
        console.log(
            `[${requestId}] Searching for: ${query} (page ${page}, pageSize ${pageSize})`,
        );

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

        // --- Local DB Search ---
        console.time(`[${requestId}] Local DB Search`);
        const localFrom = (page - 1) * pageSize;
        const localTo = localFrom + pageSize - 1;
        // First, get the total count
        const { count, error: countError } = await supabaseClient
            .from("games")
            .select("*", { count: "exact", head: true })
            .eq("status", "published")
            .ilike("name", `%${query}%`);
        if (countError) throw countError;
        const localCount = count || 0;
        let localGames: BGGSearchResult[] = [];
        if (localCount > 0 && localFrom < localCount) {
            // Only query if offset is valid
            const { data, error: localError } = await supabaseClient
                .from("games")
                .select(
                    `id, name, description, bgg_id, bgg_year_published, min_players, max_players, estimated_time, bgg_weight, has_complete_rules, cover_image_id, cover_image:game_images!games_cover_image_id_fkey(image_url)`,
                )
                .eq("status", "published")
                .ilike("name", `%${query}%`)
                .order("name", { ascending: true })
                .range(localFrom, localTo);
            if (localError) throw localError;
            const games = (data ?? []) as Array<
                Tables<"games"> & { cover_image?: { image_url: string } | null }
            >;
            localGames = games.map((game) => ({
                id: game.id,
                name: game.name,
                description: game.description ?? undefined,
                imageUrl: game.cover_image?.image_url || null,
                yearPublished: game.bgg_year_published
                    ? String(game.bgg_year_published)
                    : undefined,
                minPlayers: game.min_players ?? undefined,
                maxPlayers: game.max_players ?? undefined,
                playingTime: game.estimated_time
                    ? parseInt(game.estimated_time)
                    : undefined,
                bggWeight: game.bgg_weight ?? undefined,
                hasCompleteRules: game.has_complete_rules ?? false,
                isLocal: true,
                bggId: game.bgg_id ?? "",
            }));
        }
        console.timeEnd(`[${requestId}] Local DB Search`);

        // --- BGG Search ---
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
        let bggResults: { id: string; name: string }[] = [];
        if (searchDoc.items && searchDoc.items.item) {
            bggResults = searchDoc.items.item.map((item: BGGItem) => ({
                id: item.$.id,
                name: item.name?.[0]?.$.value || "Unknown Game",
            }));
        }
        // Remove BGG games that are already in local DB (by bgg_id)
        const localBggIds = new Set(
            localGames.map((g) => g.bggId).filter(Boolean),
        );
        const filteredBggResults = bggResults.filter((bgg) =>
            !localBggIds.has(bgg.id)
        );
        const bggCount = filteredBggResults.length;
        // Paginate BGG results (after filtering out local)
        const bggPageResults = filteredBggResults.slice(localFrom, localTo + 1);
        // Fetch details for paginated BGG games
        let bggDetailed: BGGSearchResult[] = [];
        if (bggPageResults.length > 0) {
            const gameIds = bggPageResults.map((g) => g.id).join(",");
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
                bggDetailed = detailsDoc.items.item.map((item) => {
                    let cleanDescription = item.description?.[0];
                    if (cleanDescription) {
                        cleanDescription = cleanDescription.replace(
                            /<[^>]*>?/gm,
                            "",
                        );
                        cleanDescription = decodeHtmlEntities(cleanDescription);
                        if (cleanDescription.length > 300) {
                            cleanDescription =
                                cleanDescription.substring(0, 300) + "...";
                        }
                    }
                    const bggWeight = item.statistics?.[0]?.ratings?.[0]
                        ?.averageweight?.[0]?.$.value;
                    return {
                        id: item.$.id,
                        name: item.name?.[0]?.$.value || "Unknown Game",
                        yearPublished: item.yearpublished?.[0]?.$.value,
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
                        isLocal: false,
                        imageUrl: item.thumbnail?.[0] || null,
                        hasCompleteRules: false,
                        bggId: item.$.id,
                    };
                });
            }
        }
        console.timeEnd(`[${requestId}] BGG API Search`);

        // --- Combine Results ---
        const unifiedResults = [...localGames, ...bggDetailed];

        console.timeEnd(`[${requestId}] Total Request`);
        return new Response(
            JSON.stringify({
                results: unifiedResults,
                localCount,
                bggCount,
                page,
                pageSize,
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
