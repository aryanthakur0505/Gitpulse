"use client";

import Link from "next/link";
import { GitFork, Star, Trash2, ExternalLink, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useDeleteRepository, type Repository } from "@/hooks/useRepositories";
import { cn } from "@/lib/utils";

// ─── Status Config ────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<
  Repository["status"],
  { label: string; className: string }
> = {
  PENDING: {
    label: "Pending",
    className: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  },
  CLONING: {
    label: "Cloning",
    className: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  },
  PROCESSING: {
    label: "Processing",
    className: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  },
  EMBEDDING: {
    label: "Embedding",
    className: "bg-violet-500/10 text-violet-400 border-violet-500/20",
  },
  READY: {
    label: "Ready",
    className: "bg-green-500/10 text-green-400 border-green-500/20",
  },
  FAILED: {
    label: "Failed",
    className: "bg-red-500/10 text-red-400 border-red-500/20",
  },
};

const LANGUAGE_COLORS: Record<string, string> = {
  TypeScript: "bg-blue-500",
  JavaScript: "bg-yellow-400",
  Python: "bg-green-500",
  Rust: "bg-orange-500",
  Go: "bg-cyan-400",
  Java: "bg-red-500",
  "C++": "bg-pink-500",
  Ruby: "bg-red-400",
  default: "bg-gray-400",
};

// ─── Component ────────────────────────────────────────────────────────────────

interface RepositoryCardProps {
  repository: Repository;
}

export function RepositoryCard({ repository }: RepositoryCardProps) {
  const { mutateAsync: deleteRepo, isPending: isDeleting } =
    useDeleteRepository();

  const statusConfig = STATUS_CONFIG[repository.status];
  const langColor =
    LANGUAGE_COLORS[repository.language ?? ""] ?? LANGUAGE_COLORS.default;

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault(); // prevent Link navigation
    if (!confirm(`Delete "${repository.fullName}"? This cannot be undone.`)) {
      return;
    }
    try {
      await deleteRepo(repository.id);
      toast.success(`"${repository.fullName}" deleted`);
    } catch {
      toast.error("Failed to delete repository");
    }
  };

  return (
    <div className="group glass rounded-xl p-5 transition-all duration-200 hover:glow">
      <div className="flex items-start justify-between gap-3">
        {/* Left: Repo info */}
        <div className="min-w-0 flex-1">
          {/* Name row */}
          <div className="flex items-center gap-2">
            <Link
              href={`/repositories/${repository.id}`}
              className="truncate text-sm font-semibold text-foreground hover:text-primary transition-colors"
            >
              {repository.fullName}
            </Link>
            <a
              href={repository.url}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:text-foreground"
              aria-label="Open on GitHub"
            >
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>

          {/* Description */}
          {repository.description && (
            <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
              {repository.description}
            </p>
          )}

          {/* Meta row */}
          <div className="mt-3 flex flex-wrap items-center gap-3">
            {/* Language */}
            {repository.language && (
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span
                  className={cn("h-2.5 w-2.5 rounded-full", langColor)}
                />
                {repository.language}
              </span>
            )}

            {/* Stars */}
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Star className="h-3 w-3" />
              {repository.stars.toLocaleString()}
            </span>

            {/* Forks */}
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <GitFork className="h-3 w-3" />
              {repository.forks.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Right: Status + Actions */}
        <div className="flex shrink-0 flex-col items-end gap-2">
          <Badge
            className={cn(
              "border text-[10px] font-medium uppercase tracking-wider",
              statusConfig.className
            )}
          >
            {statusConfig.label}
          </Badge>
          <Button
            id={`delete-repo-${repository.id}`}
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:bg-red-500/10 hover:text-red-400"
            onClick={handleDelete}
            disabled={isDeleting}
            aria-label="Delete repository"
          >
            {isDeleting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Trash2 className="h-3.5 w-3.5" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
