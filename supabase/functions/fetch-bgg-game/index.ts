import { createClient, SupabaseClient } from "jsr:@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import type { Database, Tables } from "../../../src/types/database.types.ts";
import { Parser } from "npm:xml2js";

/**
 * Decodes HTML entities in a string
 * @param text The text containing HTML entities to decode
 * @returns The decoded text
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

type RequestBody = {
    bggId: string;
    importGame?: boolean; // If true, import the game to our database
};

// BGG API response types
type BGGPollResult = {
    $: {
        value: string;
        numvotes: string;
        level?: string;
    };
};

type BGGPoll = {
    $: {
        name: string;
        title?: string;
        totalvotes?: string;
    };
    results: Array<{
        $: { numplayers?: string };
        result: BGGPollResult[];
    }>;
};

type BGGLink = {
    $: {
        type: string;
        id: string;
        value: string;
    };
};

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
    link?: BGGLink[];
    poll?: BGGPoll[];
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

type BGGGameData = {
    bggId: string;
    name: string;
    description?: string;
    yearPublished?: number;
    minPlayers?: number;
    maxPlayers?: number;
    playingTime?: number;
    minAge?: number;
    imageUrl?: string;
    thumbnailUrl?: string;
    categories?: string[];
    mechanics?: string[];
    designers?: string[];
    publishers?: string[];
    bggRating?: number;
    bggWeight?: number;
    recommendedPlayers?: {
        count: number;
        recommendation: "Best" | "Recommended" | "Not Recommended";
        votes: number;
    }[];
    languageDependence?: number;
};

Deno.serve(async (req) => {
    const requestId = crypto.randomUUID();
    console.time(`[${requestId}] Total Request`);
    console.log(`[${requestId}] Starting BGG game fetch request`);

    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        const { bggId, importGame = false } = await req.json() as RequestBody;
        console.log(`[${requestId}] Fetching BGG game: ${bggId}`);

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

        // Check if game already exists in our database
        if (importGame) {
            const { data: existingGame } = await supabaseClient
                .from("games")
                .select("*")
                .eq("bgg_id", bggId)
                .maybeSingle();

            if (existingGame) {
                return new Response(
                    JSON.stringify({
                        game: existingGame,
                        message: "Game already exists in database",
                        imported: false,
                    }),
                    {
                        headers: {
                            ...corsHeaders,
                            "Content-Type": "application/json",
                        },
                        status: 200,
                    },
                );
            }
        }

        // Fetch game data from BGG API
        console.time(`[${requestId}] BGG API Fetch`);
        const gameUrl =
            `https://boardgamegeek.com/xmlapi2/thing?id=${bggId}&stats=1`;

        const gameResponse = await fetch(gameUrl);
        if (!gameResponse.ok) {
            throw new Error(`BGG game fetch failed: ${gameResponse.status}`);
        }

        const gameText = await gameResponse.text();
        const parser = new Parser();
        const gameDoc = await parser.parseStringPromise(
            gameText,
        ) as BGGResponse;

        // Process game data
        const gameData = await processGameData(gameDoc);
        console.timeEnd(`[${requestId}] BGG API Fetch`);

        // Import game to our database if requested
        let importedGame: Tables<"games"> | null = null;
        if (importGame) {
            importedGame = await importGameToDatabase(
                supabaseClient,
                gameData,
                user.id,
                requestId,
            );
        }

        console.timeEnd(`[${requestId}] Total Request`);

        return new Response(
            JSON.stringify({
                game: importedGame || gameData,
                imported: !!importedGame,
                canAddRules: true,
                rulesEndpoint: "/process-game-rules",
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

function processGameData(gameDoc: BGGResponse): BGGGameData {
    if (!gameDoc.items?.item?.[0]) {
        throw new Error("Invalid BGG API response");
    }

    const item = gameDoc.items.item[0];

    // Extract primary name
    let primaryName = "Unknown Game";
    if (item.name) {
        for (const nameObj of item.name) {
            if (nameObj.$.type === "primary") {
                primaryName = nameObj.$.value;
                break;
            }
        }
    }

    // Extract categories and mechanics
    const categories: string[] = [];
    const mechanics: string[] = [];
    const designers: string[] = [];
    const publishers: string[] = [];

    if (item.link) {
        for (const link of item.link) {
            const type = link.$.type;
            const value = link.$.value;

            if (type === "boardgamecategory") {
                categories.push(value);
            } else if (type === "boardgamemechanic") {
                mechanics.push(value);
            } else if (type === "boardgamedesigner") {
                designers.push(value);
            } else if (type === "boardgamepublisher") {
                publishers.push(value);
            }
        }
    }

    // Extract recommended players
    const recommendedPlayers: BGGGameData["recommendedPlayers"] = [];
    if (item.poll) {
        const playerPoll = item.poll.find((poll) =>
            poll.$.name === "suggested_numplayers"
        );
        if (playerPoll?.results) {
            for (const result of playerPoll.results) {
                const numPlayers = result.$.numplayers;
                if (
                    numPlayers === "1" || numPlayers === "2" ||
                    numPlayers === "3" ||
                    numPlayers === "4" || numPlayers === "5" ||
                    numPlayers === "6" ||
                    numPlayers === "7" || numPlayers === "7+"
                ) {
                    const bestVotes = parseInt(
                        result.result.find((r) => r.$.value === "Best")?.$
                            ?.numvotes || "0",
                    );
                    const recommendedVotes = parseInt(
                        result.result.find((r) => r.$.value === "Recommended")
                            ?.$.numvotes || "0",
                    );
                    const notRecommendedVotes = parseInt(
                        result.result.find((r) =>
                            r.$.value === "Not Recommended"
                        )?.$.numvotes || "0",
                    );

                    const totalVotes = bestVotes + recommendedVotes +
                        notRecommendedVotes;
                    if (totalVotes > 0) {
                        let recommendation:
                            | "Best"
                            | "Recommended"
                            | "Not Recommended" = "Not Recommended";
                        if (
                            bestVotes > recommendedVotes &&
                            bestVotes > notRecommendedVotes
                        ) {
                            recommendation = "Best";
                        } else if (recommendedVotes > notRecommendedVotes) {
                            recommendation = "Recommended";
                        }

                        recommendedPlayers.push({
                            count: numPlayers === "7+"
                                ? 7
                                : parseInt(numPlayers),
                            recommendation,
                            votes: totalVotes,
                        });
                    }
                }
            }
        }
    }

    // Extract language dependence
    let languageDependence: number | undefined;
    if (item.poll) {
        const langPoll = item.poll.find((poll) =>
            poll.$.name === "language_dependence"
        );
        if (langPoll?.results?.[0]?.result) {
            let highestVotes = 0;
            for (const result of langPoll.results[0].result) {
                const votes = parseInt(result.$.numvotes || "0");
                if (votes > highestVotes) {
                    highestVotes = votes;
                    languageDependence = parseInt(result.$.level || "0");
                }
            }
        }
    }

    // Extract BGG rating
    let bggRating: number | undefined;
    if (
        item.statistics?.[0]?.ratings?.[0]?.average?.[0]?.$.value
    ) {
        const ratingStr = item.statistics[0].ratings[0].average[0].$.value;
        bggRating = parseFloat(ratingStr);
    }

    // Extract weight/complexity
    let bggWeight: number | undefined;
    if (
        item.statistics?.[0]?.ratings?.[0]?.averageweight?.[0]?.$.value
    ) {
        const weightStr =
            item.statistics[0].ratings[0].averageweight[0].$.value;
        bggWeight = parseFloat(weightStr);
    }

    return {
        bggId: item.$.id,
        name: primaryName,
        description: item.description?.[0]
            ? decodeHtmlEntities(item.description[0])
            : undefined,
        yearPublished: item.yearpublished?.[0]?.$.value
            ? parseInt(item.yearpublished[0].$.value)
            : undefined,
        minPlayers: item.minplayers?.[0]?.$.value
            ? parseInt(item.minplayers[0].$.value)
            : undefined,
        maxPlayers: item.maxplayers?.[0]?.$.value
            ? parseInt(item.maxplayers[0].$.value)
            : undefined,
        playingTime: item.playingtime?.[0]?.$.value
            ? parseInt(item.playingtime[0].$.value)
            : undefined,
        minAge: item.minage?.[0]?.$.value
            ? parseInt(item.minage[0].$.value)
            : undefined,
        imageUrl: item.image?.[0],
        thumbnailUrl: item.thumbnail?.[0],
        categories,
        mechanics,
        designers,
        publishers,
        bggRating,
        bggWeight,
        recommendedPlayers,
        languageDependence,
    };
}

async function importGameToDatabase(
    supabaseClient: SupabaseClient<Database>,
    gameData: BGGGameData,
    userId: string,
    requestId: string,
): Promise<Tables<"games">> {
    console.time(`[${requestId}] Import Game to Database`);

    // Create game record
    const { data: game, error: gameError } = await supabaseClient
        .from("games")
        .insert({
            author_id: userId,
            name: gameData.name,
            description: gameData.description || null,
            estimated_time: gameData.playingTime
                ? `${gameData.playingTime} minutes`
                : null,
            status: "published",
            bgg_id: gameData.bggId,
            bgg_year_published: gameData.yearPublished || null,
            min_players: gameData.minPlayers || null,
            max_players: gameData.maxPlayers || null,
            min_age: gameData.minAge || null,
            bgg_rating: gameData.bggRating || null,
            bgg_image_url: gameData.imageUrl || null,
            bgg_thumbnail_url: gameData.thumbnailUrl || null,
            language_dependence: gameData.languageDependence || null,
            bgg_weight: gameData.bggWeight || null,
        })
        .select()
        .single();

    if (gameError) throw gameError;

    // Import categories
    if (gameData.categories && gameData.categories.length > 0) {
        await importGameTags(
            supabaseClient,
            game.id,
            gameData.categories,
            "category",
            requestId,
        );
    }

    // Import mechanics
    if (gameData.mechanics && gameData.mechanics.length > 0) {
        await importGameTags(
            supabaseClient,
            game.id,
            gameData.mechanics,
            "mechanic",
            requestId,
        );
    }

    // Import designers
    if (gameData.designers && gameData.designers.length > 0) {
        await importGameTags(
            supabaseClient,
            game.id,
            gameData.designers,
            "designer",
            requestId,
        );
    }

    // Import publishers
    if (gameData.publishers && gameData.publishers.length > 0) {
        await importGameTags(
            supabaseClient,
            game.id,
            gameData.publishers,
            "publisher",
            requestId,
        );
    }

    // Import recommended players
    if (gameData.recommendedPlayers && gameData.recommendedPlayers.length > 0) {
        await importRecommendedPlayers(
            supabaseClient,
            game.id,
            gameData.recommendedPlayers,
            requestId,
        );
    }

    // Import BGG image if available
    if (gameData.imageUrl) {
        await importBggImage(
            supabaseClient,
            game.id,
            gameData.imageUrl,
            userId,
            requestId,
        );
    }

    console.timeEnd(`[${requestId}] Import Game to Database`);
    return game;
}

async function importGameTags(
    supabaseClient: SupabaseClient<Database>,
    gameId: string,
    tags: string[],
    tagType: "category" | "mechanic" | "designer" | "publisher",
    requestId: string,
): Promise<void> {
    console.log(`[${requestId}] Importing ${tags.length} ${tagType}s`);

    // First, ensure all tags exist in the tags table
    for (const tagName of tags) {
        // Check if tag exists
        const { data: existingTags } = await supabaseClient
            .from("game_tags")
            .select("id")
            .eq("name", tagName)
            .eq("type", tagType);

        if (!existingTags || existingTags.length === 0) {
            // Create tag if it doesn't exist
            await supabaseClient
                .from("game_tags")
                .insert({
                    name: tagName,
                    type: tagType,
                });
        }
    }

    // Then get all tag IDs
    const { data: tagData } = await supabaseClient
        .from("game_tags")
        .select("id, name")
        .in("name", tags)
        .eq("type", tagType);

    if (!tagData || tagData.length === 0) return;

    // Create game-tag relationships
    await supabaseClient
        .from("game_tag_relations")
        .insert(
            tagData.map((tag) => ({
                game_id: gameId,
                tag_id: tag.id,
            })),
        );
}

async function importRecommendedPlayers(
    supabaseClient: SupabaseClient<Database>,
    gameId: string,
    recommendedPlayers: BGGGameData["recommendedPlayers"],
    requestId: string,
): Promise<void> {
    if (!recommendedPlayers || recommendedPlayers.length === 0) return;

    console.log(
        `[${requestId}] Importing ${recommendedPlayers.length} player recommendations`,
    );

    await supabaseClient
        .from("game_player_counts")
        .insert(
            recommendedPlayers.map((rec) => ({
                game_id: gameId,
                player_count: rec.count,
                recommendation: rec.recommendation.toLowerCase(),
                votes: rec.votes,
            })),
        );
}

async function importBggImage(
    supabaseClient: SupabaseClient<Database>,
    gameId: string,
    imageUrl: string,
    userId: string,
    requestId: string,
): Promise<void> {
    console.log(`[${requestId}] Importing BGG image: ${imageUrl}`);

    // Create game image record
    const { data: imageData, error: imageError } = await supabaseClient
        .from("game_images")
        .insert({
            game_id: gameId,
            image_url: imageUrl,
            is_cover: true,
            image_type: "cover",
            uploader_id: userId,
            is_external: true,
        })
        .select()
        .single();

    if (imageError) {
        console.error(`[${requestId}] Error importing BGG image:`, imageError);
        return;
    }

    // Update game with cover image
    await supabaseClient
        .from("games")
        .update({
            cover_image_id: imageData.id,
        })
        .eq("id", gameId);
}
