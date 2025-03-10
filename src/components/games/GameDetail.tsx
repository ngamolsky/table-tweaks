import { useState, useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  Edit,
  Trash2,
  Save,
  X,
  ChevronLeft,
  Star,
  Users,
  Clock,
  BarChart3,
  Calendar,
  Loader2,
  CheckCircle,
} from "lucide-react";
import {
  useGamesQueries,
  useGamesMutations,
  useGamesSubscriptions,
} from "@/hooks/games";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { decodeHtmlEntities } from "@/utils/textUtils";
import { RulesProcessingStatus } from "@/components/games/RulesProcessingStatus";
import { toast } from "sonner";

interface GameDetailProps {
  gameId: string;
}

export function GameDetail({ gameId }: GameDetailProps) {
  const navigate = useNavigate();
  const { useGame } = useGamesQueries();
  const { useUpdateGame, useDeleteGame } = useGamesMutations();
  const { useSubscribeToGameRules } = useGamesSubscriptions();
  const { data: game, isLoading, error } = useGame(gameId);

  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [editedGame, setEditedGame] = useState<{
    name: string;
    description: string | null;
    min_players: number | null;
    max_players: number | null;
    estimated_time: string | null;
  } | null>(null);
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);

  // Initialize edited game when data is loaded
  useEffect(() => {
    if (game && !editedGame) {
      setEditedGame({
        name: game.name,
        description: game.description,
        min_players: game.min_players,
        max_players: game.max_players,
        estimated_time: game.estimated_time,
      });
    }
  }, [game, editedGame]);

  // Subscribe to game rules changes
  useSubscribeToGameRules(gameId);

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    if (game) {
      setEditedGame({
        name: game.name,
        description: game.description,
        min_players: game.min_players,
        max_players: game.max_players,
        estimated_time: game.estimated_time,
      });
    }
    setIsEditing(false);
  };

  const handleSaveEdit = async () => {
    if (!editedGame) return;

    try {
      await useUpdateGame.mutateAsync({
        id: gameId,
        name: editedGame.name,
        description: editedGame.description,
        min_players: editedGame.min_players,
        max_players: editedGame.max_players,
        estimated_time: editedGame.estimated_time,
      });

      toast.success("The game details have been updated successfully.");

      setIsEditing(false);
    } catch (error) {
      console.error("Failed to update game:", error);
      toast.error("Failed to update the game. Please try again.");
    }
  };

  const handleDelete = async () => {
    try {
      await useDeleteGame.mutateAsync({ id: gameId });

      toast.success("The game has been deleted successfully.");

      navigate({ to: "/" });
    } catch (error) {
      console.error("Failed to delete game:", error);
      toast.error("Failed to delete the game. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleBack = () => {
    navigate({ to: "/" });
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
        <p className="text-muted-foreground">Loading game details...</p>
      </div>
    );
  }

  if (error || !game) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <p className="text-destructive mb-4">Failed to load game details</p>
        <Button onClick={handleBack} variant="outline">
          <ChevronLeft className="h-4 w-4 mr-2" />
          Back to Home
        </Button>
      </div>
    );
  }

  // Get cover image URL
  const coverImageUrl = game.cover_image?.image_url || game.bgg_image_url;

  return (
    <div className="container max-w-4xl mx-auto py-8 px-4">
      <div className="flex items-center justify-between mb-6">
        <Button onClick={handleBack} variant="outline" size="sm">
          <ChevronLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <div className="flex space-x-2">
          {isEditing ? (
            <>
              <Button
                onClick={handleSaveEdit}
                variant="default"
                size="sm"
                disabled={useUpdateGame.isPending}
              >
                {useUpdateGame.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Save
              </Button>
              <Button onClick={handleCancelEdit} variant="outline" size="sm">
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
            </>
          ) : (
            <>
              <Button onClick={handleEdit} variant="outline" size="sm">
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
              <Dialog open={isDeleting} onOpenChange={setIsDeleting}>
                <DialogTrigger asChild>
                  <Button variant="destructive" size="sm">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Delete Game</DialogTitle>
                    <DialogDescription>
                      Are you sure you want to delete "{game.name}"? This action
                      cannot be undone.
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter>
                    <Button
                      variant="outline"
                      onClick={() => setIsDeleting(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={handleDelete}
                      disabled={useDeleteGame.isPending}
                    >
                      {useDeleteGame.isPending ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4 mr-2" />
                      )}
                      Delete
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1">
          <Card>
            <CardContent className="p-4">
              {coverImageUrl ? (
                <img
                  src={coverImageUrl}
                  alt={game.name}
                  className="w-full aspect-square object-cover rounded-md"
                />
              ) : (
                <div className="w-full aspect-square bg-muted rounded-md flex items-center justify-center">
                  <span className="text-muted-foreground">No image</span>
                </div>
              )}

              <div className="mt-4 space-y-3">
                {game.bgg_rating && (
                  <div className="flex items-center">
                    <Star className="h-4 w-4 text-yellow-500 mr-2" />
                    <span className="text-sm">
                      BGG Rating: {game.bgg_rating.toFixed(1)}/10
                    </span>
                  </div>
                )}

                <div className="flex items-center">
                  <Users className="h-4 w-4 text-blue-500 mr-2" />
                  <span className="text-sm">
                    Players: {game.min_players || "?"}
                    {game.max_players && game.min_players !== game.max_players
                      ? `-${game.max_players}`
                      : ""}
                  </span>
                </div>

                {game.estimated_time && (
                  <div className="flex items-center">
                    <Clock className="h-4 w-4 text-green-500 mr-2" />
                    <span className="text-sm">Time: {game.estimated_time}</span>
                  </div>
                )}

                {game.bgg_weight && (
                  <div className="flex items-center">
                    <BarChart3 className="h-4 w-4 text-purple-500 mr-2" />
                    <span className="text-sm">
                      Weight: {game.bgg_weight.toFixed(1)}/5
                    </span>
                  </div>
                )}

                {game.bgg_year_published && (
                  <div className="flex items-center">
                    <Calendar className="h-4 w-4 text-orange-500 mr-2" />
                    <span className="text-sm">
                      Year: {game.bgg_year_published}
                    </span>
                  </div>
                )}
              </div>

              {game.bgg_id && (
                <div className="mt-4">
                  <a
                    href={`https://boardgamegeek.com/boardgame/${game.bgg_id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-500 hover:underline flex items-center"
                  >
                    View on BoardGameGeek
                  </a>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="md:col-span-2">
          <Card className="h-full">
            <CardHeader>
              {isEditing ? (
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="name">Game Name</Label>
                    <Input
                      id="name"
                      value={editedGame?.name || ""}
                      onChange={(e) =>
                        setEditedGame((prev) =>
                          prev ? { ...prev, name: e.target.value } : null
                        )
                      }
                      className="mt-1"
                    />
                  </div>
                </div>
              ) : (
                <CardTitle>{game.name}</CardTitle>
              )}
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="text-lg font-medium mb-2">Description</h3>
                {isEditing ? (
                  <Textarea
                    value={editedGame?.description || ""}
                    onChange={(e) =>
                      setEditedGame((prev) =>
                        prev ? { ...prev, description: e.target.value } : null
                      )
                    }
                    className="min-h-[150px]"
                    placeholder="Enter game description..."
                  />
                ) : (
                  <div className="text-muted-foreground">
                    {game.description ? (
                      <>
                        <p
                          className={
                            isDescriptionExpanded ? "" : "line-clamp-4"
                          }
                        >
                          {decodeHtmlEntities(game.description || "")}
                        </p>
                        {game.description.length > 300 && (
                          <Button
                            variant="link"
                            size="sm"
                            className="mt-2 p-0 h-auto"
                            onClick={() =>
                              setIsDescriptionExpanded(!isDescriptionExpanded)
                            }
                          >
                            {isDescriptionExpanded ? "Show less" : "Show more"}
                          </Button>
                        )}
                      </>
                    ) : (
                      "No description available."
                    )}
                  </div>
                )}
              </div>

              {isEditing && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="min_players">Min Players</Label>
                    <Input
                      id="min_players"
                      type="number"
                      value={editedGame?.min_players || ""}
                      onChange={(e) =>
                        setEditedGame((prev) =>
                          prev
                            ? {
                                ...prev,
                                min_players: e.target.value
                                  ? parseInt(e.target.value)
                                  : null,
                              }
                            : null
                        )
                      }
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label htmlFor="max_players">Max Players</Label>
                    <Input
                      id="max_players"
                      type="number"
                      value={editedGame?.max_players || ""}
                      onChange={(e) =>
                        setEditedGame((prev) =>
                          prev
                            ? {
                                ...prev,
                                max_players: e.target.value
                                  ? parseInt(e.target.value)
                                  : null,
                              }
                            : null
                        )
                      }
                      className="mt-1"
                    />
                  </div>
                  <div className="col-span-2">
                    <Label htmlFor="estimated_time">Estimated Time</Label>
                    <Input
                      id="estimated_time"
                      value={editedGame?.estimated_time || ""}
                      onChange={(e) =>
                        setEditedGame((prev) =>
                          prev
                            ? { ...prev, estimated_time: e.target.value }
                            : null
                        )
                      }
                      className="mt-1"
                      placeholder="e.g. 30-45 minutes"
                    />
                  </div>
                </div>
              )}

              <div>
                <h3 className="text-lg font-medium mb-2">Rules</h3>
                {game.has_complete_rules ? (
                  <div className=" p-4 rounded-md">
                    <div className="flex items-center">
                      <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                      <span>This game has complete rules</span>
                    </div>
                  </div>
                ) : (
                  <RulesProcessingStatus gameId={gameId} />
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
