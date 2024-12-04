import { useSession } from "@supabase/auth-helpers-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import {
  useQuery,
  useUpsertMutation,
} from "@supabase-cache-helpers/postgrest-react-query";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import type { Database } from "types/database.types";
import { supabase } from "@/lib/supabase";

type AIModel = Database["public"]["Enums"]["ai_model"];

export function Profile() {
  const session = useSession();

  const { data: preferences } = useQuery(
    supabase
      .from("user_preferences")
      .select("*")
      .eq("user_id", session?.user?.id ?? "")
      .single()
  );

  const updatePreferencesMutation = useUpsertMutation(
    supabase.from("user_preferences"),
    ["user_id"]
  );

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  const handleModelChange = async (model: AIModel) => {
    if (!session?.user?.id) return;

    await updatePreferencesMutation.mutateAsync([
      {
        user_id: session.user.id,
        ai_model: model,
        updated_at: new Date().toISOString(),
      },
    ]);
  };

  return (
    <div className="max-w-2xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex flex-col space-y-1">
            <span className="text-sm text-muted-foreground">Email</span>
            <span className="font-medium">{session?.user?.email}</span>
          </div>

          <div className="space-y-2">
            <Label htmlFor="ai-model">AI Model Preference</Label>
            <Select
              value={preferences?.ai_model ?? undefined}
              onValueChange={handleModelChange}
            >
              <SelectTrigger id="ai-model">
                <SelectValue placeholder="Select AI model" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="openai__gpt-4o-mini">GPT-4 Mini</SelectItem>
                <SelectItem value="openai__gpt-4o-2024-11-20">
                  GPT-4 2024
                </SelectItem>
                <SelectItem value="anthropic__claude-3-5-sonnet-20241022">
                  Claude 3 Sonnet
                </SelectItem>
                <SelectItem value="anthropic__claude-3-haiku-20240307">
                  Claude 3 Haiku
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button
            variant="destructive"
            onClick={handleSignOut}
            className="w-full"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
