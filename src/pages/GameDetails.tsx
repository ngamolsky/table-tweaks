import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Plus, Wand2, Minus, AlertCircle, Trash2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { GameImageGrid } from "@/components/GameImageGrid";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useCurrentGame } from "@/hooks/useCurrentGame";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useDeleteMutation } from "@supabase-cache-helpers/postgrest-react-query";

export function GameDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [promptInput, setPromptInput] = useState("");
  const [aiSuggestion, setAiSuggestion] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [numSuggestions, setNumSuggestions] = useState(3);
  const [aiError, setAiError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const gameDeleteMutation = useDeleteMutation(
    supabase.from("games"),
    ["id"],
    "id",
    {
      onError: (error: Error) => {
        console.error("Error deleting game:", error);
      },
    }
  );
  const { data: game, isLoading, error } = useCurrentGame(id!);
  const [rulesPrompt, setRulesPrompt] = useState("");
  const [rulesResponse, setRulesResponse] = useState<string | null>(null);
  const [isAskingRules, setIsAskingRules] = useState(false);
  const [rulesError, setRulesError] = useState<string | null>(null);

  async function handleAskQuestion(questionType: "rules" | "examples") {
    const prompt = questionType === "rules" ? rulesPrompt : promptInput;
    const setLoading =
      questionType === "rules" ? setIsAskingRules : setIsGenerating;
    const setError = questionType === "rules" ? setRulesError : setAiError;
    const setResponse =
      questionType === "rules" ? setRulesResponse : setAiSuggestion;

    try {
      setLoading(true);
      setResponse(null);
      setError(null);

      if (!id) throw new Error("No game ID provided");
      if (!prompt.trim()) throw new Error("Please enter a prompt");

      const { data, error: functionError } = await supabase.functions.invoke<{
        suggestion: string;
      }>("ask-question", {
        body: {
          gameId: id,
          userPrompt: prompt,
          questionType,
          n: questionType === "examples" ? numSuggestions : undefined,
        },
      });

      if (functionError) throw functionError;
      if (!data?.suggestion) throw new Error("No response received");

      setResponse(data.suggestion);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to get response";
      console.error(
        `Error ${
          questionType === "rules" ? "asking question" : "generating examples"
        }:`,
        err
      );
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteGame() {
    if (!id) return;

    try {
      setIsDeleting(true);
      await gameDeleteMutation.mutateAsync({ id });
      navigate("/");
    } catch (err) {
      console.error("Error deleting game:", err);
    } finally {
      setIsDeleting(false);
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
          <AlertDescription>{error.message}</AlertDescription>
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
    <div className=" mx-auto pb-20 pt-4">
      <Card className="shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-2xl font-bold">{game.title}</CardTitle>
          {game.description && (
            <CardDescription className="text-muted-foreground">
              {game.description}
            </CardDescription>
          )}
        </CardHeader>

        <CardContent>
          <Accordion type="single" collapsible defaultValue="rules">
            <AccordionItem value="rules">
              <AccordionTrigger className="text-lg font-medium">
                Rules
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-8">
                  <div className="space-y-4">
                    <Textarea
                      value={rulesPrompt}
                      onChange={(e) => setRulesPrompt(e.target.value)}
                      placeholder="Ask a question about the rules..."
                      className="min-h-[120px] placeholder:text-muted-foreground/50 focus-visible:ring-0"
                      disabled={isAskingRules}
                    />
                    <Button
                      className="w-full"
                      disabled={isAskingRules || !rulesPrompt.trim()}
                      onClick={() => handleAskQuestion("rules")}
                    >
                      {isAskingRules ? (
                        <div className="flex items-center">
                          <div className="animate-spin mr-2 h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
                          Thinking...
                        </div>
                      ) : (
                        <>
                          <Wand2 className="h-4 w-4 mr-2" />
                          Ask Question
                        </>
                      )}
                    </Button>

                    {rulesError && (
                      <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>{rulesError}</AlertDescription>
                      </Alert>
                    )}

                    {rulesResponse && (
                      <div className="mt-4 space-y-2">
                        <h3 className="font-medium">Answer</h3>
                        <div className="rounded-lg bg-muted p-4">
                          <p className="whitespace-pre-wrap text-sm">
                            {rulesResponse}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="space-y-3">
                    <h3 className="font-medium">Game Rules</h3>
                    <GameImageGrid folder="rules" game={game} />
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="examples">
              <AccordionTrigger className="text-lg font-medium">
                Examples
              </AccordionTrigger>
              <AccordionContent>
                <div className="space-y-8">
                  <div className="space-y-4">
                    <Textarea
                      value={promptInput}
                      onChange={(e) => setPromptInput(e.target.value)}
                      placeholder="Enter your prompt to generate new examples..."
                      className="min-h-[120px] placeholder:text-muted-foreground/50 focus-visible:ring-0"
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
                          onChange={(e) =>
                            setNumSuggestions(Number(e.target.value))
                          }
                          className="flex-1 text-center focus-visible:ring-0 "
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
                      onClick={() => handleAskQuestion("examples")}
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
                      <div className="mt-4 space-y-2">
                        <h3 className="font-medium">AI Suggestion</h3>
                        <p className="whitespace-pre-wrap text-sm">
                          {aiSuggestion}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="space-y-3">
                    <h3 className="font-medium">Game Examples</h3>
                    <GameImageGrid folder="examples" game={game} />
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>

        <CardFooter className="flex justify-end pt-6">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" disabled={isDeleting}>
                {isDeleting ? (
                  <div className="flex items-center">
                    <div className="animate-spin mr-2 h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
                    Deleting...
                  </div>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Game
                  </>
                )}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="w-4/5 rounded-lg">
              <AlertDialogHeader>
                <AlertDialogTitle className="py-4">
                  Are you sure?
                </AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete
                  your game and all associated data.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter className="pb-4">
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteGame}>
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardFooter>
      </Card>
    </div>
  );
}
