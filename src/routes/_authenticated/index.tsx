import { createFileRoute } from "@tanstack/react-router";
import { GameSearch } from "@/components/games/GameSearch";

function Home() {
  return (
    <div className="space-y-8 max-w-3xl mx-auto">
      <GameSearch />
    </div>
  );
}

export const Route = createFileRoute("/_authenticated/")({
  component: Home,
});
