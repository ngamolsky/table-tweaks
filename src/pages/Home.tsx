import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Plus } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Tables } from "../../types/database.types";
import { OptimizedImage } from "@/components/OptimizedImage";

type Game = Tables<"games"> & {
  rules_images: Tables<"rules_images">[];
  example_images: Tables<"example_images">[];
};

export function Home() {
  const [games, setGames] = useState<Game[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchGames() {
      try {
        const { data, error } = await supabase
          .from("games")
          .select(
            `
            *,
            rules_images (
              id,
              image_path,
              display_order
            ),
            example_images (
              id,
              image_path  
            )
          `
          )
          .returns<Game[]>()
          .order("created_at", { ascending: false });

        if (error) throw error;
        setGames(data || []);
      } catch (error) {
        console.error("Error fetching games:", error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchGames();
  }, []);

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
          <div className="text-foreground">Loading...</div>
        ) : (
          <>
            {games.map((game) => (
              <GameCard
                key={game.id}
                title={game.title}
                description={game.description}
                image={game.rules_images[0]?.image_path || ""}
                id={game.id}
              />
            ))}
            <Link
              to="/games/add"
              className="flex items-center justify-center h-64 border-2 border-dashed border-border rounded-xl active:border-primary active:bg-primary/10 transition-colors"
            >
              <div className="text-center">
                <Plus className="mx-auto h-12 w-12 text-muted-foreground" />
                <span className="mt-2 block text-sm font-medium text-foreground">
                  Add New Game
                </span>
              </div>
            </Link>
          </>
        )}
      </div>
    </div>
  );
}

function GameCard({
  title,
  description,
  image,
  id,
}: {
  title: string;
  description: string;
  image: string;
  id: string;
}) {
  return (
    <Link to={`/games/${id}`} className="block">
      <div className="bg-card rounded-xl shadow-sm overflow-hidden border border-border transition-shadow active:shadow-lg">
        <OptimizedImage
          imagePath={image}
          alt={title}
          className="w-full h-40 object-cover"
        />
        <div className="p-4">
          <h3 className="text-lg font-semibold text-card-foreground">
            {title}
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
    </Link>
  );
}
