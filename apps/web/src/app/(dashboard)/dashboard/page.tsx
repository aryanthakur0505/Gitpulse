"use client";

import { useState } from "react";
import { GitBranch, MessageSquare, Plus, Zap, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ImportRepoModal } from "@/components/repositories/ImportRepoModal";
import { RepositoryCard } from "@/components/repositories/RepositoryCard";
import { useRepositories } from "@/hooks/useRepositories";
import { useSession } from "next-auth/react";

// ─── Stats Cards (reactive) ────────────────────────────────────────────────

function StatsCards({ repoCount }: { repoCount: number }) {
  const stats = [
    {
      label: "Repositories",
      value: repoCount,
      icon: GitBranch,
      description: repoCount === 0 ? "No repositories imported yet" : `${repoCount} imported`,
    },
    {
      label: "Conversations",
      value: 0,
      icon: MessageSquare,
      description: "Start chatting with a repo",
    },
    {
      label: "Code Chunks",
      value: 0,
      icon: Zap,
      description: "Indexed and ready for search",
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      {stats.map((card) => (
        <div
          key={card.label}
          className="glass rounded-xl p-5 transition-all duration-200 hover:glow"
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {card.label}
              </p>
              <p className="mt-2 text-3xl font-bold text-foreground">
                {card.value}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {card.description}
              </p>
            </div>
            <div className="rounded-lg bg-primary/10 p-2.5">
              <card.icon className="h-5 w-5 text-primary" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { data: session } = useSession();
  const [importOpen, setImportOpen] = useState(false);
  const { data: repositories, isLoading, isError } = useRepositories();

  const repoCount = repositories?.length ?? 0;
  const hasRepos = repoCount > 0;

  return (
    <div className="mx-auto max-w-6xl animate-fade-in space-y-8">
      {/* Welcome header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Welcome back,{" "}
            <span className="text-gradient">
              {session?.user?.name?.split(" ")[0] ?? "there"}
            </span>{" "}
            👋
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Import a repository to start exploring your codebase with AI.
          </p>
        </div>
        <Button
          id="import-repo-button"
          variant="gradient"
          className="gap-2"
          onClick={() => setImportOpen(true)}
        >
          <Plus className="h-4 w-4" />
          Import Repository
        </Button>
      </div>

      {/* Stats */}
      <StatsCards repoCount={repoCount} />

      {/* Repository list */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-28 w-full rounded-xl" />
          ))}
        </div>
      ) : isError ? (
        <div className="glass rounded-2xl p-8 text-center">
          <p className="text-sm text-red-400">
            Failed to load repositories. Make sure the API is running.
          </p>
        </div>
      ) : hasRepos ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium text-muted-foreground">
              Your Repositories ({repoCount})
            </h2>
          </div>
          {repositories!.map((repo) => (
            <RepositoryCard key={repo.id} repository={repo} />
          ))}
        </div>
      ) : (
        /* Empty state */
        <div className="glass rounded-2xl p-12 text-center">
          <div className="relative mx-auto mb-6 flex h-20 w-20 items-center justify-center">
            <div className="absolute inset-0 animate-pulse-glow rounded-full bg-gradient-to-br from-violet-600/30 to-indigo-600/30 blur-xl" />
            <div className="relative flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600/20 to-indigo-600/20 ring-1 ring-violet-500/20">
              <GitBranch className="h-9 w-9 text-violet-400" />
            </div>
          </div>
          <h2 className="text-xl font-semibold text-foreground">
            No repositories yet
          </h2>
          <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
            Import your first GitHub repository and let GitPulse index it. Then
            you can ask questions, explore architecture, and understand any
            codebase instantly.
          </p>
          <Button
            id="empty-state-import-button"
            variant="gradient"
            className="mt-6 gap-2"
            onClick={() => setImportOpen(true)}
          >
            <Plus className="h-4 w-4" />
            Import your first repository
          </Button>
        </div>
      )}

      {/* Import Modal */}
      <ImportRepoModal open={importOpen} onOpenChange={setImportOpen} />
    </div>
  );
}
