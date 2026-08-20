"use client";

import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { MessageSquare, Trash2, GitBranch, Clock, Hash } from "lucide-react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { useAllConversations, useDeleteConversation } from "@/hooks/useConversations";
import { cn } from "@/lib/utils";

const LANG_COLORS: Record<string, string> = {
  TypeScript: "bg-blue-500", JavaScript: "bg-yellow-400", Python: "bg-green-500",
  Rust: "bg-orange-500", Go: "bg-cyan-400", Java: "bg-red-500",
  "C++": "bg-pink-500", Ruby: "bg-red-400", default: "bg-violet-400",
};

export default function ConversationsPage() {
  const { data: conversations, isLoading } = useAllConversations();
  const { mutateAsync: deleteConv } = useDeleteConversation();

  const handleDelete = async (e: React.MouseEvent, convId: string, repoId: string) => {
    e.preventDefault();
    if (!confirm("Delete this conversation?")) return;
    try {
      await deleteConv({ id: convId, repositoryId: repoId });
      toast.success("Conversation deleted");
    } catch {
      toast.error("Failed to delete conversation");
    }
  };

  // Group by repository
  const grouped = conversations?.reduce<Record<string, typeof conversations>>((acc, conv) => {
    const key = conv.repository?.id ?? "unknown";
    if (!acc[key]) acc[key] = [];
    acc[key].push(conv);
    return acc;
  }, {});

  return (
    <div className="mx-auto max-w-4xl animate-fade-in space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Conversations</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {isLoading ? "Loading…" : `${conversations?.length ?? 0} conversation${conversations?.length !== 1 ? "s" : ""} across all repositories`}
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-6">
          {[1, 2].map((i) => (
            <div key={i} className="space-y-2">
              <Skeleton className="h-5 w-48" />
              <Skeleton className="h-16 w-full rounded-xl" />
              <Skeleton className="h-16 w-full rounded-xl" />
            </div>
          ))}
        </div>
      ) : !conversations?.length ? (
        <div className="glass rounded-2xl p-12 text-center">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-primary/10 ring-1 ring-primary/20">
            <MessageSquare className="h-9 w-9 text-primary" />
          </div>
          <h2 className="text-xl font-semibold text-foreground">No conversations yet</h2>
          <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
            Import a repository and start a chat to explore your codebase with AI.
          </p>
          <Link
            href="/dashboard"
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-primary/10 px-4 py-2 text-sm font-medium text-primary hover:bg-primary/20 transition-colors"
          >
            <GitBranch className="h-4 w-4" />
            Go to Dashboard
          </Link>
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(grouped ?? {}).map(([repoId, convs]) => {
            const repo = convs[0]?.repository;
            const langColor = LANG_COLORS[repo?.language ?? ""] ?? LANG_COLORS.default;

            return (
              <div key={repoId} className="space-y-2">
                {/* Repo header */}
                <div className="flex items-center gap-2 px-1">
                  <span className={cn("h-2.5 w-2.5 rounded-full", langColor)} />
                  <Link
                    href={`/repositories/${repoId}`}
                    className="text-sm font-semibold text-foreground hover:text-primary transition-colors"
                  >
                    {repo?.fullName ?? "Unknown Repository"}
                  </Link>
                  <span className="text-xs text-muted-foreground">
                    {convs.length} conversation{convs.length !== 1 ? "s" : ""}
                  </span>
                </div>

                {/* Conversation list */}
                <div className="space-y-1.5">
                  {convs.map((conv) => (
                    <div
                      key={conv.id}
                      className="group glass flex items-center justify-between gap-3 rounded-xl px-4 py-3.5 transition-all hover:glow"
                    >
                      <Link
                        href={`/repositories/${conv.repositoryId}/chat/${conv.id}`}
                        className="flex min-w-0 flex-1 items-center gap-3"
                      >
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                          <MessageSquare className="h-4 w-4 text-primary" />
                        </div>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium text-foreground">
                            {conv.title ?? "Untitled Conversation"}
                          </p>
                          <div className="mt-0.5 flex items-center gap-3 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Hash className="h-3 w-3" />
                              {conv._count?.messages ?? 0} messages
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {formatDistanceToNow(new Date(conv.updatedAt), { addSuffix: true })}
                            </span>
                          </div>
                        </div>
                      </Link>
                      <button
                        id={`delete-conv-${conv.id}`}
                        onClick={(e) => handleDelete(e, conv.id, conv.repositoryId)}
                        className="shrink-0 rounded-lg p-1.5 text-muted-foreground opacity-0 transition-all group-hover:opacity-100 hover:bg-red-500/10 hover:text-red-400"
                        aria-label="Delete conversation"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
