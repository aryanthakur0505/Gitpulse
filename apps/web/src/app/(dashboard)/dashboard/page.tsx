"use client";

import { useState, useMemo } from "react";

import Link from "next/link";
import {
  GitBranch, MessageSquare, Plus, Zap, Code2, CheckCircle2,
  AlertCircle, Loader2, Clock, FileCode2, Activity, Search, X,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ImportRepoModal } from "@/components/repositories/ImportRepoModal";
import { RepositoryCard } from "@/components/repositories/RepositoryCard";
import { useRepositories } from "@/hooks/useRepositories";
import { useStats, type LanguageStat } from "@/hooks/useStats";
import { useSession } from "next-auth/react";
import { cn } from "@/lib/utils";

// ─── Language Colors ──────────────────────────────────────────────────────────

const LANG_COLORS: Record<string, string> = {
  TypeScript:  "bg-blue-500",
  JavaScript:  "bg-yellow-400",
  Python:      "bg-green-500",
  Rust:        "bg-orange-500",
  Go:          "bg-cyan-400",
  Java:        "bg-red-500",
  "C++":       "bg-pink-500",
  Ruby:        "bg-red-400",
  CSS:         "bg-purple-400",
  HTML:        "bg-orange-400",
  Markdown:    "bg-gray-400",
  default:     "bg-violet-400",
};

