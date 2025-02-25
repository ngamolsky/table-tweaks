import { createFileRoute } from "@tanstack/react-router";

interface GameParams {
  id: string;
}

const GameDetails = () => {
  return <div>Game Details</div>;
};

export const Route = createFileRoute("/_authenticated/games/$id")({
  component: GameDetails,
  parseParams: (params): GameParams => ({
    id: params.id,
  }),
});
