import { createFileRoute } from "@tanstack/react-router";
import { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { router } from "@/lib/router";
interface LoginSearchParams {
  redirect?: string;
}

export const Route = createFileRoute("/login")({
  validateSearch: (search): LoginSearchParams => {
    return { redirect: search.redirect as string | undefined };
  },
  component: LoginPage,
});

function LoginPage() {
  const { redirect = "/" } = Route.useSearch();
  const [showOTPInput, setShowOTPInput] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>();
  const [email, setEmail] = useState<string>();
  const [otp, setOtp] = useState("");
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    setOtp("");
  }, [showOTPInput]);

  // Google Sign-In handler
  async function handleGoogleSignIn() {
    setIsLoading(true);
    setError(undefined);
    try {
      await supabase.auth.signInWithOAuth({
        provider: "google",
      });
      // The user will be redirected, so no further action needed here
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(undefined);
    setIsLoading(true);

    try {
      if (!showOTPInput) {
        await supabase.auth.signInWithOtp({
          email: otp,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback?redirect=${encodeURIComponent(redirect)}`,
          },
        });
        setEmail(otp);
        setShowOTPInput(true);
      } else {
        if (otp.length !== 6 || !/^\d+$/.test(otp)) {
          throw new Error("Please enter a valid 6-digit code");
        }
        await supabase.auth.verifyOtp({
          email: email!,
          token: otp,
          type: "email",
        });

        await router.navigate({ to: redirect || "/" });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  }

  function handleOTPChange(value: string) {
    const sanitizedValue = value.replace(/[^0-9]/g, "").slice(0, 6);
    setOtp(sanitizedValue);

    if (sanitizedValue.length === 6) {
      setTimeout(() => formRef.current?.requestSubmit(), 0);
    }
  }

  return (
    <div className="fixed inset-0 bg-background flex flex-col items-center justify-center p-4 bg-gradient-to-b from-background to-muted">
      <div className="w-full max-w-md mx-auto">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold tracking-tight">Table Tweaks</h1>
          <p className="text-muted-foreground mt-2">
            {showOTPInput
              ? "Enter the code we sent to your email"
              : "Your personal board game companion"}
          </p>
        </div>

        <div className="bg-card rounded-lg shadow-md p-6 border border-border">
          {/* Google Sign-In Button */}
          <Button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={isLoading}
            variant="outline"
            className="w-full mb-4 flex items-center justify-center gap-2"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 48 48"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <g clipPath="url(#clip0_17_40)">
                <path
                  d="M47.5 24.5C47.5 22.6 47.3 20.8 47 19H24V29H37.1C36.5 32.1 34.5 34.7 31.7 36.4V42H39.3C44 38.1 47.5 32 47.5 24.5Z"
                  fill="#4285F4"
                />
                <path
                  d="M24 48C30.6 48 36.2 45.8 39.3 42L31.7 36.4C30 37.5 27.8 38.2 24 38.2C18.7 38.2 14.1 34.7 12.5 30.1H4.7V35.8C7.8 41.1 15.2 48 24 48Z"
                  fill="#34A853"
                />
                <path
                  d="M12.5 30.1C12.1 29 11.9 27.8 11.9 26.5C11.9 25.2 12.1 24 12.5 22.9V17.2H4.7C3.2 20.1 2.5 23.2 2.5 26.5C2.5 29.8 3.2 32.9 4.7 35.8L12.5 30.1Z"
                  fill="#FBBC05"
                />
                <path
                  d="M24 9.8C27.2 9.8 29.7 11 31.3 12.5L39.4 5.1C36.2 2.1 30.6 0 24 0C15.2 0 7.8 6.9 4.7 12.2L12.5 17.9C14.1 13.3 18.7 9.8 24 9.8Z"
                  fill="#EA4335"
                />
              </g>
              <defs>
                <clipPath id="clip0_17_40">
                  <rect width="48" height="48" fill="white" />
                </clipPath>
              </defs>
            </svg>
            Sign in with Google
          </Button>
          {/* Divider */}
          <div className="flex items-center my-4">
            <div className="flex-grow h-px bg-border" />
            <span className="mx-2 text-muted-foreground text-xs">or</span>
            <div className="flex-grow h-px bg-border" />
          </div>
          <form ref={formRef} onSubmit={handleSubmit}>
            <div className="space-y-4">
              {showOTPInput ? (
                <Input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => handleOTPChange(e.target.value)}
                  placeholder="Enter 6-digit code"
                  className="text-center text-lg tracking-widest"
                  required
                />
              ) : (
                <Input
                  type="email"
                  placeholder="Enter your email"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  required
                />
              )}

              {error && <p className="text-destructive text-sm">{error}</p>}

              <Button type="submit" disabled={isLoading} className="w-full">
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Loading...
                  </>
                ) : showOTPInput ? (
                  "Verify Code"
                ) : (
                  "Send Code"
                )}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
