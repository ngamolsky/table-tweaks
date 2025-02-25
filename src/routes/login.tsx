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
