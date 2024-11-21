import { AnimatePresence } from "framer-motion";
import { PageTransition } from "./PageTransition";
import { Outlet, useLocation } from "react-router-dom";
import { Home as HomeIcon, Plus, User } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";

export function Layout() {
  const location = useLocation();

  const getPageTitle = () => {
    switch (location.pathname) {
      case "/":
        return "Home";
      case "/games/add":
        return "Add Game";
      case "/profile":
        return "Profile";
      default:
        if (location.pathname.startsWith("/games/")) {
          return "Game Details";
        }
        return "";
    }
  };

  return (
    <div className="fixed inset-0 flex flex-col bg-background">
      <div className="flex-none bg-card h-[env(safe-area-inset-top)]" />

      <header className="flex-none bg-card border-b border-border px-4 py-3">
        <h1 className="text-lg font-semibold text-foreground">
          {getPageTitle()}
        </h1>
      </header>

      <main className="flex-1 relative overflow-hidden">
        <AnimatePresence mode="wait">
          <PageTransition>
            <div className="absolute inset-0 overflow-auto pb-[calc(4.5rem+env(safe-area-inset-bottom))] px-4 pt-2 -webkit-overflow-scrolling-touch">
              <Outlet />
            </div>
          </PageTransition>
        </AnimatePresence>
      </main>

      <nav className="flex justify-around items-center fixed bottom-0 left-0 right-0 backdrop-blur-xl bg-background/80 border-t border-border">
        <Button
          variant="ghost"
          asChild
          className={`flex-col h-14 px-6 active:bg-transparent gap-0.5 relative ${
            location.pathname === "/" ? "text-primary" : "active:text-primary"
          }`}
        >
          <Link to="/">
            <HomeIcon className="h-6 w-6" />
            <span className="text-[10px] font-medium">Home</span>
          </Link>
        </Button>
        <Button
          variant="ghost"
          asChild
          className={`flex-col h-14 px-6 active:bg-transparent gap-0.5 relative ${
            location.pathname === "/games/add"
              ? "text-primary"
              : "active:text-primary"
          }`}
        >
          <Link to="/games/add">
            <Plus className="h-6 w-6" />
            <span className="text-[10px] font-medium">Add Game</span>
          </Link>
        </Button>
        <Button
          variant="ghost"
          asChild
          className={`flex-col h-14 px-6 active:bg-transparent gap-0.5 relative ${
            location.pathname === "/profile"
              ? "text-primary"
              : "active:text-primary"
          }`}
        >
          <Link to="/profile">
            <User className="h-6 w-6" />
            <span className="text-[10px] font-medium">Profile</span>
          </Link>
        </Button>
      </nav>
    </div>
  );
}
