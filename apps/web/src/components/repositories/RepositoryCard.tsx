"use client";

import Link from "next/link";
import {
  GitFork, Star, Trash2, ExternalLink, Loader2,
  AlertCircle, CheckCircle2, RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  useDeleteRepository,
  useReindexRepository,
  useRepository,
  type Repository,
} from "@/hooks/useRepositories";
import { cn } from "@/lib/utils";

// ─── Status Config ────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<
  Repository["status"],
  { label: string; sublabel?: string; className: string; spinning?: boolean }
> = {
  PENDING:    { label: "Queued",      sublabel: "Waiting to process",      className: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20", spinning: true },
  CLONING:    { label: "Cloning…",    sublabel: "Downloading repository",   className: "bg-blue-500/10 text-blue-400 border-blue-500/20",       spinning: true },
  PROCESSING: { label: "Indexing…",   sublabel: "Reading & chunking files", className: "bg-blue-500/10 text-blue-400 border-blue-500/20",       spinning: true },
  EMBEDDING:  { label: "Embedding…",  sublabel: "Generating AI embeddings", className: "bg-violet-500/10 text-violet-400 border-violet-500/20", spinning: true },
  READY:      { label: "Ready",                                             className: "bg-green-500/10 text-green-400 border-green-500/20" },
  FAILED:     { label: "Failed",                                            className: "bg-red-500/10 text-red-400 border-red-500/20" },
};

const LANGUAGE_COLORS: Record<string, string> = {
  TypeScript: "bg-blue-500", JavaScript: "bg-yellow-400", Python: "bg-green-500",
  Rust: "bg-orange-500", Go: "bg-cyan-400", Java: "bg-red-500",
  "C++": "bg-pink-500", Ruby: "bg-red-400", default: "bg-gray-400",
};

// ─── Component ────────────────────────────────────────────────────────────────

interface RepositoryCardProps { repository: Repository }

export function RepositoryCard({ repository: initialRepo }: RepositoryCardProps) {
  const { data: polledRepo } = useRepository(initialRepo.id);
  const repository = polledRepo ?? initialRepo;

  const { mutateAsync: deleteRepo, isPending: isDeleting } = useDeleteRepository();
  const { mutateAsync: reindexRepo, isPending: isReindexing } = useReindexRepository();

  const statusConfig = STATUS_CONFIG[repository.status];
  const langColor = LANGUAGE_COLORS[repository.language ?? ""] ?? LANGUAGE_COLORS.default;

  const isReady  = repository.status === "READY";
  const isFailed = repository.status === "FAILED";
  const isInProgress = ["PENDING", "CLONING", "PROCESSING", "EMBEDDING"].includes(repository.status);

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!confirm(`Delete "${repository.fullName}"? This cannot be undone.`)) return;
    try {
      await deleteRepo(repository.id);
      toast.success(`"${repository.fullName}" deleted`);
    } catch {
      toast.error("Failed to delete repository");
    }
  };

  const handleReindex = async (e: React.MouseEvent) => {
    e.preventDefault();
    try {
      await reindexRepo(repository.id);
      toast.success(`Re-indexing "${repository.fullName}"…`);
    } catch {
      toast.error("Failed to start re-indexing");
    }
  };

  return (
    <div className="group glass rounded-xl p-5 transition-all duration-200 hover:glow">
      <div className="flex items-start justify-between gap-3">
        {/* Left: Repo info */}
        <div className="min-w-0 flex-1">
          {/* Name row */}
          <div className="flex items-center gap-2">
            {isReady ? (
              <Link
                href={`/repositories/${repository.id}`}
                className="truncate text-sm font-semibold text-foreground hover:text-primary transition-colors"
              >
                {repository.fullName}
              </Link>
            ) : (
              <span className="truncate text-sm font-semibold text-foreground/60">
                {repository.fullName}
              </span>
            )}
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

          {/* Failed error message */}
          {isFailed && repository.errorMessage && (
            <div className="mt-2 flex items-start gap-1.5 rounded-lg bg-red-500/5 border border-red-500/10 px-2.5 py-2">
              <AlertCircle className="mt-px h-3 w-3 shrink-0 text-red-400" />
              <p className="text-xs text-red-400/80 line-clamp-2">{repository.errorMessage}</p>
            </div>
          )}

          {/* Meta row */}
          <div className="mt-3 flex flex-wrap items-center gap-3">
            {repository.language && (
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className={cn("h-2.5 w-2.5 rounded-full", langColor)} />
                {repository.language}
              </span>
            )}
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Star className="h-3 w-3" />
              {repository.stars.toLocaleString()}
            </span>
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <GitFork className="h-3 w-3" />
              {repository.forks.toLocaleString()}
            </span>
            {isReady && repository.indexedAt && (
              <span className="flex items-center gap-1 text-xs text-green-400/70">
                <CheckCircle2 className="h-3 w-3" />
                Indexed {new Date(repository.indexedAt).toLocaleDateString()}
              </span>
            )}
          </div>
        </div>

        {/* Right: Status + Actions */}
        <div className="flex shrink-0 flex-col items-end gap-2">
          <div className="flex flex-col items-end gap-1">
            <Badge
              className={cn(
                "flex items-center gap-1.5 border text-[10px] font-medium uppercase tracking-wider",
                statusConfig.className
              )}
            >
              {statusConfig.spinning && <Loader2 className="h-2.5 w-2.5 animate-spin" />}
              {statusConfig.label}
            </Badge>
            {statusConfig.sublabel && (
              <span className="text-[10px] text-muted-foreground/60">{statusConfig.sublabel}</span>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
            {/* Re-index: show for READY and FAILED repos */}
            {(isReady || isFailed) && (
              <Button
                id={`reindex-repo-${repository.id}`}
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:bg-violet-500/10 hover:text-violet-400"
                onClick={handleReindex}
                disabled={isReindexing || isInProgress}
                aria-label="Re-index repository"
                title="Re-index"
              >
                {isReindexing ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <RefreshCw className="h-3.5 w-3.5" />
                )}
              </Button>
            )}
            <Button
              id={`delete-repo-${repository.id}`}
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:bg-red-500/10 hover:text-red-400"
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
    </div>
  );
}