function langColor(lang: string | null) {
  return LANG_COLORS[lang ?? ""] ?? LANG_COLORS.default;
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({
  label, value, description, icon: Icon, accent = "primary", loading,
}: {
  label: string;
  value: number | string;
  description: string;
  icon: React.ElementType;
  accent?: "primary" | "violet" | "green" | "orange";
  loading?: boolean;
}) {
  const accentMap = {
    primary: "bg-primary/10 text-primary",
    violet:  "bg-violet-600/10 text-violet-400",
    green:   "bg-green-500/10 text-green-400",
    orange:  "bg-orange-500/10 text-orange-400",
  };

  return (
    <div className="glass rounded-xl p-5 transition-all duration-200 hover:glow">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {label}
          </p>
          {loading ? (
            <Skeleton className="mt-2 h-9 w-20 rounded-lg" />
          ) : (
            <p className="mt-2 text-3xl font-bold text-foreground">
              {typeof value === "number" ? value.toLocaleString() : value}
            </p>
          )}
          <p className="mt-1 text-xs text-muted-foreground">{description}</p>
        </div>
        <div className={cn("rounded-lg p-2.5", accentMap[accent])}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

// ─── Language Distribution Bar ────────────────────────────────────────────────

function LanguageBar({ distribution }: { distribution: LanguageStat[] }) {
  if (distribution.length === 0) return null;

  const total = distribution.reduce((s, l) => s + l.count, 0);

  return (
    <div className="glass rounded-xl p-5 space-y-4">
      <div className="flex items-center gap-2">
        <Code2 className="h-4 w-4 text-primary" />
        <h2 className="text-sm font-semibold text-foreground">Language Distribution</h2>
      </div>

      {/* Stacked bar */}
      <div className="flex h-3 w-full overflow-hidden rounded-full">
        {distribution.map((l) => (
          <div
            key={l.language}
            className={cn("h-full transition-all", langColor(l.language))}
            style={{ width: `${(l.count / total) * 100}%` }}
            title={`${l.language}: ${l.count}`}
          />
        ))}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-x-4 gap-y-2">
        {distribution.map((l) => (
          <div key={l.language} className="flex items-center gap-1.5">
            <span className={cn("h-2 w-2 rounded-full", langColor(l.language))} />
            <span className="text-xs text-muted-foreground">
              {l.language}{" "}
              <span className="text-muted-foreground/60">
                ({Math.round((l.count / total) * 100)}%)
              </span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Repository Status Breakdown ──────────────────────────────────────────────

function StatusBreakdown({
  ready, processing, failed, total,
}: {
  ready: number; processing: number; failed: number; total: number;
}) {
  const items = [
    { label: "Ready",      count: ready,      icon: CheckCircle2, color: "text-green-400",  bar: "bg-green-500" },
    { label: "Processing", count: processing,  icon: Loader2,      color: "text-blue-400",   bar: "bg-blue-500" },
    { label: "Failed",     count: failed,      icon: AlertCircle,  color: "text-red-400",    bar: "bg-red-500" },
  ];

  return (
    <div className="glass rounded-xl p-5 space-y-4">
      <div className="flex items-center gap-2">
        <Activity className="h-4 w-4 text-primary" />
        <h2 className="text-sm font-semibold text-foreground">Repository Status</h2>
      </div>
      <div className="space-y-3">
        {items.map((item) => (
          <div key={item.label} className="flex items-center gap-3">
            <item.icon className={cn("h-3.5 w-3.5 shrink-0", item.color)} />
            <div className="flex-1">
              <div className="mb-1 flex justify-between text-xs">
                <span className="text-muted-foreground">{item.label}</span>
                <span className="font-medium text-foreground">{item.count}</span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted/30">
                <div
                  className={cn("h-full rounded-full transition-all duration-500", item.bar)}
                  style={{ width: total > 0 ? `${(item.count / total) * 100}%` : "0%" }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Recent Activity ──────────────────────────────────────────────────────────

function RecentActivity({
  items,
}: {
  items: { id: string; fullName: string; language: string | null; indexedAt: string | null; fileCount: number; conversationCount: number }[];
}) {
  if (items.length === 0) return null;

  return (
    <div className="glass rounded-xl p-5 space-y-4">
      <div className="flex items-center gap-2">
        <Clock className="h-4 w-4 text-primary" />
        <h2 className="text-sm font-semibold text-foreground">Recently Indexed</h2>
      </div>
      <div className="space-y-2">
        {items.map((item) => (
          <Link
            key={item.id}
            href={`/repositories/${item.id}`}
            className="flex items-center justify-between rounded-lg px-3 py-2.5 transition-colors hover:bg-muted/20"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <span className={cn("h-2 w-2 shrink-0 rounded-full", langColor(item.language))} />
              <span className="truncate text-sm text-foreground font-medium">{item.fullName}</span>
            </div>
            <div className="flex items-center gap-3 shrink-0 ml-3 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <FileCode2 className="h-3 w-3" />
                {item.fileCount}
              </span>
              <span className="flex items-center gap-1">
                <MessageSquare className="h-3 w-3" />
                {item.conversationCount}
              </span>
              {item.indexedAt && (
                <span className="hidden sm:block">
                  {formatDistanceToNow(new Date(item.indexedAt), { addSuffix: true })}
                </span>
              )}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { data: session } = useSession();
  const [importOpen, setImportOpen] = useState(false);
  const [search, setSearch] = useState("");
  const { data: repositories, isLoading: reposLoading, isError } = useRepositories();
  const { data: stats, isLoading: statsLoading } = useStats();

  const repoCount = repositories?.length ?? 0;
  const hasRepos = repoCount > 0;

  const filteredRepos = useMemo(() => {
    if (!repositories) return [];
    const q = search.trim().toLowerCase();
    if (!q) return repositories;
    return repositories.filter(
      (r) =>
        r.fullName.toLowerCase().includes(q) ||
        r.language?.toLowerCase().includes(q) ||
        r.description?.toLowerCase().includes(q)
    );
  }, [repositories, search]);

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
            {hasRepos
              ? `${stats?.repositories.ready ?? 0} of ${repoCount} ${repoCount === 1 ? "repository" : "repositories"} ready for AI chat.`
              : "Import a repository to start exploring your codebase with AI."}
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

      {/* Stats cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Repositories"
          value={stats?.repositories.total ?? repoCount}
          icon={GitBranch}
          description={`${stats?.repositories.ready ?? 0} ready to chat`}
          accent="primary"
          loading={statsLoading}
        />
        <StatCard
          label="Code Chunks"
          value={stats?.codeChunks ?? 0}
          icon={Zap}
          description="Indexed & searchable"
          accent="violet"
          loading={statsLoading}
        />
        <StatCard
          label="Conversations"
          value={stats?.conversations.total ?? 0}
          icon={MessageSquare}
          description={`${stats?.conversations.messages ?? 0} messages total`}
          accent="green"
          loading={statsLoading}
        />
        <StatCard
          label="Languages"
          value={stats?.languageDistribution.length ?? 0}
          icon={Code2}
          description="Across all repos"
          accent="orange"
          loading={statsLoading}
        />
      </div>

      {/* Analytics row — only shown when there's data */}
      {hasRepos && stats && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <LanguageBar distribution={stats.languageDistribution} />
          </div>
          <StatusBreakdown
            ready={stats.repositories.ready}
            processing={stats.repositories.processing}
            failed={stats.repositories.failed}
            total={stats.repositories.total}
          />
        </div>
      )}

      {/* Recent activity */}
      {stats && stats.recentActivity.length > 0 && (
        <RecentActivity items={stats.recentActivity} />
      )}

      {/* Repository list */}
      <div className="space-y-3">
        {reposLoading ? (
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
          <>
            {/* Search bar */}
            <div className="flex items-center justify-between gap-3">
              <h2 className="shrink-0 text-sm font-medium text-muted-foreground">
                Your Repositories ({repoCount})
              </h2>
              <div className="relative max-w-xs w-full">
                <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <input
                  id="repo-search"
                  type="text"
                  placeholder="Search repos…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full rounded-lg border border-border/50 bg-muted/20 py-1.5 pl-8 pr-8 text-xs text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-primary/50"
                />
                {search && (
                  <button
                    onClick={() => setSearch("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </div>
            </div>
            {filteredRepos.length === 0 ? (
              <div className="glass rounded-xl p-8 text-center">
                <p className="text-sm text-muted-foreground">
                  No repositories match &ldquo;{search}&rdquo;
                </p>
              </div>
            ) : (
              filteredRepos.map((repo) => (
                <RepositoryCard key={repo.id} repository={repo} />
              ))
            )}
          </>
        ) : (
          /* Empty state */
          <div className="glass rounded-2xl p-12 text-center">
            <div className="relative mx-auto mb-6 flex h-20 w-20 items-center justify-center">
              <div className="absolute inset-0 animate-pulse-glow rounded-full bg-gradient-to-br from-violet-600/30 to-indigo-600/30 blur-xl" />
              <div className="relative flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600/20 to-indigo-600/20 ring-1 ring-violet-500/20">
                <GitBranch className="h-9 w-9 text-violet-400" />
              </div>
            </div>
            <h2 className="text-xl font-semibold text-foreground">No repositories yet</h2>
            <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
              Import your first GitHub repository and let GitPulse index it. Then you can ask
              questions, explore architecture, and understand any codebase instantly.
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
      </div>

      {/* Import Modal */}
      <ImportRepoModal open={importOpen} onOpenChange={setImportOpen} />
    </div>
  );
}
