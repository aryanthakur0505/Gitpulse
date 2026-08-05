"use client";

import { useState } from "react";
import { Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ImportRepoModal } from "@/components/repositories/ImportRepoModal";
import { RepositoryCard } from "@/components/repositories/RepositoryCard";
import { useRepositories, type RepositoryStatus } from "@/hooks/useRepositories";

const STATUS_FILTERS: { label: string; value: RepositoryStatus | "ALL" }[] = [
  { label: "All", value: "ALL" },
  { label: "Ready", value: "READY" },
  { label: "Pending", value: "PENDING" },
  { label: "Processing", value: "PROCESSING" },
  { label: "Failed", value: "FAILED" },
];

export default function RepositoriesPage() {
  const [importOpen, setImportOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<RepositoryStatus | "ALL">("ALL");

  const { data: repositories, isLoading, isError } = useRepositories();

  const filtered = repositories?.filter((repo) => {
    const matchesSearch =
      search.trim() === "" ||
      repo.fullName.toLowerCase().includes(search.toLowerCase()) ||
      repo.description?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus =
      statusFilter === "ALL" || repo.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="mx-auto max-w-4xl animate-fade-in space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Repositories</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {repositories?.length ?? 0} imported
          </p>
        </div>
        <Button
          id="repositories-import-button"
          variant="gradient"
          className="gap-2"
          onClick={() => setImportOpen(true)}
        >
          <Plus className="h-4 w-4" />
          Import Repository
        </Button>
      </div>

      {/* Search + Filter bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            id="repo-search"
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search repositories…"
            className="w-full rounded-lg border border-border bg-background py-2.5 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground/50 outline-none transition-all focus:border-primary/50 focus:ring-2 focus:ring-primary/40"
          />
        </div>

        {/* Status filter pills */}
        <div className="flex gap-1.5">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value}
              id={`filter-${f.value.toLowerCase()}`}
              onClick={() => setStatusFilter(f.value)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                statusFilter === f.value
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-28 w-full rounded-xl" />
          ))}
        </div>
      ) : isError ? (
        <div className="glass rounded-2xl p-8 text-center">
          <p className="text-sm text-red-400">
            Failed to load repositories. Make sure the API server is running.
          </p>
        </div>
      ) : filtered && filtered.length > 0 ? (
        <div className="space-y-3">
          {filtered.map((repo) => (
            <RepositoryCard key={repo.id} repository={repo} />
          ))}
        </div>
      ) : (
        <div className="glass rounded-2xl p-12 text-center">
          <p className="text-sm text-muted-foreground">
            {search || statusFilter !== "ALL"
              ? "No repositories match your filters."
              : "No repositories imported yet. Click \"Import Repository\" to get started."}
          </p>
        </div>
      )}

      <ImportRepoModal open={importOpen} onOpenChange={setImportOpen} />
    </div>
  );
}
