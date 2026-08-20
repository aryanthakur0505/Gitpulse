"use client";

import { useEffect } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log to console in dev — replace with Sentry in prod
    console.error("[Dashboard Error]", error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center px-4">
      <div className="relative mb-6 flex h-20 w-20 items-center justify-center">
        <div className="absolute inset-0 rounded-full bg-red-600/10 blur-xl" />
        <div className="relative flex h-20 w-20 items-center justify-center rounded-2xl bg-red-500/10 ring-1 ring-red-500/20">
          <AlertTriangle className="h-9 w-9 text-red-400" />
        </div>
      </div>

      <h2 className="text-xl font-bold text-foreground">Something went wrong</h2>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">
        An unexpected error occurred. The error has been logged. Please try again.
      </p>

      {process.env.NODE_ENV === "development" && error.message && (
        <pre className="mt-4 max-w-lg overflow-auto rounded-lg bg-muted/20 border border-border/50 px-4 py-3 text-left text-xs text-red-400/80">
          {error.message}
        </pre>
      )}

      <Button
        id="error-reset-button"
        variant="gradient"
        className="mt-6 gap-2"
        onClick={reset}
      >
        <RefreshCw className="h-4 w-4" />
        Try again
      </Button>
    </div>
  );
}
