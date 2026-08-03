"use client";

import { signIn } from "next-auth/react";
import { Github, Loader2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

interface SignInButtonProps {
  callbackUrl?: string;
}

export function SignInButton({ callbackUrl = "/dashboard" }: SignInButtonProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleSignIn = async () => {
    setIsLoading(true);
    try {
      await signIn("github", { callbackUrl });
    } catch {
      setIsLoading(false);
    }
  };

  return (
    <Button
      id="github-signin-button"
      onClick={handleSignIn}
      disabled={isLoading}
      variant="gradient"
      size="lg"
      className="w-full gap-3"
    >
      {isLoading ? (
        <Loader2 className="h-5 w-5 animate-spin" />
      ) : (
        <Github className="h-5 w-5" />
      )}
      {isLoading ? "Signing in…" : "Continue with GitHub"}
    </Button>
  );
}
