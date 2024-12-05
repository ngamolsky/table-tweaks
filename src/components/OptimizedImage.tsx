import { ImageIcon } from "lucide-react";
import { useFileUrl } from "@supabase-cache-helpers/storage-react-query";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
interface OptimizedImageProps
  extends React.ImgHTMLAttributes<HTMLImageElement> {
  imagePath: string;
  fallbackSize?: "sm" | "md" | "lg";
  priority?: boolean;
  previewUrl?: string;
  status: "uploading" | "deleting" | "complete" | "error";
}

export function OptimizedImage({
  imagePath,
  className,
  alt,
  fallbackSize = "md",
  priority = false,
  previewUrl,
  status = "complete",
  ...props
}: OptimizedImageProps) {
  const {
    data: url,
    isLoading,
    error,
  } = useFileUrl(
    supabase.storage.from(import.meta.env.VITE_GAME_ASSETS_BUCKET),
    imagePath,
    "private",
    {
      expiresIn: 3600,
      enabled: status === "complete",
    }
  );

  console.log("url", url);

  const fallbackSizes = {
    sm: "h-4 w-4",
    md: "h-6 w-6",
    lg: "h-8 w-8",
  };

  if ((isLoading || error || !url) && !previewUrl) {
    return (
      <div
        className={cn("flex items-center justify-center bg-muted", className)}
      >
        <ImageIcon
          className={cn("text-muted-foreground", fallbackSizes[fallbackSize])}
        />
      </div>
    );
  }

  const displayUrl = url ?? previewUrl;

  return (
    <img
      src={displayUrl}
      alt={alt}
      className={cn(className, status !== "complete" && "opacity-50")}
      loading={priority ? "eager" : "lazy"}
      decoding={priority ? "sync" : "async"}
      {...props}
    />
  );
}
