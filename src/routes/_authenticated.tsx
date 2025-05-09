import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { MobileNavigation } from "@/components/layout/MobileNavigation";
import { AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/supabase";
import { Toaster } from "sonner";

const Layout = () => {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <main className="flex-1 relative z-0">
        <div className="absolute inset-0 overflow-hidden">
          <div className="container mx-auto px-4 py-4 h-full overflow-y-auto pb-[83px] md:pb-4">
            <AnimatePresence mode="wait" initial={false}>
              <Outlet />
            </AnimatePresence>
          </div>
        </div>
      </main>

      <div className="sticky bottom-0 z-20 bg-background md:hidden">
        <MobileNavigation />
      </div>

      <Toaster />
    </div>
  );
};

export const Route = createFileRoute("/_authenticated")({
  component: Layout,
  beforeLoad: async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      throw redirect({
        to: "/login",
        search: {
          redirect: window.location.pathname,
        },
      });
    }

    return {
      user: session.user,
    };
  },
  pendingComponent: () => (
    <div className="fixed inset-0 flex items-center justify-center bg-background">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  ),
  errorComponent: ({ error }) => {
    console.error("Protected route error:", error);
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <h2 className="text-xl font-bold">An Error Occurred</h2>
          <p className="text-gray-600">
            {error instanceof Error
              ? error.message
              : "Something went wrong. Please try again."}
          </p>
        </div>
      </div>
    );
  },
});
