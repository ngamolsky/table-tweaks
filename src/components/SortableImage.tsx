import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button } from "./ui/button";
import { Trash2 } from "lucide-react";
import { OptimizedImage } from "./OptimizedImage";
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "./ui/dialog";

interface SortableImageProps {
  id: string;
  imagePath: string;
  folder: string;
  isDeleting: boolean;
  onDelete: (imagePath: string, imageId: string) => void;
}

export function SortableImage({
  id,
  imagePath,
  folder,
  isDeleting,
  onDelete,
}: SortableImageProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 1 : 0,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <Dialog>
        <DialogTrigger asChild>
          <div
            className={`relative aspect-square group cursor-pointer overflow-hidden rounded-lg border
              ${isDeleting ? "animate-pulse bg-muted" : ""}`}
          >
            <OptimizedImage
              imagePath={imagePath}
              alt={`${folder} image`}
              className={`object-cover w-full h-full ${
                isDeleting ? "opacity-50" : ""
              }`}
            />
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-2 right-2 bg-black/20"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(imagePath, id);
              }}
              disabled={isDeleting}
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
            imagePath={imagePath}
            alt={`${folder} image`}
            className="w-full h-auto"
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
