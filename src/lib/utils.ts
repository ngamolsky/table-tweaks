import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { supabase } from "./supabase";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export async function getSignedUrl(imagePath: string) {
  if (!imagePath) return;

  try {
    const { data } = await supabase.storage
      .from(import.meta.env.VITE_GAME_ASSETS_BUCKET)
      .createSignedUrl(imagePath, 3600);

    if (data?.signedUrl) {
      return data.signedUrl;
    }
  } catch (error) {
    console.error("Error getting signed URL:", error);
  }
}

export function getUrlSafeGameName(gameName: string) {
  return gameName.replace(/\s+/g, "-").toLowerCase();
}
