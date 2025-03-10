import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Loader2, CheckCircle, Dice5Icon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { useBggSearch } from "@/hooks/games/useBggSearch";
import { decodeHtmlEntities } from "@/utils/textUtils";
import { useGamesQueries } from "@/hooks/games/useGamesQueries";
import { useDebounce } from "@/hooks/useDebounce";

// Unified result type for displaying both local and BGG games
type UnifiedGameResult = {
  id: string;
  name: string;
  description?: string | null;
  imageUrl?: string | null;
  yearPublished?: string | null;
  minPlayers?: number | null;
  maxPlayers?: number | null;
  playingTime?: number | null;
  weight?: number | null;
  hasCompleteRules?: boolean;
  isLocal: boolean; // Whether the game is from our database
  bggId?: string | null; // BGG ID for both types
};

export function GameSearch() {
  // Get search query from URL
  const getQueryFromUrl = () => {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get("q") || "";
  };

  const [searchQuery, setSearchQuery] = useState(getQueryFromUrl());
  const debouncedSearchQuery = useDebounce(searchQuery, 500); // Debounce search query by 500ms
  const [searchStep, setSearchStep] = useState<
    "initial" | "results" | "loading"
  >(searchQuery ? "loading" : "initial");
  const [unifiedResults, setUnifiedResults] = useState<UnifiedGameResult[]>([]);
  const [selectedBggGame, setSelectedBggGame] = useState<string | null>(null);

  const navigate = useNavigate();

  // Use the improved hooks with proper query keys
  const { useGames } = useGamesQueries();
  const { useSearchBgg, useImportBggGame } = useBggSearch();

  // Use the hooks properly with the search query - now using debouncedSearchQuery
  const { data: localGames, isLoading: isLocalGamesLoading } = useGames({
    status: ["published"],
    name: debouncedSearchQuery,
    enabled: debouncedSearchQuery.trim().length > 0,
  });

  const { data: bggGames, isLoading: isBggGamesLoading } = useSearchBgg(
    debouncedSearchQuery,
    {
      enabled: debouncedSearchQuery.trim().length > 0,
    }
  );

  const importBggMutation = useImportBggGame();

  // Combine the loading states
  const isLoading = isLocalGamesLoading || isBggGamesLoading;

  // Effect to perform search when component mounts if query is in URL
  useEffect(() => {
    const query = getQueryFromUrl();
    if (query) {
      setSearchQuery(query);
      // The queries will automatically run based on the searchQuery state
    }
  }, []);

  // Update search params when debounced query changes
  useEffect(() => {
    if (debouncedSearchQuery !== getQueryFromUrl()) {
      updateSearchParams(debouncedSearchQuery);

      if (debouncedSearchQuery.trim()) {
        setSearchStep("loading");
      } else {
        setSearchStep("initial");
        setUnifiedResults([]);
      }
    }
  }, [debouncedSearchQuery]);

  // Effect to process results when data is loaded
  useEffect(() => {
    if (debouncedSearchQuery && !isLoading && (localGames || bggGames)) {
      processSearchResults();
    }
  }, [debouncedSearchQuery, isLoading, localGames, bggGames]);

  const updateSearchParams = useCallback((query: string) => {
    // Update URL without reloading the page
    const url = new URL(window.location.href);
    if (query) {
      url.searchParams.set("q", query);
    } else {
      url.searchParams.delete("q");
    }
    window.history.pushState({}, "", url);
  }, []);

  const processSearchResults = () => {
    if (!debouncedSearchQuery.trim()) return;

    try {
      // Deduplicate BGG results by filtering out games that already exist in our database
      const localGameBggIds = new Set(
        localGames
          ?.filter((game) => game.bgg_id !== null && game.bgg_id !== undefined)
          .map((game) => game.bgg_id) || []
      );

      // Filter out BGG results that already exist in our database
      const filteredBggResults =
        bggGames?.filter((bggGame) => !localGameBggIds.has(bggGame.id)) || [];

      // Convert local games to unified format
      const localUnified: UnifiedGameResult[] =
        localGames?.map((game) => ({
          id: game.id,
          name: game.name,
          description: game.description,
          imageUrl: game.cover_image?.image_url || null,
          yearPublished: game.bgg_year_published?.toString(),
          minPlayers: game.min_players,
          maxPlayers: game.max_players,
          weight: game.bgg_weight,
          hasCompleteRules: game.has_complete_rules ?? false,
          isLocal: true,
          playingTime: game.estimated_time
            ? parseInt(game.estimated_time)
            : null,
          bggId: game.bgg_id,
        })) || [];

      // Convert BGG games to unified format
      const bggUnified: UnifiedGameResult[] = filteredBggResults.map(
        (game) => ({
          id: game.id,
          name: game.name,
          description: game.description,
          imageUrl: game.thumbnail,
          yearPublished: game.yearPublished,
          minPlayers: game.minPlayers,
          maxPlayers: game.maxPlayers,
          playingTime: game.playingTime,
          weight: game.bggWeight,
          isLocal: false,
          bggId: game.id,
        })
      );

      // Combine and sort results (local first, then alphabetically)
      const combined = [...localUnified, ...bggUnified].sort((a, b) => {
        // First sort by local status
        if (a.isLocal && !b.isLocal) return -1;
        if (!a.isLocal && b.isLocal) return 1;
        // Then sort alphabetically
        return a.name.localeCompare(b.name);
      });

      setUnifiedResults(combined);
      setSearchStep("results");
    } catch (error) {
      console.error("Search error:", error);
      toast.error("Failed to search for games. Please try again.");
      setSearchStep("initial");
    }
  };

  const handleGameSelect = (game: UnifiedGameResult) => {
    if (game.isLocal) {
      // Navigate to the game detail page
      navigate({
        to: "/games/$id",
        params: { id: game.id },
        search: game.hasCompleteRules ? undefined : { setup: "rules" },
      });
    } else {
      // Import the game from BGG
      handleImportGame(game.id);
    }
  };

  const handleImportGame = async (bggId: string) => {
    if (!bggId) return;

    try {
      setSelectedBggGame(bggId);

      const importedGame = await importBggMutation.mutateAsync(bggId);

      // Navigate to the game detail page
      navigate({
        to: "/games/$id",
        params: { id: importedGame.id },
        search: { setup: "rules" },
      });
    } catch (error) {
      console.error("Import error:", error);
      toast.error("Failed to import game. Please try again.");
      setSelectedBggGame(null);
    }
  };

  // Update the loading state based on the combined loading state
  useEffect(() => {
    if (isLoading && debouncedSearchQuery.trim()) {
      setSearchStep("loading");
    }
  }, [isLoading, debouncedSearchQuery]);

  return (
    <div className="space-y-6 max-w-full overflow-hidden">
      <div className="text-center space-y-2 px-4">
        <h2 className="text-2xl font-bold">Find Your Game</h2>
      </div>

      {/* Persistent Search Bar */}
      <div className="flex flex-col space-y-4 px-4">
        <div className="flex items-center space-x-2">
          <Input
            placeholder="Enter game name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 focus-visible:ring-offset-2"
          />
        </div>
      </div>

      {searchStep === "initial" && (
        <div className="flex flex-col items-center justify-center py-12 px-4">
          <div className="bg-muted/30 rounded-full p-6 mb-6">
            <Dice5Icon className="h-12 w-12 text-primary/70" />
          </div>
          <h3 className="text-xl font-medium mb-2">Ready to find your game?</h3>
          <p className="text-muted-foreground text-center max-w-md mb-6">
            Search for board games by name to find them in our database or
            import them from BoardGameGeek.
          </p>
        </div>
      )}

      {searchStep === "loading" && (
        <div className="flex flex-col items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
          <p className="text-muted-foreground">Searching...</p>
        </div>
      )}

      {searchStep === "results" && (
        <div className="space-y-6 px-4 pb-4">
          {/* Unified Results */}
          {unifiedResults.length > 0 ? (
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
              {unifiedResults.map((game) => (
                <Card
                  key={`${game.isLocal ? "local" : "bgg"}-${game.id}`}
                  className={`cursor-pointer transition-colors ${
                    selectedBggGame === game.bggId && !game.isLocal
                      ? "border-primary bg-primary/5"
                      : "hover:bg-muted/50"
                  }`}
                  onClick={() => handleGameSelect(game)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start space-x-3">
                      {game.imageUrl ? (
                        <img
                          src={game.imageUrl}
                          alt={game.name}
                          className="w-16 h-16 object-cover rounded-md flex-shrink-0"
                        />
                      ) : (
                        <div className="w-16 h-16 bg-muted rounded-md flex items-center justify-center flex-shrink-0">
                          <span className="text-muted-foreground text-xs">
                            No image
                          </span>
                        </div>
                      )}
                      <div className="flex-1 min-w-0 overflow-hidden">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium truncate">{game.name}</h4>
                          {game.yearPublished && (
                            <span className="text-xs text-muted-foreground">
                              {game.yearPublished}
                            </span>
                          )}
                        </div>
                        {game.description && (
                          <p className="text-sm text-muted-foreground line-clamp-2 break-words">
                            {decodeHtmlEntities(game.description)}
                          </p>
                        )}
                        <div className="flex flex-wrap gap-2 mt-2">
                          {game.hasCompleteRules && (
                            <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full flex items-center">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Rules Ready
                            </span>
                          )}

                          {game.minPlayers && game.maxPlayers && (
                            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                              {game.minPlayers === game.maxPlayers
                                ? `${game.minPlayers} players`
                                : `${game.minPlayers}-${game.maxPlayers} players`}
                            </span>
                          )}
                          {game.playingTime ? (
                            <span className="text-xs bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full">
                              {game.playingTime} min
                            </span>
                          ) : null}
                          {game.weight ? (
                            <span className="text-xs bg-gray-100 text-gray-800 px-2 py-0.5 rounded-full">
                              Weight: {game.weight.toFixed(1)}
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground">
                No games found. Try a different search term.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
