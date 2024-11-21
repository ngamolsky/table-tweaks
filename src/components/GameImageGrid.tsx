import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ImageIcon, Trash2, X, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { OptimizedImage } from "@/components/OptimizedImage";
import { GameWithImages } from "@/queries/games";
import { setupUppy } from "@/lib/uppy-config";
import { supabase } from "@/lib/supabase";
import { useSession } from "@supabase/auth-helpers-react";
import { getUrlSafeGameName } from "@/lib/utils";

interface GameImageGridProps {
  folder: "rules" | "example";
  game: GameWithImages;
  onComplete: (urls: string[]) => void;
  allowMultiple?: boolean;
}

interface UploadingFile {
  id: string;
  name: string;
  preview: string;
  status: "uploading" | "complete" | "error";
  progress?: number;
  error?: string;
}

// Create a custom hook for Uppy logic
function useUppy(
  allowMultiple: boolean,
  onComplete: (urls: string[]) => void,
  game: GameWithImages,
  folder: "rules" | "example",
  existingImages: any[],
  setImages: React.Dispatch<React.SetStateAction<any[]>>
) {
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);
  const session = useSession();
  const [uppy] = useState(() => setupUppy(allowMultiple, session));

  useEffect(() => {
    const handleFileAdded = (file: any) => {
      setUploadingFiles((prev) => [
        ...prev,
        {
          id: file.id,
          name: file.name || `file-${Date.now()}`,
          preview: URL.createObjectURL(file.data),
          status: "uploading",
          progress: 0,
        },
      ]);
    };

    const handleProgress = (file: any, progress: any) => {
      setUploadingFiles((prev) =>
        prev.map((f) =>
          f.id === file?.id
            ? {
                ...f,
                progress: Math.floor(
                  ((progress.bytesUploaded || 0) / (progress.bytesTotal || 0)) *
                    100
                ),
              }
            : f
        )
      );
    };

    const handleComplete = async (result: any) => {
      const uploadedFiles =
        result.successful?.map((file: any) => file.meta.objectName as string) ??
        [];

      if (uploadedFiles.length > 0) {
        const newImages = uploadedFiles.map((imagePath: string) => ({
          game_id: game.id,
          image_path: imagePath,
          ...(folder === "rules" && {
            display_order:
              existingImages.length + uploadedFiles.indexOf(imagePath),
          }),
        }));

        const { data, error } = await supabase
          .from(folder === "rules" ? "rules_images" : "example_images")
          .insert(newImages)
          .select();

        if (error) {
          setUploadingFiles((prev) =>
            prev.map((f) => ({
              ...f,
              status: "error",
              error: error.message,
            }))
          );
          console.error(`Error updating ${folder} images:`, error);
          return;
        }

        // Add new images to the images state
        setImages((prev) => [...prev, ...data]);

        // Clear uploading files since they're now in the main images array
        setUploadingFiles([]);

        onComplete(uploadedFiles);
      }
    };

    uppy.on("file-added", handleFileAdded);
    uppy.on("upload-progress", handleProgress);
    uppy.on("complete", handleComplete);

    return () => {
      uppy.off("file-added", handleFileAdded);
      uppy.off("upload-progress", handleProgress);
      uppy.off("complete", handleComplete);
    };
  }, [uppy, game.id, folder, existingImages.length, onComplete, setImages]);

  return { uppy, uploadingFiles, setUploadingFiles };
}

export function GameImageGrid({
  folder,
  game,
  allowMultiple = true,
  onComplete,
}: GameImageGridProps) {
  const [isDeleting, setIsDeleting] = useState<Record<string, boolean>>({});
  const [images, setImages] = useState(
    folder === "rules" ? game.rules_images : game.example_images
  );
  const session = useSession();

  const { uppy, uploadingFiles, setUploadingFiles } = useUppy(
    allowMultiple,
    onComplete,
    game,
    folder,
    images,
    setImages
  );

  // Handle image deletion
  async function handleDelete(imagePath: string, folder: "rules" | "example") {
    setIsDeleting((prev) => ({ ...prev, [imagePath]: true }));

    try {
      // Delete from storage
      console.log("Deleting image from storage", imagePath);

      const { error: storageError } = await supabase.storage
        .from(import.meta.env.VITE_GAME_ASSETS_BUCKET)
        .remove([imagePath]);

      if (storageError) throw storageError;

      // Delete from database
      console.log("Deleting image from database", imagePath);
      const { error: dbError } = await supabase
        .from(folder === "rules" ? "rules_images" : "example_images")
        .delete()
        .eq("image_path", imagePath);

      if (dbError) throw dbError;

      // Only remove from UI after successful deletion
      setImages((prev) => prev.filter((img) => img.image_path !== imagePath));
      console.log("Removed from UI", imagePath);
    } catch (error) {
      console.error(`Error deleting ${folder} image:`, error);
    } finally {
      setIsDeleting((prev) => ({ ...prev, [imagePath]: false }));
    }
  }

  const userId = session?.user?.id;

  const allImages = [...images, ...uploadingFiles];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {/* Existing Images */}
      {images.map((image) => (
        <Dialog key={image.id}>
          <DialogTrigger asChild>
            <div className="relative aspect-square group cursor-pointer overflow-hidden rounded-lg border">
              <OptimizedImage
                imagePath={image.image_path}
                alt={`${folder} image`}
                className="object-cover w-full h-full"
              />
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-2 right-2 bg-black/20"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete(image.image_path, folder);
                }}
                disabled={isDeleting[image.image_path]}
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
      ))}

      {/* Uploading Files */}
      {uploadingFiles.map((file) => (
        <div
          key={file.id}
          className="relative aspect-square group overflow-hidden rounded-lg border bg-muted"
        >
          <div className="absolute inset-0">
            <img
              src={file.preview}
              alt={file.name}
              className={`w-full h-full object-cover transition-opacity duration-200 ${
                file.status === "complete" ? "opacity-100" : "opacity-50"
              }`}
            />
          </div>

          {file.status !== "complete" && (
            <div className="absolute inset-0 flex items-center justify-center">
              {file.status === "uploading" && (
                <div className="flex flex-col items-center gap-2">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <span className="text-sm font-medium">{file.progress}%</span>
                </div>
              )}
              {file.status === "error" && (
                <div className="flex flex-col items-center gap-2 text-destructive">
                  <X className="h-8 w-8" />
                  <span className="text-sm font-medium">Upload failed</span>
                </div>
              )}
            </div>
          )}

          <Button
            variant="ghost"
            size="icon"
            className="absolute top-2 right-2 bg-black/20"
            onClick={() => {
              uppy.removeFile(file.id);
              setUploadingFiles((prev) => prev.filter((f) => f.id !== file.id));
              URL.revokeObjectURL(file.preview);
            }}
          >
            <X className="h-4 w-4 text-white" />
          </Button>
        </div>
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
            if (files) {
              Array.from(files).forEach((file, index) => {
                const extension = file.name.split(".").pop();
                return uppy.addFile({
                  name: file.name,
                  type: file.type,
                  data: file,
                  meta: {
                    bucketName: import.meta.env.VITE_GAME_ASSETS_BUCKET,
                    objectName: `user.${userId}/game.${getUrlSafeGameName(
                      game.title
                    )}-${game.id}/${folder}/${folder}-${
                      allImages.length + index + 1
                    }.${extension}`,
                  },
                });
              });
            }
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
