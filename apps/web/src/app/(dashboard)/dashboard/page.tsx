import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { GitBranch, MessageSquare, Plus, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Dashboard",
};

const statsCards = [
  {
    label: "Repositories",
    value: "0",
    icon: GitBranch,
    description: "No repositories imported yet",
    color: "violet",
  },
  {
    label: "Conversations",
    value: "0",
    icon: MessageSquare,
    description: "Start chatting with a repo",
    color: "indigo",
  },
  {
    label: "Code Chunks",
    value: "0",
    icon: Zap,
    description: "Indexed and ready for search",
    color: "purple",
  },
];

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

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
        <Button id="import-repo-button" variant="gradient" className="gap-2">
          <Plus className="h-4 w-4" />
          Import Repository
        </Button>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {statsCards.map((card) => (
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

      {/* Empty state */}
      <div className="glass rounded-2xl p-12 text-center">
        {/* Animated orb */}
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
        >
          <Plus className="h-4 w-4" />
          Import your first repository
        </Button>
      </div>
    </div>
  );
}
