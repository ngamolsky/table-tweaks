import {
  createFileRoute,
  Outlet,
  useNavigate,
  useLocation,
  redirect,
} from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { useToast } from "@/components/ui/use-toast";
import {
  GameCreateProvider,
  useGameCreate,
} from "@/contexts/GameCreateContext";
import { useLoggedInUser } from "@/hooks/useLoggedInUser";
import { useGamesMutations, useGameImages } from "@/hooks/games";
import { processGameImages } from "@/services/gameProcessingService";

function AddGame() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isCreating, setIsCreating] = useState(false);
  const { toast } = useToast();
  const { user } = useLoggedInUser();
  const { gameData, updateGameData } = useGameCreate();
  const { updateGame } = useGamesMutations();
  const { uploadGameImages, isUploading } = useGameImages();

  // Determine current step from path
  const currentStep = location.pathname.split("/").pop();

  const handleNext = async () => {
    if (currentStep === "upload") {
      setIsCreating(true);
      try {
        // Upload images to storage using our hook
        const uploadedImages = await uploadGameImages.mutateAsync({
          userId: user.id,
          images: gameData.images,
        });

        // Process images and create initial game using our service
        // This edge function already:
        // 1. Creates the game record
        // 2. Creates the game image records
        // 3. Sets the cover image on the game
        const result = await processGameImages(uploadedImages);
        const { game } = result;

        // Update context with game ID and initial data
        const newGameData = {
          id: game.id,
          name: game.name || "",
          description: game.description || "",
          estimatedTime: game.estimatedTime || "",
          processingStatus: "processing" as const,
          // Keep the same images for UI purposes
          images: gameData.images,
        };

        updateGameData(newGameData);

        // Navigate to details page
        navigate({
          to: "/games/add/details",
          from: "/games/add/upload",
        });
      } catch (error) {
        console.error("Error uploading images:", error);
        toast({
          title: "Error",
          description:
            "There was an error uploading your images. Please try again.",
          variant: "destructive",
        });
      } finally {
        setIsCreating(false);
      }
    } else if (currentStep === "details") {
      handleSubmit();
    }
  };

  const handleBack = () => {
    if (currentStep === "details") {
      navigate({ to: "/games/add/upload" });
    }
  };

  const handleSubmit = async () => {
    if (!gameData.id) {
      toast({
        title: "Error",
        description: "Game ID not found. Please try again.",
        variant: "destructive",
      });
      return;
    }

    setIsCreating(true);
    try {
      // Update game with final details using our mutation hook
      await updateGame.mutateAsync({
        id: gameData.id,
        name: gameData.name,
        description: gameData.description,
        estimated_time: gameData.estimatedTime,
        status: "published",
      });

      toast({
        title: "Game Published",
        description: "Your game has been published successfully",
      });

      // Navigate to game page
      navigate({ to: "/games/$id", params: { id: gameData.id } });
    } catch (error) {
      console.error("Error publishing game:", error);
      toast({
        title: "Error",
        description:
          "There was an error publishing your game. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case "upload":
        return gameData.images.length > 0;
      case "details":
        return (
          gameData.name.trim() !== "" && gameData.description.trim() !== ""
        );
      default:
        return false;
    }
  };

  return (
    <div className="flex flex-col min-h-full">
      <div className="text-2xl font-semibold">
        {currentStep === "upload" && "Upload Game Rules"}
        {currentStep === "details" && "Game Details"}
      </div>

      <div className="flex-1 flex flex-col">
        <div className="h-full flex-1 my-4 flex">
          <Outlet />
        </div>

        <div className="flex flex-col gap-8 items-center">
          <div className="flex w-full justify-between gap-4">
            {currentStep !== "upload" && (
              <Button
                type="button"
                variant="outline"
                onClick={handleBack}
                className="gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
            )}
            <Button
              type="button"
              onClick={handleNext}
              disabled={!canProceed() || isCreating || isUploading}
              className={cn("gap-2 flex-1")}
            >
              {isCreating || isUploading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {currentStep === "details"
                    ? "Creating..."
                    : isUploading
                      ? "Uploading..."
                      : "Processing..."}
                </>
              ) : (
                <>
                  {currentStep === "details" ? "Create Game" : "Next"}
                  {currentStep !== "details" && (
                    <ArrowRight className="h-4 w-4" />
                  )}
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Create a wrapper component that provides the context
// This component won't be remounted during transitions between child routes
function AddGameRoot() {
  return (
    <GameCreateProvider>
      <AddGame />
    </GameCreateProvider>
  );
}

export const Route = createFileRoute("/_authenticated/games/add")({
  component: AddGameRoot,
  beforeLoad: () => {
    // Redirect from /games/add to /games/add/upload
    if (window.location.pathname === "/games/add") {
      throw redirect({ to: "/games/add/upload" });
    }
  },
});
