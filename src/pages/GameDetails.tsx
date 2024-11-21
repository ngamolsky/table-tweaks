import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Plus, Wand2, ChevronDown, Minus, AlertCircle } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Collapsible, CollapsibleContent } from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { gamesWithImagesQuery, GameWithImages } from "@/queries/games";
import { GameImageGrid } from "@/components/GameImageGrid";
import { Alert, AlertDescription } from "@/components/ui/alert";

export function GameDetails() {
  const { id } = useParams();
  const [game, setGame] = useState<GameWithImages | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [promptInput, setPromptInput] = useState("");
  const [isRulesOpen, setIsRulesOpen] = useState(false);
  const [isExamplesOpen, setIsExamplesOpen] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [numSuggestions, setNumSuggestions] = useState(3);
  const [aiError, setAiError] = useState<string | null>(null);

  async function fetchGame() {
    try {
      setError(null);
      if (!id) {
        throw new Error("No game ID provided");
      }

      console.log("Fetching game", id);
      const { data, error: supabaseError } = await gamesWithImagesQuery
        .eq("id", id)
        .single();

      if (supabaseError) throw supabaseError;
      if (!data) throw new Error("Game not found");

      setGame(data);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to fetch game";
      console.error("Error fetching game:", err);
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    if (id) {
      fetchGame();
    }
  }, [id]);

  async function handleExtendGame() {
    try {
      setIsGenerating(true);
      setAiSuggestion(null);
      setAiError(null);

      if (!id) {
        throw new Error("No game ID provided");
      }

      if (!promptInput.trim()) {
        throw new Error("Please enter a prompt");
      }

      const { data, error: functionError } = await supabase.functions.invoke(
        "openai",
        {
          body: {
            gameId: id,
            userPrompt: promptInput,
            n: numSuggestions,
          },
        }
      );

      if (functionError) throw functionError;
      if (!data?.suggestion) throw new Error("No suggestion received");

      setAiSuggestion(data.suggestion);
      setPromptInput("");
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to generate suggestion";
      console.error("Error generating suggestion:", err);
      setAiError(message);
    } finally {
      setIsGenerating(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">Loading...</div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <Alert variant="destructive" className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!game) {
    return (
      <div className="flex items-center justify-center h-full">
        <Alert variant="destructive" className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Game not found</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <Card>
        <CardHeader>
          <CardTitle>{game.title}</CardTitle>
          <CardDescription>{game.description}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Textarea
              value={promptInput}
              onChange={(e) => setPromptInput(e.target.value)}
              placeholder="Enter your prompt to extend the game..."
              className="min-h-[120px]"
              disabled={isGenerating}
            />
            <div className="space-y-2">
              <label
                htmlFor="numSuggestions"
                className="text-sm text-muted-foreground"
              >
                Number of suggestions:
              </label>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-10 w-10 shrink-0"
                  onClick={() =>
                    setNumSuggestions(Math.max(0, numSuggestions - 1))
                  }
                  disabled={isGenerating || numSuggestions <= 0}
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <Input
                  id="numSuggestions"
                  type="number"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  min="0"
                  max="5"
                  value={numSuggestions}
                  onChange={(e) => setNumSuggestions(Number(e.target.value))}
                  className="flex-1 text-center"
                  disabled={isGenerating}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-10 w-10 shrink-0"
                  onClick={() =>
                    setNumSuggestions(Math.min(5, numSuggestions + 1))
                  }
                  disabled={isGenerating || numSuggestions >= 5}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <Button
              onClick={handleExtendGame}
              className="w-full"
              disabled={isGenerating || !promptInput.trim()}
            >
              {isGenerating ? (
                <div className="flex items-center">
                  <div className="animate-spin mr-2 h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
                  Generating...
                </div>
              ) : (
                <>
                  <Wand2 className="h-4 w-4 mr-2" />
                  Extend Game
                </>
              )}
            </Button>

            {aiError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{aiError}</AlertDescription>
              </Alert>
            )}

            {aiSuggestion && (
              <Card className="mt-4">
                <CardHeader>
                  <CardTitle className="text-sm">AI Suggestion</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="whitespace-pre-wrap text-sm">{aiSuggestion}</p>
                </CardContent>
              </Card>
            )}
          </div>
        </CardContent>
      </Card>

      <Collapsible open={isRulesOpen} onOpenChange={setIsRulesOpen}>
        <Card>
          <CardHeader
            className="cursor-pointer"
            onClick={() => setIsRulesOpen(!isRulesOpen)}
          >
            <div className="flex items-center justify-between">
              <CardTitle>Rules</CardTitle>
              <ChevronDown
                className={`h-4 w-4 transition-transform ${
                  isRulesOpen ? "rotate-180" : ""
                }`}
              />
            </div>
          </CardHeader>
          <CollapsibleContent>
            <CardContent className="space-y-4">
              <GameImageGrid folder="rules" game={game} onComplete={() => {}} />
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      <Collapsible open={isExamplesOpen} onOpenChange={setIsExamplesOpen}>
        <Card>
          <CardHeader
            className="cursor-pointer"
            onClick={() => setIsExamplesOpen(!isExamplesOpen)}
          >
            <div className="flex items-center justify-between">
              <CardTitle>Examples</CardTitle>
              <ChevronDown
                className={`h-4 w-4 transition-transform ${
                  isExamplesOpen ? "rotate-180" : ""
                }`}
              />
            </div>
          </CardHeader>
          <CollapsibleContent>
            <CardContent className="space-y-4">
              <GameImageGrid
                folder="example"
                game={game}
                onComplete={() => {}}
              />
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>
    </div>
  );
}
