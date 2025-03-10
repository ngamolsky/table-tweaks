import { createFileRoute } from "@tanstack/react-router";
import { RulesSetup } from "@/components/games/RulesSetup";
import { GameDetail } from "@/components/games/GameDetail";

interface GameParams {
  id: string;
}

const GameDetails = () => {
  const { id } = Route.useParams();
  const { setup } = Route.useSearch();

  // If setup=rules, show the rules setup component
  if (setup === "rules") {
    return <RulesSetup gameId={id} />;
  }

  // Otherwise show the regular game details
  return <GameDetail gameId={id} />;
};

export const Route = createFileRoute("/_authenticated/games/$id")({
  component: GameDetails,
  parseParams: (params): GameParams => ({
    id: params.id,
  }),
  validateSearch: (search: Record<string, unknown>): { setup?: string } => {
    return {
      setup: search.setup as string | undefined,
    };
  },
});
