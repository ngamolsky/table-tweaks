import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ImageIcon, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { OptimizedImage } from "@/components/OptimizedImage";
import { useSession } from "@supabase/auth-helpers-react";
import { GameWithImages } from "types/composite.types";
import { useGameImageOperations } from "@/hooks/useGameImageOperations";

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
  const [images, setImages] = useState(
    folder === "rules" ? game.rules_images : game.example_images
  );
  const session = useSession();
  const userId = session?.user?.id;

  if (!userId) {
    throw new Error("User ID is required");
  }

  const { addFiles, deleteFiles, deletingFiles, uploadingFiles } =
    useGameImageOperations({
      folder,
      bucketName: import.meta.env.VITE_GAME_ASSETS_BUCKET,
      userId,
      gameId: game.id,
      gameName: game.title,
    });

  // Handle image deletion
  async function handleDelete(imagePath: string, imageId: string) {
    try {
      await deleteFiles([imagePath], [imageId]);
      // Remove from UI
      setImages(
        (prev) => prev.filter((img) => img.id !== imageId) as typeof prev
      );
    } catch (error) {
      console.error(`Error deleting ${folder} image:`, error);
    }
  }

  // Updated file upload handler
  async function handleFileUpload(files: FileList) {
    const fileArray = Array.from(files);

    try {
      const { data, failedUploads } = await addFiles(fileArray);

      if (data) {
        setImages((prev) => [...prev, ...data]);
      }

      if (failedUploads.length > 0) {
        console.error("Some uploads failed:", failedUploads);
      }
    } catch (error) {
      console.error("Upload error:", error);
    }
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {/* Existing Images */}
      {images.map((image) => {
        const isFilePending =
          uploadingFiles[image.image_path] || deletingFiles[image.image_path];
        return (
          <Dialog key={image.id}>
            <DialogTrigger asChild>
              <div
                className={`relative aspect-square group cursor-pointer overflow-hidden rounded-lg border
              ${
                deletingFiles[image.image_path] ? "animate-pulse bg-muted" : ""
              }`}
              >
                <OptimizedImage
                  imagePath={image.image_path}
                  alt={`${folder} image`}
                  className={`object-cover w-full h-full ${
                    isFilePending ? "opacity-50" : ""
                  }`}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute top-2 right-2 bg-black/20"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(image.image_path, image.id);
                  }}
                  disabled={isFilePending}
                >
                  <Trash2 className="h-4 w-4 text-white" />
                </Button>
              </div>
            </DialogTrigger>
            <DialogContent className="max-w-4xl">
              <DialogTitle>
                {folder === "rules" ? "Game Rule" : "Game Example"}
              </DialogTitle>
              <OptimizedImage
                imagePath={image.image_path}
                alt={`${folder} image`}
                className="w-full h-auto"
              />
            </DialogContent>
          </Dialog>
        );
      })}

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
            if (files) handleFileUpload(files);
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
