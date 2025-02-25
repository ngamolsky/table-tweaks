import { createFileRoute } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/lib/supabase";
const Profile = () => {
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      navigate({ to: "/login" });
    } catch (error) {
      console.error("Error signing out:", error);
      toast({
        variant: "destructive",
        title: "Error signing out",
        description: "Please try again later.",
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">Profile</h1>
        <Button variant="destructive" onClick={handleSignOut} className="gap-2">
          <LogOut className="h-4 w-4" />
          Sign Out
        </Button>
      </div>

      {/* Add more profile content here */}
      <div className="rounded-lg border p-4">
        <p className="text-sm text-muted-foreground">
          More profile content coming soon...
        </p>
      </div>
    </div>
  );
};

export const Route = createFileRoute("/_authenticated/profile")({
  component: Profile,
});
