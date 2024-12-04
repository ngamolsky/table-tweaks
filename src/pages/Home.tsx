import { Link } from "react-router-dom";
import { Plus } from "lucide-react";
import { OptimizedImage } from "@/components/OptimizedImage";
import { useSession } from "@supabase/auth-helpers-react";
import { useUserGames } from "@/hooks/useUserGames";

export function Home() {
  const session = useSession();
  const { data: games, isLoading } = useUserGames(session?.user.id || "");

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-2">
        {isLoading ? (
          <div className="text-foreground">Loading...</div>
        ) : (
          <>
            {games?.map((game) => (
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
          priority={true}
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
