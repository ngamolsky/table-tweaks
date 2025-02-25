import { createFileRoute } from "@tanstack/react-router";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { ImageIcon, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogTrigger,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useGameCreate, type GameImage } from "@/contexts/GameCreateContext";

interface ImageCardProps {
  image: GameImage;
  onSetCover: (id: string) => void;
  onRemove: (id: string) => void;
}

const ImageCard = ({ image, onSetCover, onRemove }: ImageCardProps) => {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Card
          className={cn(
            "relative overflow-hidden aspect-square group cursor-pointer transition-all outline-none focus:outline-none focus-visible:outline-none border-0"
          )}
        >
          <div className="absolute top-2 right-2 z-10">
            <Button
              variant="destructive"
              size="icon"
              className="bg-black/40 hover:bg-red-600/90 outline-none focus:outline-none focus-visible:outline-none"
              onClick={(e) => {
                e.stopPropagation();
                onRemove(image.id);
              }}
            >
              <X className="h-4 w-4 text-white" />
            </Button>
          </div>
          {image.isCover && (
            <div className="absolute top-2 left-2 z-10">
              <div className="bg-black/40 px-2 py-1 rounded-md">
                <span className="text-xs font-medium text-white">Cover</span>
              </div>
            </div>
          )}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
          <img
            src={image.previewUrl}
            alt="Game rule"
            className="w-full h-full object-cover select-none"
            draggable={false}
          />
        </Card>
      </DialogTrigger>
      <DialogContent className="p-0 w-[90%] max-w-[320px] rounded-xl overflow-hidden border-0">
        <div className="flex flex-col w-full">
          <div className="p-6 pb-3">
            <DialogTitle className="text-lg font-semibold text-center">
              Image Actions
            </DialogTitle>
            <DialogDescription className="sr-only">
              Choose actions for the selected image
            </DialogDescription>
          </div>
          <div className="px-3 pb-3 space-y-1">
            {!image.isCover && (
              <Button
                variant="ghost"
                className="w-full justify-center h-12 text-base font-medium outline-none focus:outline-none focus-visible:outline-none hover:bg-secondary"
                onClick={() => {
                  onSetCover(image.id);
                  setOpen(false);
                }}
              >
                Set as Cover Photo
              </Button>
            )}
            <Button
              variant="ghost"
              className="w-full justify-center h-12 text-base font-medium text-destructive hover:text-destructive outline-none focus:outline-none focus-visible:outline-none hover:bg-secondary"
              onClick={() => {
                onRemove(image.id);
                setOpen(false);
              }}
            >
              Delete Image
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export const Route = createFileRoute("/_authenticated/games/add/upload")({
  component: UploadStep,
});

function UploadStep() {
  const [isUploading, setIsUploading] = useState(false);
  const { gameData, addImages, removeImage, setCoverImage } = useGameCreate();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;

    const files = Array.from(e.target.files);
    setIsUploading(true);

    try {
      await addImages(files);
    } catch (error) {
      console.error("Error processing images:", error);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="flex flex-col flex-1">
      <div className="flex-1 border-2 border-dashed rounded-lg p-4 sm:p-8 flex flex-col min-h-0">
        {gameData.images.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center flex-1"
            onClick={() => document.getElementById("images")?.click()}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                document.getElementById("images")?.click();
              }
            }}
          >
            <Input
              id="images"
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileChange}
              disabled={isUploading}
              className="hidden"
            />
            <div
              className={cn(
                "flex flex-col items-center gap-4 cursor-pointer p-4",
                isUploading && "opacity-50 cursor-not-allowed"
              )}
            >
              {isUploading ? (
                <Loader2 className="h-12 w-12 animate-spin" />
              ) : (
                <ImageIcon className="h-12 w-12" />
              )}
              <p className="text-lg font-medium text-center">
                {isUploading ? "Processing..." : "Upload Game Rules"}
              </p>
              <p className="text-sm text-muted-foreground text-center">
                Upload photos of your game rules to get started
              </p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {gameData.images.map((image) => (
                <ImageCard
                  key={image.id}
                  image={image}
                  onSetCover={setCoverImage}
                  onRemove={removeImage}
                />
              ))}
              <Card
                className="relative overflow-hidden aspect-square group cursor-pointer transition-all outline-none focus:outline-none focus-visible:outline-none border-2 border-dashed flex items-center justify-center"
                onClick={() => document.getElementById("images")?.click()}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    document.getElementById("images")?.click();
                  }
                }}
              >
                <Input
                  id="images"
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleFileChange}
                  disabled={isUploading}
                  className="hidden"
                />
                {isUploading ? (
                  <Loader2 className="h-8 w-8 animate-spin" />
                ) : (
                  <ImageIcon className="h-8 w-8" />
                )}
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
