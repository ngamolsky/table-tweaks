import { useState, useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  Loader2,
  CheckCircle,
  AlertCircle,
  Clock,
  RefreshCw,
  FileText,
  Image,
  Cpu,
  CheckCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  useGamesQueries,
  useGamesMutations,
  useGamesSubscriptions,
} from "@/hooks/games";
import { Tables } from "@/types/database.types";
import { formatDistanceToNow } from "date-fns";

interface RulesProcessingStatusProps {
  gameId: string;
  onRetry?: () => void;
}

type GameRule = Tables<"game_rules">;
type ProcessingStatus = NonNullable<GameRule["processing_status"]>;
type ProcessingProgress = {
  stage?: string;
  progress?: number;
  total?: number;
  status?: string;
  error?: string;
  queued_at?: string;
  images_count?: number;
  model?: string;
};

export function RulesProcessingStatus({
  gameId,
  onRetry,
}: RulesProcessingStatusProps) {
  const navigate = useNavigate();
  const { useGameRules, useGameImages } = useGamesQueries();
  const { useRetryProcessRules } = useGamesMutations();
  const { useSubscribeToGameRules } = useGamesSubscriptions();
  const { data: gameRule, isLoading } = useGameRules(gameId) as {
    data: GameRule | null;
    isLoading: boolean;
  };
  const { data: gameImages } = useGameImages(gameId, {
    enabled: !!gameId && gameRule?.processing_status === "error",
  });
  const [timeAgo, setTimeAgo] = useState<string>("");

  // Subscribe to game rules changes for real-time updates
  useSubscribeToGameRules(gameId);

  // Get the current rule (now we expect only one per game)
  const processingStatus = gameRule?.processing_status as ProcessingStatus;
  const processingProgress =
    gameRule?.processing_progress as ProcessingProgress | null;
  const lastAttemptAt = gameRule?.last_attempt_at;
  const errorMessage = gameRule?.error_message;
  const attempts = gameRule?.processing_attempts || 0;

  // Update the time ago string every minute
  useEffect(() => {
    if (!lastAttemptAt) return;

    const updateTimeAgo = () => {
      setTimeAgo(
        formatDistanceToNow(new Date(lastAttemptAt), { addSuffix: true })
      );
    };

    updateTimeAgo();
    const interval = setInterval(updateTimeAgo, 60000);
    return () => clearInterval(interval);
  }, [lastAttemptAt]);

  // Navigate to the rules setup page
  const handleAddRules = () => {
    navigate({
      to: "/games/$id",
      params: { id: gameId },
      search: { setup: "rules" },
    });
  };

  // Handle retry button click
  const handleRetry = async () => {
    if (onRetry) {
      onRetry();
      return;
    }

    // If we have rule images, retry processing with those
    const ruleImages = gameImages?.filter((img) => img.image_type === "rules");

    if (ruleImages && ruleImages.length > 0) {
      try {
        useRetryProcessRules.mutate({
          gameId,
          images: ruleImages.map((img) => ({ path: img.image_url })),
        });
      } catch (error) {
        console.error("Failed to retry rule processing:", error);
      }
    } else {
      // If no images, navigate to add rules
      handleAddRules();
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-4">
        <Loader2 className="h-5 w-5 animate-spin mr-2" />
        <span>Loading rules status...</span>
      </div>
    );
  }

  // If no rules exist yet
  if (!gameRule) {
    return (
      <div className="bg-amber-50 dark:bg-amber-950/30 p-4 rounded-md">
        <div className="flex items-center">
          <AlertCircle className="h-5 w-5 text-amber-500 mr-2" />
          <span>This game needs rules</span>
        </div>
        <Button className="mt-3" size="sm" onClick={handleAddRules}>
          Add Rules
        </Button>
      </div>
    );
  }

  // Render based on processing status
  switch (processingStatus) {
    case "completed":
      return (
        <div className="p-4 rounded-md">
          <div className="flex items-center">
            <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
            <span>Rules processing complete</span>
          </div>
          {timeAgo && (
            <p className="text-sm text-muted-foreground mt-1">
              Processed {timeAgo}
            </p>
          )}
        </div>
      );

    case "queued":
      return (
        <div className=" p-4 rounded-md">
          <div className="flex items-center">
            <Clock className="h-5 w-5 text-blue-500 mr-2" />
            <span>Rules processing queued</span>
          </div>
          {processingProgress?.images_count && (
            <p className="text-sm text-muted-foreground mt-1">
              {processingProgress.images_count} image
              {processingProgress.images_count !== 1 ? "s" : ""} will be
              processed
            </p>
          )}
          <Progress className="mt-3" value={0} />
        </div>
      );

    case "processing":
      return (
        <div className=" p-4 rounded-md">
          <div className="flex items-center">
            <Loader2 className="h-5 w-5 text-blue-500 mr-2 animate-spin" />
            <span>Rules are being processed...</span>
          </div>

          {/* Processing stage indicator */}
          <div className="flex items-center mt-2 space-x-4">
            <TooltipProvider>
              {/* Image download stage */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <div
                    className={`flex flex-col items-center ${processingProgress?.stage === "downloading_images" ? "text-blue-500" : processingProgress?.stage && ["creating_image_records", "ai_processing", "finalizing", "completed"].includes(processingProgress.stage) ? "text-green-500" : "text-muted-foreground"}`}
                  >
                    <Image className="h-4 w-4 mb-1" />
                    <div className="h-1 w-1 rounded-full bg-current"></div>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Downloading images</p>
                </TooltipContent>
              </Tooltip>

              {/* Image records stage */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <div
                    className={`flex flex-col items-center ${processingProgress?.stage === "creating_image_records" ? "text-blue-500" : processingProgress?.stage && ["ai_processing", "finalizing", "completed"].includes(processingProgress.stage) ? "text-green-500" : "text-muted-foreground"}`}
                  >
                    <FileText className="h-4 w-4 mb-1" />
                    <div className="h-1 w-1 rounded-full bg-current"></div>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Creating image records</p>
                </TooltipContent>
              </Tooltip>

              {/* AI processing stage */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <div
                    className={`flex flex-col items-center ${processingProgress?.stage === "ai_processing" ? "text-blue-500" : processingProgress?.stage && ["finalizing", "completed"].includes(processingProgress.stage) ? "text-green-500" : "text-muted-foreground"}`}
                  >
                    <Cpu className="h-4 w-4 mb-1" />
                    <div className="h-1 w-1 rounded-full bg-current"></div>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>
                    AI processing
                    {processingProgress?.model
                      ? ` (${processingProgress.model})`
                      : ""}
                  </p>
                </TooltipContent>
              </Tooltip>

              {/* Finalizing stage */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <div
                    className={`flex flex-col items-center ${processingProgress?.stage === "finalizing" ? "text-blue-500" : processingProgress?.stage === "completed" ? "text-green-500" : "text-muted-foreground"}`}
                  >
                    <CheckCheck className="h-4 w-4 mb-1" />
                    <div className="h-1 w-1 rounded-full bg-current"></div>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Finalizing</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          {/* Progress bar */}
          {processingProgress?.stage === "downloading_images" &&
          processingProgress.progress !== undefined &&
          processingProgress.total !== undefined ? (
            <>
              <Progress
                className="mt-3"
                value={
                  (processingProgress.progress / processingProgress.total) * 100
                }
              />
              <p className="text-xs text-muted-foreground mt-1">
                Downloading images: {processingProgress.progress} of{" "}
                {processingProgress.total}
              </p>
            </>
          ) : (
            <Progress
              className="mt-3"
              value={
                processingProgress?.stage === "started"
                  ? 10
                  : processingProgress?.stage === "downloading_images"
                    ? 30
                    : processingProgress?.stage === "creating_image_records"
                      ? 50
                      : processingProgress?.stage === "ai_processing"
                        ? 70
                        : processingProgress?.stage === "finalizing"
                          ? 90
                          : 0
              }
            />
          )}

          <p className="text-sm text-muted-foreground mt-2">
            This may take a few minutes. The page will update automatically when
            complete.
          </p>
        </div>
      );

    case "retrying":
      return (
        <div className="p-4 rounded-md">
          <div className="flex items-center">
            <RefreshCw className="h-5 w-5 text-blue-500 mr-2 animate-spin" />
            <span>Retrying rules processing...</span>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Attempt {attempts} {attempts === 1 ? "was" : "were"} made to process
            the rules
          </p>
          <Progress className="mt-3" value={15} />
        </div>
      );

    case "error":
      return (
        <div className="p-4 rounded-md">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
            <span>There was an error processing the rules</span>
          </div>

          {errorMessage && (
            <p className="text-sm text-red-600 dark:text-red-400 mt-1 p-2 bg-red-100 dark:bg-red-900/30 rounded">
              {errorMessage}
            </p>
          )}

          {attempts > 0 && (
            <p className="text-sm text-muted-foreground mt-1">
              {attempts} attempt{attempts !== 1 ? "s" : ""} made
              {lastAttemptAt && `, last attempt ${timeAgo}`}
            </p>
          )}

          <Button
            className="mt-3"
            size="sm"
            onClick={handleRetry}
            disabled={useRetryProcessRules.isPending}
          >
            {useRetryProcessRules.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Retrying...
              </>
            ) : (
              "Try Again"
            )}
          </Button>
        </div>
      );

    default:
      return (
        <div className=" p-4 rounded-md">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 text-amber-500 mr-2" />
            <span>This game needs rules</span>
          </div>
          <Button className="mt-3" size="sm" onClick={handleAddRules}>
            Add Rules
          </Button>
        </div>
      );
  }
}
