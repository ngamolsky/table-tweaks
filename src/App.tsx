import { BrowserRouter } from "react-router-dom";
import { useRoutes, useNavigate } from "react-router-dom";
import { Layout } from "./components/Layout";
import { Home } from "./pages/Home";
import { GameDetails } from "./pages/GameDetails";
import { AddGame } from "./pages/AddGame";
import { Profile } from "./pages/Profile";
import { useState } from "react";
import { supabase } from "./lib/supabase";
import { useSession } from "@supabase/auth-helpers-react";
import { AuthModal } from "./components/AuthModal";
import { SessionContextProvider } from "@supabase/auth-helpers-react";
import { AnimatePresence } from "framer-motion";
import { useSystemTheme } from "@/hooks/useSystemTheme";

function AppContent() {
  const session = useSession();
  const navigate = useNavigate();
  const [_, setIsAuthModalOpen] = useState(true);
  const [showOTPInput, setShowOTPInput] = useState(false);
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>("");

  const element = useRoutes([
    {
      element: <Layout />,
      children: [
        { path: "/", element: <Home /> },
        { path: "/games/add", element: <AddGame /> },
        { path: "/games/:id", element: <GameDetails /> },
        { path: "/profile", element: <Profile /> },
      ],
    },
  ]);

  const handleInitiateSignIn = async (email: string) => {
    setIsLoading(true);
    setError("");

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { shouldCreateUser: true },
      });

      if (error) throw error;

      setEmail(email);
      setShowOTPInput(true);
    } catch (error) {
      console.error(error);
      setError(error instanceof Error ? error.message : "Failed to send code");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOTP = async (otp: string) => {
    if (!/^\d{6}$/.test(otp)) {
      setError("Please enter a valid 6-digit code");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const { error } = await supabase.auth.verifyOtp({
        email,
        token: otp,
        type: "email",
      });

      if (error) throw error;

      setIsAuthModalOpen(false);
      setShowOTPInput(false);
      navigate("/");
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Failed to verify code"
      );
    } finally {
      setIsLoading(false);
    }
  };

  if (!session) {
    return (
      <div className="fixed inset-0 bg-background flex flex-col items-center justify-center p-4 bg-gradient-to-b from-background to-muted overflow-hidden min-h-[100dvh] safe-area-inset-padding">
        <div className="w-full max-w-md mx-auto px-4">
          <div className="mb-8 text-center space-y-3">
            <h1 className="text-3xl font-bold text-foreground tracking-tight">
              Table Tweaks
            </h1>
            <p className="text-muted-foreground text-base">
              Your personal board game companion
            </p>
          </div>
          <div className="bg-card rounded-2xl shadow-lg border border-border">
            <div className="p-6">
              <h2 className="text-lg font-semibold mb-4 text-card-foreground">
                {showOTPInput
                  ? "Enter verification code"
                  : "Sign in to continue"}
              </h2>
              <AuthModal
                onSubmit={showOTPInput ? handleVerifyOTP : handleInitiateSignIn}
                showOTPInput={showOTPInput}
                isLoading={isLoading}
                error={error}
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return <AnimatePresence mode="wait">{element}</AnimatePresence>;
}

export function App() {
  useSystemTheme();

  return (
    <BrowserRouter>
      <SessionContextProvider supabaseClient={supabase}>
        <AppContent />
      </SessionContextProvider>
    </BrowserRouter>
  );
}

export default App;
