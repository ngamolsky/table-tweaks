import { useEffect, useState } from "react";
import { ImageIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
interface OptimizedImageProps
  extends React.ImgHTMLAttributes<HTMLImageElement> {
  imagePath: string;
  fallbackSize?: "sm" | "md" | "lg";
}

export function OptimizedImage({
  imagePath,
  className,
  alt,
  fallbackSize = "md",
  ...props
}: OptimizedImageProps) {
  const [url, setUrl] = useState<string>();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function loadImage() {
      try {
        setIsLoading(true);
        setError(false);
        const signedUrl = await supabase.storage
          .from(import.meta.env.VITE_GAME_ASSETS_BUCKET)
          .createSignedUrl(imagePath, 3600);

        if (mounted && signedUrl?.data?.signedUrl) {
          setUrl(signedUrl.data.signedUrl);
        }
      } catch (err) {
        if (mounted) {
          setError(true);
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    }

    if (imagePath) {
      loadImage();
    }

    return () => {
      mounted = false;
    };
  }, [imagePath]);

  const fallbackSizes = {
    sm: "h-4 w-4",
    md: "h-6 w-6",
    lg: "h-8 w-8",
  };

  if (isLoading || error || !url) {
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

  return (
    <img src={url} alt={alt} className={className} loading="lazy" {...props} />
  );
}
