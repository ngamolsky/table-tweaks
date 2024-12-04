import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSession } from "@supabase/auth-helpers-react";
import { GameImageGrid } from "@/components/GameImageGrid";
import { useCreateGame } from "@/hooks/useCreateGame";
import { GameWithImages } from "types/composite.types";
interface FormState {
  title: string;
  description: string;
  ruleUrls: string[];
  exampleUrls: string[];
  currentStep: "details" | "rules" | "examples";
}

const steps = {
  details: {
    title: "Details",
    description: null,
  },
  rules: {
    title: "Rules",
    description: "Take a picture or upload images of the game rules.",
  },
  examples: {
    title: "Examples",
    description:
      "Take a picture or upload images of examples of things you want to extract.",
  },
};

export function AddGame() {
  const navigate = useNavigate();
  const session = useSession();
  const [game, setGame] = useState<GameWithImages>();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formState, setFormState] = useState<FormState>({
    title: "",
    description: "",
    ruleUrls: [],
    exampleUrls: [],
    currentStep: "details",
  });

  const { mutateAsync: createGame } = useCreateGame();

  const userId = session?.user?.id;

  async function handleDetailsSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const game = await createGame([
        {
          title: formState.title,
          description: formState.description,
          user_id: userId,
        },
      ]);
      setGame(game?.[0]);
      setFormState((prev) => ({ ...prev, currentStep: "rules" }));
    } catch (error) {
      console.error("Error creating game:", error);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleInstructionsSubmit() {
    setFormState((prev) => ({ ...prev, currentStep: "examples" }));
  }

  async function handleExemplarsSubmit() {
    navigate("/");
  }

  return (
    <div className="max-w-2xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>{steps[formState.currentStep].title}</CardTitle>
          <CardDescription>
            {steps[formState.currentStep].description}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {formState.currentStep === "details" && (
            <form onSubmit={handleDetailsSubmit} className="space-y-4">
              <div className="space-y-2">
                <label
                  htmlFor="title"
                  className="text-sm font-medium text-foreground"
                >
                  Title
                </label>
                <Input
                  id="title"
                  value={formState.title}
                  onChange={(e) =>
                    setFormState((prev) => ({
                      ...prev,
                      title: e.target.value,
                    }))
                  }
                  className="w-full text-base"
                  required
                />
              </div>

              <div className="space-y-2">
                <label
                  htmlFor="description"
                  className="text-sm font-medium text-foreground"
                >
                  Description
                </label>
                <Textarea
                  id="description"
                  value={formState.description}
                  onChange={(e) =>
                    setFormState((prev) => ({
                      ...prev,
                      description: e.target.value,
                    }))
                  }
                  className="min-h-[100px]"
                />
              </div>

              <Button type="submit" disabled={isSubmitting} className="w-full">
                {isSubmitting ? "Creating..." : "Next: Add Instructions"}
              </Button>
            </form>
          )}

          {formState.currentStep === "rules" && game && (
            <div className="space-y-4">
              <GameImageGrid
                folder="rules"
                game={game}
                onComplete={() => {
                  // handleInstructionsSubmit();
                }}
              />
              <Button
                onClick={handleInstructionsSubmit}
                disabled={isSubmitting}
                className="w-full"
              >
                {isSubmitting ? "Saving..." : "Next: Add Examples"}
              </Button>
            </div>
          )}

          {formState.currentStep === "examples" && game && (
            <div className="space-y-4">
              <GameImageGrid
                folder="examples"
                game={game}
                onComplete={() => {
                  // handleExemplarsSubmit();
                }}
              />
              <Button
                onClick={handleExemplarsSubmit}
                disabled={isSubmitting}
                className="w-full"
              >
                {isSubmitting ? "Saving..." : "Submit"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
