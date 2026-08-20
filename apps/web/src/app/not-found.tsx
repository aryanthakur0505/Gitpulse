import Link from "next/link";
import type { Metadata } from "next";
import { GitBranch, Home, Search } from "lucide-react";

export const metadata: Metadata = {
  title: "404 — Page Not Found",
  description: "The page you're looking for doesn't exist.",
};

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      {/* Glow orb */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="h-[400px] w-[400px] rounded-full bg-violet-600/10 blur-[120px]" />
      </div>

      <div className="relative flex flex-col items-center text-center">
        {/* Icon */}
        <div className="relative mb-6 flex h-24 w-24 items-center justify-center">
          <div className="absolute inset-0 animate-pulse rounded-full bg-gradient-to-br from-violet-600/30 to-indigo-600/30 blur-xl" />
          <div className="relative flex h-24 w-24 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600/20 to-indigo-600/20 ring-1 ring-violet-500/20">
            <Search className="h-10 w-10 text-violet-400" />
          </div>
        </div>

        {/* Code */}
        <p className="text-7xl font-black text-gradient mb-2">404</p>
        <h1 className="text-2xl font-bold text-foreground">Page not found</h1>
        <p className="mt-2 max-w-sm text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>

        {/* Actions */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-violet-500/25 transition-all hover:shadow-violet-500/40 hover:opacity-90"
          >
            <Home className="h-4 w-4" />
            Back to Dashboard
          </Link>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 rounded-xl border border-border/50 bg-muted/20 px-5 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted/40"
          >
            <GitBranch className="h-4 w-4" />
            My Repositories
          </Link>
        </div>
      </div>
    </div>
  );
}
