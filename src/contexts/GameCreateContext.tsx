import { createContext, useContext, useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";

export interface GameImage {
  id: string;
  file: File;
  previewUrl: string;
  isCover: boolean;
}

interface GameData {
  id?: string;
  name: string;
  description: string;
  estimatedTime: string;
  images: GameImage[];
  processingStatus?: "processing" | "completed" | "error";
}

interface GameCreateContextType {
  gameData: GameData;
  addImages: (files: File[]) => Promise<void>;
  removeImage: (id: string) => void;
  setCoverImage: (id: string) => void;
  updateGameData: (data: Partial<GameData>) => void;
  setGameId: (id: string) => void;
  isLoading: boolean;
  error: Error | null;
}

const GameCreateContext = createContext<GameCreateContextType | null>(null);

const initialGameData: GameData = {
  name: "",
  description: "",
  estimatedTime: "",
  images: [],
  processingStatus: undefined,
};

export function GameCreateProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [gameData, setGameData] = useState<GameData>(initialGameData);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    console.log("GameCreateProvider mounted");

    return () => {
      console.log("GameCreateProvider unmounted");
    };
  }, []);

  const processImageMutation = useMutation({
    mutationFn: async (files: File[]) => {
      const newImages: GameImage[] = await Promise.all(
        files.map(async (file) => ({
          id: crypto.randomUUID(),
          file,
          previewUrl: URL.createObjectURL(file),
          isCover: false,
        }))
      );

      // If this is the first image, make it the cover
      if (gameData.images.length === 0 && newImages.length > 0) {
        newImages[0].isCover = true;
      }

      return newImages;
    },
  });

  const addImages = async (files: File[]) => {
    try {
      const newImages = await processImageMutation.mutateAsync(files);
      setGameData((prev) => ({
        ...prev,
        images: [...prev.images, ...newImages],
      }));
    } catch (err) {
      setError(
        err instanceof Error ? err : new Error("Failed to process images")
      );
      throw err;
    }
  };

  const removeImage = (id: string) => {
    setGameData((prev) => {
      const removedImage = prev.images.find((img) => img.id === id);
      const newImages = prev.images.filter((img) => img.id !== id);

      // If we removed the cover image and there are other images, make the first one the cover
      if (removedImage?.isCover && newImages.length > 0) {
        newImages[0].isCover = true;
      }

      return {
        ...prev,
        images: newImages,
      };
    });
  };

  const setCoverImage = (id: string) => {
    setGameData((prev) => ({
      ...prev,
      images: prev.images.map((img) => ({
        ...img,
        isCover: img.id === id,
      })),
    }));
  };

  const updateGameData = (data: Partial<GameData>) => {
    setGameData((prev) => ({
      ...prev,
      ...data,
    }));
  };

  const setGameId = (id: string) => {
    setGameData((prev) => ({
      ...prev,
      id: id,
    }));
  };

  const value: GameCreateContextType = {
    gameData,
    addImages,
    removeImage,
    setCoverImage,
    updateGameData,
    setGameId,
    isLoading: processImageMutation.isPending,
    error,
  };

  return (
    <GameCreateContext.Provider value={value}>
      {children}
    </GameCreateContext.Provider>
  );
}

export function useGameCreate() {
  const context = useContext(GameCreateContext);
  if (!context) {
    throw new Error("useGameCreate must be used within a GameCreateProvider");
  }
  return context;
}
