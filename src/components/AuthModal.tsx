import { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

interface AuthModalProps {
  onSubmit: (value: string) => void;
  showOTPInput?: boolean;
  isLoading?: boolean;
  error?: string;
}

export function AuthModal({
  onSubmit,
  showOTPInput,
  isLoading,
  error,
}: AuthModalProps) {
  const [value, setValue] = useState("");
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    setValue("");
  }, [showOTPInput]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(value);
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedText = e.clipboardData
      .getData("text")
      .replace(/[^0-9]/g, "")
      .slice(0, 6);
    setValue(pastedText);

    if (pastedText.length === 6) {
      inputRefs.current[5]?.focus();
      onSubmit(pastedText);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="space-y-4">
        {showOTPInput ? (
          <div>
            <div className="grid grid-cols-6 gap-1 sm:gap-2 mb-2">
              {[...Array(6)].map((_, index) => (
                <Input
                  key={index}
                  ref={(el) => (inputRefs.current[index] = el)}
                  type="text"
                  inputMode="numeric"
                  maxLength={1}
                  value={value[index] || ""}
                  onChange={(e) => {
                    const newValue = value.split("");
                    newValue[index] = e.target.value.replace(/[^0-9]/g, "");
                    const updatedValue = newValue.join("");
                    setValue(updatedValue);
                    if (e.target.value && index < 5) {
                      inputRefs.current[index + 1]?.focus();
                    }
                    if (updatedValue.length === 6) {
                      onSubmit(updatedValue);
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Backspace" && !value[index] && index > 0) {
                      inputRefs.current[index - 1]?.focus();
                    }
                  }}
                  onPaste={handlePaste}
                  className="w-full h-10 text-center text-lg bg-background text-foreground"
                  required
                />
              ))}
            </div>
          </div>
        ) : (
          <Input
            type="email"
            placeholder="Enter your email"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className="bg-background text-foreground"
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
  );
}
