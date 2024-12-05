import { Button } from "@/components/ui/button";
import { ImageIcon, Trash2, AlertCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { OptimizedImage } from "@/components/OptimizedImage";
import { GameWithImages } from "types/composite.types";
import { useGameImageOperations } from "@/hooks/useGameImageOperations";
import { cn } from "@/lib/utils";
import { useSession } from "@supabase/auth-helpers-react";

interface GameImageGridProps {
  folder: "rules" | "examples";
  game: GameWithImages;
  allowMultiple?: boolean;
}

export function GameImageGrid({
  folder,
  game,
  allowMultiple = true,
}: GameImageGridProps) {
  const session = useSession();
  const userId = session?.user?.id;

  const { images, addFiles, deleteFiles } = useGameImageOperations({
    folder,
    bucketName: import.meta.env.VITE_GAME_ASSETS_BUCKET,
    userId: userId!,
    gameId: game.id,
    gameName: game.title,
    initialImages:
      folder === "rules"
        ? game.rules_images.map((img) => ({
            id: img.id,
            imagePath: img.image_path,
            status: "complete" as const,
          }))
        : game.example_images.map((img) => ({
            id: img.id,
            imagePath: img.image_path,
            status: "complete" as const,
          })),
  });

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {images.map((image) => (
        <Dialog key={image.id}>
          <DialogTrigger asChild>
            <div
              className={cn(
                "relative aspect-square group cursor-pointer overflow-hidden rounded-lg border",
                image.status !== "complete" && "animate-pulse bg-muted"
              )}
            >
              {/* Show preview during upload */}
              <OptimizedImage
                imagePath={image.imagePath}
                alt={`${folder} image`}
                className="object-cover w-full h-full"
                previewUrl={image.previewUrl}
                status={image.status}
              />

              {/* Error indicator */}
              {image.status === "error" && (
                <div className="absolute inset-0 flex items-center justify-center bg-red-500/20">
                  <AlertCircle className="h-8 w-8 text-red-500" />
                </div>
              )}

              {/* Delete button */}
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-2 right-2 bg-black/20"
                onClick={(e) => {
                  e.stopPropagation();
                  deleteFiles([image.imagePath], [image.id]);
                }}
                disabled={image.status !== "complete"}
              >
                <Trash2 className="h-4 w-4 text-white" />
              </Button>
            </div>
          </DialogTrigger>
          <DialogContent className="max-w-4xl p-8">
            <DialogTitle>
              {folder === "rules" ? "Game Rule" : "Game Example"}
            </DialogTitle>
            <OptimizedImage
              imagePath={image.imagePath}
              alt={`${folder} image`}
              className="w-full h-auto"
              status={image.status}
            />
          </DialogContent>
        </Dialog>
      ))}

      {/* Upload Button */}
      <Button
        variant="outline"
        className="aspect-square h-full border-2 border-dashed"
        onClick={() => {
          const input = document.createElement("input");
          input.type = "file";
          input.accept = "image/*";
          input.multiple = allowMultiple;
          input.onchange = (e) => {
            const files = (e.target as HTMLInputElement).files;
            if (files) addFiles(Array.from(files));
          };
          input.click();
        }}
      >
        <ImageIcon className="w-8 h-8 text-muted-foreground" />
        <span className="text-sm text-muted-foreground text-center">
          Add Photo
        </span>
      </Button>
    </div>
  );
}
