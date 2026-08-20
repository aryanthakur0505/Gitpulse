"use client";

import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, GitFork, MessageSquare, Plus, Star, Trash2,
  Clock, Code2, Loader2, FileCode2, Zap, RefreshCw, AlertCircle,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useRepository, useDeleteRepository, useReindexRepository } from "@/hooks/useRepositories";
import { useConversations, useCreateConversation, useDeleteConversation } from "@/hooks/useConversations";
import { cn } from "@/lib/utils";

// ─── Stat Pill ────────────────────────────────────────────────────────────────

function StatPill({ icon: Icon, value, label, className }: {
  icon: React.ElementType;
  value: number | string;
  label: string;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center gap-0.5 rounded-xl bg-muted/20 px-5 py-3 text-center", className)}>
      <Icon className="mb-1 h-4 w-4 text-muted-foreground" />
      <span className="text-lg font-bold text-foreground">
        {typeof value === "number" ? value.toLocaleString() : value}
      </span>
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</span>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function RepositoryDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const { data: repo, isLoading: repoLoading } = useRepository(id);
  const { data: conversations, isLoading: convsLoading } = useConversations(id);
  const { mutateAsync: createConv, isPending: creating } = useCreateConversation();
  const { mutateAsync: deleteConv } = useDeleteConversation();
  const { mutateAsync: deleteRepo, isPending: isDeleting } = useDeleteRepository();
  const { mutateAsync: reindexRepo, isPending: isReindexing } = useReindexRepository();

  const handleNewChat = async () => {
    if (!repo) return;
    try {
      const conv = await createConv({ repositoryId: id });
      router.push(`/repositories/${id}/chat/${conv.id}`);
    } catch {
      toast.error("Failed to create conversation");
    }
  };

  const handleDeleteConv = async (convId: string) => {
    if (!confirm("Delete this conversation?")) return;
    try {
      await deleteConv({ id: convId, repositoryId: id });
      toast.success("Conversation deleted");
    } catch {
      toast.error("Failed to delete conversation");
    }
  };

  const handleDeleteRepo = async () => {
    if (!repo) return;
    if (!confirm(`Delete "${repo.fullName}"? This cannot be undone.`)) return;
    try {
      await deleteRepo(repo.id);
      toast.success(`"${repo.fullName}" deleted`);
      router.push("/dashboard");
    } catch {
      toast.error("Failed to delete repository");
    }
  };

  const handleReindex = async () => {
    if (!repo) return;
    try {
      await reindexRepo(repo.id);
      toast.success("Re-indexing started…");
    } catch {
      toast.error("Failed to start re-indexing");
    }
  };

  if (repoLoading) {
    return (
      <div className="mx-auto max-w-4xl animate-fade-in space-y-6">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-44 w-full rounded-xl" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  if (!repo) {
    return (
      <div className="mx-auto max-w-4xl py-20 text-center">
        <p className="text-muted-foreground">Repository not found.</p>
        <Link href="/dashboard" className="mt-2 inline-block text-primary hover:underline">
          ← Back to dashboard
        </Link>
      </div>
    );
  }

  const isReady      = repo.status === "READY";
  const isFailed     = repo.status === "FAILED";
  const isInProgress = ["PENDING", "CLONING", "PROCESSING", "EMBEDDING"].includes(repo.status);

  const statusColors: Record<string, string> = {
    READY:      "bg-green-500/10 text-green-400 border-green-500/20",
    FAILED:     "bg-red-500/10 text-red-400 border-red-500/20",
    PENDING:    "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
    CLONING:    "bg-blue-500/10 text-blue-400 border-blue-500/20",
    PROCESSING: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    EMBEDDING:  "bg-violet-500/10 text-violet-400 border-violet-500/20",
  };

  return (
    <div className="mx-auto max-w-4xl animate-fade-in space-y-6">
      {/* Back */}
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Dashboard
      </Link>

      {/* Repo header card */}
      <div className="glass rounded-xl p-6 space-y-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-xl font-bold text-foreground truncate">{repo.fullName}</h1>
              <Badge className={cn("border text-[10px] font-medium uppercase tracking-wider flex items-center gap-1", statusColors[repo.status])}>
                {isInProgress && <Loader2 className="h-2.5 w-2.5 animate-spin" />}
                {repo.status}
              </Badge>
            </div>
            {repo.description && (
              <p className="mt-1.5 text-sm text-muted-foreground line-clamp-2">{repo.description}</p>
            )}
            <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
              {repo.language && (
                <span className="flex items-center gap-1.5">
                  <Code2 className="h-3.5 w-3.5" />
                  {repo.language}
                </span>
              )}
              <span className="flex items-center gap-1">
                <Star className="h-3.5 w-3.5" />
                {repo.stars.toLocaleString()}
              </span>
              <span className="flex items-center gap-1">
                <GitFork className="h-3.5 w-3.5" />
                {repo.forks.toLocaleString()}
              </span>
              {repo.indexedAt && (
                <span className="flex items-center gap-1 text-green-400/70">
                  <Clock className="h-3.5 w-3.5" />
                  Indexed {formatDistanceToNow(new Date(repo.indexedAt), { addSuffix: true })}
                </span>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex shrink-0 flex-col items-end gap-2">
            <Button
              id="new-chat-button"
              variant="gradient"
              className="gap-2"
              onClick={handleNewChat}
              disabled={creating || !isReady}
            >
              {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              New Chat
            </Button>
            <div className="flex gap-1.5">
              {(isReady || isFailed) && (
                <Button
                  id="reindex-repo-button"
                  variant="ghost"
                  size="sm"
                  className="h-7 gap-1.5 px-2.5 text-xs text-muted-foreground hover:bg-violet-500/10 hover:text-violet-400"
                  onClick={handleReindex}
                  disabled={isReindexing || isInProgress}
                >
                  {isReindexing ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                  Re-index
                </Button>
              )}
              <Button
                id="delete-repo-button"
                variant="ghost"
                size="sm"
                className="h-7 gap-1.5 px-2.5 text-xs text-muted-foreground hover:bg-red-500/10 hover:text-red-400"
                onClick={handleDeleteRepo}
                disabled={isDeleting}
              >
                {isDeleting ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                Delete
              </Button>
            </div>
          </div>
        </div>

        {/* Error banner */}
        {isFailed && repo.errorMessage && (
          <div className="flex items-start gap-2 rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-2.5">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
            <div>
              <p className="text-xs font-medium text-red-400">Indexing failed</p>
              <p className="mt-0.5 text-xs text-red-400/70">{repo.errorMessage}</p>
            </div>
          </div>
        )}

        {/* Stats row */}
        {isReady && (
          <div className="grid grid-cols-3 gap-3">
            <StatPill icon={FileCode2} value={repo._count?.files ?? 0} label="Files" />
            <StatPill icon={Zap}       value={repo.chunkCount ?? 0}     label="Chunks" />
            <StatPill icon={MessageSquare} value={repo._count?.conversations ?? conversations?.length ?? 0} label="Chats" />
          </div>
        )}
      </div>

      {/* Conversations */}
      <div className="space-y-3">
        <h2 className="text-sm font-medium text-muted-foreground">
          Conversations ({conversations?.length ?? 0})
        </h2>

        {convsLoading ? (
          <div className="space-y-2">
            {[1, 2].map((i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}
          </div>
        ) : conversations && conversations.length > 0 ? (
          <div className="space-y-2">
            {conversations.map((conv) => (
              <div
                key={conv.id}
                className="group glass flex items-center justify-between gap-3 rounded-xl px-4 py-3 transition-all hover:glow"
              >
                <Link
                  href={`/repositories/${id}/chat/${conv.id}`}
                  className="flex min-w-0 flex-1 items-center gap-3"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                    <MessageSquare className="h-4 w-4 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">
                      {conv.title ?? "Untitled Conversation"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {conv._count?.messages ?? 0} messages ·{" "}
                      {formatDistanceToNow(new Date(conv.updatedAt), { addSuffix: true })}
                    </p>
                  </div>
                </Link>
                <button
                  id={`delete-conv-${conv.id}`}
                  onClick={() => handleDeleteConv(conv.id)}
                  className="shrink-0 rounded-lg p-1.5 text-muted-foreground opacity-0 transition-all group-hover:opacity-100 hover:bg-red-500/10 hover:text-red-400"
                  aria-label="Delete conversation"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="glass rounded-xl p-10 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10">
              <MessageSquare className="h-6 w-6 text-primary" />
            </div>
            <p className="text-sm font-medium text-foreground">No conversations yet</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {isReady
                ? "Start a new chat to explore this codebase with AI."
                : "Repository must be fully indexed before you can chat."}
            </p>
            {isReady && (
              <Button
                id="first-chat-button"
                variant="gradient"
                className="mt-4 gap-2"
                onClick={handleNewChat}
                disabled={creating}
              >
                <Plus className="h-4 w-4" />
                Start First Chat
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
