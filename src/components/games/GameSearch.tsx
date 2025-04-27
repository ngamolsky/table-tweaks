import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  Loader2,
  CheckCircle,
  Dice5Icon,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { decodeHtmlEntities } from "@/utils/textUtils";
import { useDebounce } from "@/hooks/useDebounce";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

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

interface UnifiedSearchResponse {
  results: UnifiedGameResult[];
  localCount: number;
  bggCount: number;
  page: number;
  pageSize: number;
}

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
  const [selectedBggGame, setSelectedBggGame] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const navigate = useNavigate();

  const { data, isLoading, isError } = useQuery<UnifiedSearchResponse | null>({
    queryKey: ["unifiedGameSearch", debouncedSearchQuery, page, pageSize],
    queryFn: async () => {
      if (!debouncedSearchQuery.trim()) return null;
      const { data, error } =
        await supabase.functions.invoke<UnifiedSearchResponse>("search-bgg", {
          body: {
            query: debouncedSearchQuery,
            page,
            pageSize,
          },
        });
      if (error) throw error;
      return data;
    },
    enabled: !!debouncedSearchQuery.trim(),
  });

  // Effect to perform search when component mounts if query is in URL
  useEffect(() => {
    const query = getQueryFromUrl();
    if (query) {
      setSearchQuery(query);
    }
  }, []);

  // Update search params when debounced query changes
  useEffect(() => {
    if (debouncedSearchQuery !== getQueryFromUrl()) {
      updateSearchParams(debouncedSearchQuery);
      setPage(1); // Reset to first page on new search
      if (debouncedSearchQuery.trim()) {
        setSearchStep("loading");
      } else {
        setSearchStep("initial");
      }
    }
  }, [debouncedSearchQuery]);

  // Update search step based on loading/data
  useEffect(() => {
    if (isLoading && debouncedSearchQuery.trim()) {
      setSearchStep("loading");
    } else if (data && debouncedSearchQuery.trim()) {
      setSearchStep("results");
    }
  }, [isLoading, data, debouncedSearchQuery]);

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

  const handleGameSelect = (game: any) => {
    if (game.isLocal) {
      // Navigate to the game detail page
      navigate({
        to: "/games/$id",
        params: { id: game.id },
        search: game.hasCompleteRules ? undefined : { setup: "rules" },
      });
    } else {
      handleImportGame(game.bggId);
    }
  };

  const handleImportGame = async (bggId: string) => {
    if (!bggId) return;
    try {
      setSelectedBggGame(bggId);
      // Use the existing import edge function
      const { data, error } = await supabase.functions.invoke<any>(
        "fetch-bgg-game",
        {
          body: { bggId, importGame: true },
        }
      );
      if (error || !data?.game)
        throw error || new Error("Failed to import game");
      navigate({
        to: "/games/$id",
        params: { id: data.game.id },
        search: { setup: "rules" },
      });
    } catch (error) {
      console.error("Import error:", error);
      toast.error("Failed to import game. Please try again.");
      setSelectedBggGame(null);
    }
  };

  // Pagination controls
  const totalResults = (data?.localCount || 0) + (data?.bggCount || 0);
  const totalPages = Math.ceil(totalResults / pageSize);

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
          {data && data.results.length > 0 ? (
            <>
              <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
                {data.results.map((game: UnifiedGameResult) => (
                  <div
                    className="relative"
                    key={`${game.isLocal ? "local" : "bgg"}-${game.id}`}
                  >
                    {/* Imported badge for local games */}
                    {game.isLocal && (
                      <Badge
                        variant="secondary"
                        className="absolute top-2 right-2 z-10 shadow-md bg-green-600 text-white px-2 py-0.5 text-xs rounded-full"
                      >
                        Imported
                      </Badge>
                    )}
                    {/* Importing overlay for BGG games being imported */}
                    {selectedBggGame === game.bggId && !game.isLocal && (
                      <div className="absolute inset-0 bg-white/70 flex flex-col items-center justify-center z-20 rounded-lg">
                        <Loader2 className="h-6 w-6 animate-spin text-primary mb-1" />
                        <span className="text-xs text-primary font-medium">
                          Importing...
                        </span>
                      </div>
                    )}
                    <Card
                      className={`cursor-pointer transition-colors w-full h-full ${
                        selectedBggGame === game.bggId && !game.isLocal
                          ? "border-primary bg-primary/5 opacity-60 pointer-events-none"
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
                              <h4 className="font-medium truncate">
                                {game.name}
                              </h4>
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
                  </div>
                ))}
              </div>
              {/* Pagination Controls */}
              <div className="flex justify-center items-center gap-4 mt-6">
                <button
                  className="p-2 rounded disabled:opacity-50"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  aria-label="Previous Page"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <span className="text-sm">
                  Page {page} of {totalPages}
                </span>
                <button
                  className="p-2 rounded disabled:opacity-50"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages || totalPages === 0}
                  aria-label="Next Page"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground">
                No games found. Try a different search term.
              </p>
            </div>
          )}
        </div>
      )}
      {isError && (
        <div className="text-center py-8">
          <p className="text-red-500">Error loading games. Please try again.</p>
        </div>
      )}
    </div>
  );
}
