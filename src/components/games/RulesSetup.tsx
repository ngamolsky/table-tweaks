import { useState, useEffect, useRef } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  useGamesQueries,
  useGameImages,
  useGamesSubscriptions,
} from "@/hooks/games";
import {
  Loader2,
  CheckCircle,
  AlertCircle,
  Upload,
  Camera,
  Edit,
  Link,
  X,
  Image as ImageIcon,
  MoveUp,
  MoveDown,
  Info,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { processGameRules } from "@/services/gameProcessingService";
import { useLoggedInUser } from "@/hooks/useLoggedInUser";
import { Tables } from "@/types/database.types";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

interface RulesSetupProps {
  gameId: string;
}

// Define a local interface for the images we're working with in this component
interface RuleImage {
  id: string;
  file: File;
  previewUrl: string;
  isCover: boolean;
  order_index: number;
}

export function RulesSetup({ gameId }: RulesSetupProps) {
  const navigate = useNavigate();
  const { useGame, useGameRules } = useGamesQueries();
  const { useSubscribeToGameRules } = useGamesSubscriptions();
  const { data: game, isLoading } = useGame(gameId);
  const { data: gameRule } = useGameRules(gameId) as {
    data: Tables<"game_rules"> | null;
  };

  // Subscribe to game rules changes
  useSubscribeToGameRules(gameId);

  const [rulesStatus, setRulesStatus] = useState<
    | "checking"
    | "needs_rules"
    | "has_rules"
    | "processing"
    | "error"
    | "contributing"
  >("checking");

  useEffect(() => {
    if (game && !isLoading) {
      if (game.has_complete_rules === true) {
        setRulesStatus("has_rules");
      } else if (gameRule) {
        const status = gameRule.processing_status;
        if (status === "processing") {
          setRulesStatus("processing");
        } else if (status === "error") {
          setRulesStatus("error");
        } else {
          setRulesStatus("needs_rules");
        }
      } else {
        setRulesStatus("needs_rules");
      }
    }
  }, [game, gameRule, isLoading]);

  const handleAddRules = () => {
    setRulesStatus("contributing");
  };

  const handleSkipRules = () => {
    navigate({
      to: "/games/$id",
      params: { id: gameId },
    });
  };

  const handleRulesComplete = async () => {
    try {
      navigate({
        to: "/games/$id",
        params: { id: gameId },
      });
    } catch (error) {
      console.error("Failed to update rules status:", error);
      toast.error("Failed to save rules. Please try again.");
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Checking game status...</p>
      </div>
    );
  }

  return (
    <div className="container max-w-md mx-auto py-8 px-4">
      {rulesStatus === "has_rules" && (
        <Card>
          <CardContent className="p-6 space-y-6">
            <div className="flex flex-col items-center text-center space-y-2">
              <CheckCircle className="h-12 w-12 text-green-500 mb-2" />
              <h2 className="text-2xl font-bold">Rules Already Available</h2>
              <p className="text-muted-foreground">
                Good news! {game?.name} already has complete rules in our
                system.
              </p>
            </div>

            <Button className="w-full" onClick={handleSkipRules}>
              Continue to Game
            </Button>
          </CardContent>
        </Card>
      )}

      {rulesStatus === "processing" && (
        <Card>
          <CardContent className="p-6 space-y-6">
            <div className="flex flex-col items-center text-center space-y-2">
              <Loader2 className="h-12 w-12 text-blue-500 mb-2 animate-spin" />
              <h2 className="text-2xl font-bold">Rules Being Processed</h2>
              <p className="text-muted-foreground">
                We're currently processing the rules for {game?.name}. This may
                take a few minutes.
              </p>
            </div>

            <Button className="w-full" onClick={handleSkipRules}>
              Continue to Game
            </Button>
          </CardContent>
        </Card>
      )}

      {rulesStatus === "error" && (
        <Card>
          <CardContent className="p-6 space-y-6">
            <div className="flex flex-col items-center text-center space-y-2">
              <AlertCircle className="h-12 w-12 text-red-500 mb-2" />
              <h2 className="text-2xl font-bold">Rules Processing Failed</h2>
              <p className="text-muted-foreground">
                There was an error processing the rules for {game?.name}. Would
                you like to try again?
              </p>
            </div>

            <div className="space-y-3">
              <Button className="w-full" onClick={handleAddRules}>
                Try Again
              </Button>
              <Button
                variant="outline"
                className="w-full"
                onClick={handleSkipRules}
              >
                Skip for Now
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {rulesStatus === "needs_rules" && (
        <Card>
          <CardContent className="p-6 space-y-6">
            <div className="flex flex-col items-center text-center space-y-2">
              <AlertCircle className="h-12 w-12 text-amber-500 mb-2" />
              <h2 className="text-2xl font-bold">Rules Needed</h2>
              <p className="text-muted-foreground">
                {game?.name} doesn't have complete rules yet. Would you like to
                contribute?
              </p>
            </div>

            <div className="space-y-3">
              <Button className="w-full" onClick={handleAddRules}>
                Add Rules
              </Button>
              <Button
                variant="outline"
                className="w-full"
                onClick={handleSkipRules}
              >
                Skip for Now
              </Button>
            </div>

            <p className="text-sm text-center text-muted-foreground">
              By contributing rules, you'll help everyone who plays this game!
            </p>
          </CardContent>
        </Card>
      )}

      {rulesStatus === "contributing" && (
        <RulesContribution
          gameId={gameId}
          gameName={game?.name || ""}
          onComplete={handleRulesComplete}
        />
      )}
    </div>
  );
}

interface RulesContributionProps {
  gameId: string;
  gameName: string;
  onComplete: () => void;
}

function RulesContribution({
  gameId,
  gameName,
  onComplete,
}: RulesContributionProps) {
  const [activeTab, setActiveTab] = useState("images");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [images, setImages] = useState<RuleImage[]>([]);
  const { user } = useLoggedInUser();

  const { useUploadGameImages, isUploading } = useGameImages();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const currentMaxOrder =
      images.length > 0
        ? Math.max(...images.map((img) => img.order_index))
        : -1;

    const newImages: RuleImage[] = Array.from(files).map((file, index) => ({
      id: crypto.randomUUID(),
      file,
      previewUrl: URL.createObjectURL(file),
      isCover: false,
      order_index: currentMaxOrder + index + 1,
    }));

    setImages((prev) => [...prev, ...newImages]);
  };

  const removeImage = (id: string) => {
    setImages((prev) => {
      const imageToRemove = prev.find((img) => img.id === id);
      if (imageToRemove?.previewUrl) {
        URL.revokeObjectURL(imageToRemove.previewUrl);
      }

      // Remove the image and reorder the remaining images
      const filteredImages = prev.filter((img) => img.id !== id);
      return filteredImages.map((img, index) => ({
        ...img,
        order_index: index,
      }));
    });
  };

  const moveImageUp = (id: string) => {
    setImages((prev) => {
      const index = prev.findIndex((img) => img.id === id);
      if (index <= 0) return prev; // Already at the top

      const newImages = [...prev];
      // Swap with the previous image
      [newImages[index - 1], newImages[index]] = [
        newImages[index],
        newImages[index - 1],
      ];

      // Update order_index values
      return newImages.map((img, idx) => ({
        ...img,
        order_index: idx,
      }));
    });
  };

  const moveImageDown = (id: string) => {
    setImages((prev) => {
      const index = prev.findIndex((img) => img.id === id);
      if (index === -1 || index === prev.length - 1) return prev; // Already at the bottom

      const newImages = [...prev];
      // Swap with the next image
      [newImages[index], newImages[index + 1]] = [
        newImages[index + 1],
        newImages[index],
      ];

      // Update order_index values
      return newImages.map((img, idx) => ({
        ...img,
        order_index: idx,
      }));
    });
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);

    try {
      if (activeTab === "images") {
        if (images.length === 0) {
          toast.error("Please upload at least one image of the rules.");
          setIsSubmitting(false);
          return;
        }

        // Sort images by order_index before uploading
        const sortedImages = [...images].sort(
          (a, b) => a.order_index - b.order_index
        );

        // Upload images to storage with order_index
        const uploadedImages = await useUploadGameImages.mutateAsync({
          userId: user.id,
          images: sortedImages.map((img) => ({
            file: img.file,
            isCover: img.isCover,
            order_index: img.order_index,
          })),
        });

        // Process the rules using our edge function
        await processGameRules(gameId, uploadedImages);

        toast.success(
          "Your rules are being processed. This may take a few minutes."
        );

        onComplete();
      } else if (activeTab === "manual" || activeTab === "link") {
        // These features are coming soon, so we'll just show a message
        toast.info("This feature is coming soon!");
        setIsSubmitting(false);
        return;
      }
    } catch (error) {
      console.error("Failed to save rules:", error);
      toast.error("Failed to save rules. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardContent className="p-6 space-y-6">
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold">Add Rules for {gameName}</h2>
          <p className="text-muted-foreground">
            Choose how you'd like to add rules for this game
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="images">
              <ImageIcon className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Images</span>
            </TabsTrigger>
            <TabsTrigger value="manual">
              <Edit className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Manual</span>
            </TabsTrigger>
            <TabsTrigger value="link">
              <Link className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">URL</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="images" className="space-y-4 py-4">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/*"
              multiple
              className="hidden"
            />
            <div
              className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="flex justify-center space-x-4 mb-4">
                <Upload className="h-8 w-8 text-muted-foreground" />
                <Camera className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground mb-2">
                Take photos or upload images of the rulebook
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  fileInputRef.current?.click();
                }}
              >
                Select Images
              </Button>
            </div>

            {images.length > 0 && (
              <div className="space-y-4 mt-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium">Rule Images</h3>
                </div>

                <div className="space-y-2">
                  {images.map((image, index) => (
                    <div
                      key={image.id}
                      className="flex items-center space-x-2 p-2 border rounded-md bg-muted/30"
                    >
                      <div className="relative h-16 w-16 flex-shrink-0">
                        <img
                          src={image.previewUrl}
                          alt={`Rule page ${index + 1}`}
                          className="h-full w-full object-cover rounded-sm"
                        />
                      </div>
                      <div className="flex-grow">
                        <div className="flex items-center justify-between">
                          <Badge variant="outline">Page {index + 1}</Badge>
                          <div className="flex items-center space-x-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => moveImageUp(image.id)}
                              disabled={index === 0}
                            >
                              <MoveUp className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => moveImageDown(image.id)}
                              disabled={index === images.length - 1}
                            >
                              <MoveDown className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-destructive"
                              onClick={() => removeImage(image.id)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="pt-4">
              <Button
                className="w-full"
                onClick={handleSubmit}
                disabled={isSubmitting || isUploading || images.length === 0}
              >
                {isSubmitting || isUploading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {isUploading ? "Uploading..." : "Processing..."}
                  </>
                ) : (
                  "Process Rules"
                )}
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="manual" className="space-y-4 py-4">
            <div className="flex flex-col items-center justify-center py-12 text-center space-y-4">
              <Info className="h-12 w-12 text-muted-foreground" />
              <h3 className="text-xl font-medium">Coming Soon</h3>
              <p className="text-muted-foreground max-w-md">
                Manual rule entry is coming soon! For now, please use the Images
                tab to upload photos of your rulebook.
              </p>
              <Button variant="outline" onClick={() => setActiveTab("images")}>
                Go to Images Tab
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="link" className="space-y-4 py-4">
            <div className="flex flex-col items-center justify-center py-12 text-center space-y-4">
              <Info className="h-12 w-12 text-muted-foreground" />
              <h3 className="text-xl font-medium">Coming Soon</h3>
              <p className="text-muted-foreground max-w-md">
                URL rule submission is coming soon! For now, please use the
                Images tab to upload photos of your rulebook.
              </p>
              <Button variant="outline" onClick={() => setActiveTab("images")}>
                Go to Images Tab
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
