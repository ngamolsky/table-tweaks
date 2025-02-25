import { createFileRoute } from "@tanstack/react-router";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ImageIcon, Loader2 } from "lucide-react";
import { useGameCreate } from "@/contexts/GameCreateContext";

export const Route = createFileRoute("/_authenticated/games/add/details")({
  component: DetailsStep,
});

function DetailsStep() {
  const { gameData, updateGameData } = useGameCreate();

  // Find cover image
  const coverImage = gameData.images.find((img) => img.isCover);
  const ruleImages = gameData.images.filter((img) => !img.isCover);

  return (
    <form className="space-y-6 w-full">
      {gameData.processingStatus === "error" && (
        <div className="bg-destructive/10 text-destructive rounded-lg p-4">
          <p className="text-sm">
            There was an error processing your game rules. You can still
            continue with manual entry.
          </p>
        </div>
      )}

      <div>
        <h3 className="font-medium mb-2">Cover Image</h3>
        <div className="relative aspect-[4/3] w-full overflow-hidden rounded-lg border bg-muted">
          {coverImage ? (
            <img
              src={coverImage.previewUrl}
              alt="Game cover"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="flex items-center justify-center w-full h-full text-muted-foreground">
              <ImageIcon className="h-8 w-8" />
            </div>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="title">Game Title</Label>
        <Input
          id="title"
          value={gameData.name}
          onChange={(e) => updateGameData({ name: e.target.value })}
          placeholder="Enter game title"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={gameData.description}
          onChange={(e) => updateGameData({ description: e.target.value })}
          placeholder="Enter game description"
          className="min-h-[100px] h-[200px]"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="playTime">Play Time</Label>
        <Input
          id="playTime"
          value={gameData.estimatedTime}
          onChange={(e) => updateGameData({ estimatedTime: e.target.value })}
          placeholder="Enter estimated play time"
        />
      </div>

      <div>
        <h3 className="font-medium mb-2">Rule Images</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {ruleImages.map((image) => (
            <div
              key={image.id}
              className="relative aspect-square w-full overflow-hidden rounded-lg border bg-muted"
            >
              <img
                src={image.previewUrl}
                alt="Game rule"
                className="w-full h-full object-cover"
              />
            </div>
          ))}
        </div>
      </div>
    </form>
  );
}
