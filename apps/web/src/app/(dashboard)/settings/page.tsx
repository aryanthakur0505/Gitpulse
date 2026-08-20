"use client";

import { signOut } from "next-auth/react";
import { useSession } from "next-auth/react";
import {
  User, Github, Mail, LogOut, Zap, GitBranch,
  MessageSquare, Code2, Shield, ExternalLink,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { useStats } from "@/hooks/useStats";
import { cn } from "@/lib/utils";

// ─── Section ──────────────────────────────────────────────────────────────────

function Section({ title, description, children }: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="glass rounded-xl p-6 space-y-4">
      <div>
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
        {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
      </div>
      {children}
    </div>
  );
}

// ─── Info Row ─────────────────────────────────────────────────────────────────

function InfoRow({ icon: Icon, label, value }: {
  icon: React.ElementType;
  label: string;
  value: string | undefined | null;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted/30">
        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
        <p className="truncate text-sm font-medium text-foreground">{value ?? "—"}</p>
      </div>
    </div>
  );
}

// ─── Usage Stat ───────────────────────────────────────────────────────────────

function UsageStat({ icon: Icon, label, value, accent }: {
  icon: React.ElementType;
  label: string;
  value: number;
  accent: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-lg bg-muted/10 px-4 py-3">
      <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", accent)}>
        <Icon className="h-4 w-4" />
      </div>
      <div>
        <p className="text-lg font-bold text-foreground">{value.toLocaleString()}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const { data: session, status } = useSession();
  const { data: stats, isLoading: statsLoading } = useStats();

  const user = session?.user;
  const isLoading = status === "loading";

  return (
    <div className="mx-auto max-w-2xl animate-fade-in space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your account and view workspace usage.
        </p>
      </div>

      {/* Profile */}
      <Section title="Profile" description="Your GitHub account information">
        {isLoading ? (
          <div className="space-y-3">
            <div className="flex items-center gap-4">
              <Skeleton className="h-16 w-16 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-3 w-32" />
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Avatar + name */}
            <div className="flex items-center gap-4">
              {user?.image ? (
                <img
                  src={user.image}
                  alt={user.name ?? "Avatar"}
                  className="h-16 w-16 rounded-full ring-2 ring-primary/20"
                />
              ) : (
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 ring-2 ring-primary/20">
                  <User className="h-8 w-8 text-primary" />
                </div>
              )}
              <div>
                <p className="text-base font-semibold text-foreground">{user?.name ?? "Unknown"}</p>
                <p className="text-xs text-muted-foreground">Signed in via GitHub</p>
              </div>
            </div>

            {/* Info rows */}
            <div className="space-y-3 pt-2 border-t border-border/30">
              <InfoRow icon={Mail}   label="Email"       value={user?.email} />
              <InfoRow icon={Github} label="GitHub"      value={user?.name ?? "Connected"} />
              <InfoRow icon={Shield} label="Auth Method" value="GitHub OAuth" />
            </div>

            {/* View on GitHub */}
            {user?.name && (
              <a
                href={`https://github.com/${user.name}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline"
              >
                <ExternalLink className="h-3 w-3" />
                View GitHub profile
              </a>
            )}
          </div>
        )}
      </Section>

      {/* Usage */}
      <Section title="Workspace Usage" description="Your current usage statistics">
        {statsLoading ? (
          <div className="grid grid-cols-2 gap-3">
            {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-16 rounded-lg" />)}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <UsageStat
              icon={GitBranch}
              label="Repositories"
              value={stats?.repositories.total ?? 0}
              accent="bg-primary/10 text-primary"
            />
            <UsageStat
              icon={Zap}
              label="Code Chunks"
              value={stats?.codeChunks ?? 0}
              accent="bg-violet-500/10 text-violet-400"
            />
            <UsageStat
              icon={MessageSquare}
              label="Conversations"
              value={stats?.conversations.total ?? 0}
              accent="bg-green-500/10 text-green-400"
            />
            <UsageStat
              icon={Code2}
              label="Languages"
              value={stats?.languageDistribution.length ?? 0}
              accent="bg-orange-500/10 text-orange-400"
            />
          </div>
        )}

        {/* Ready vs total */}
        {stats && stats.repositories.total > 0 && (
          <div className="mt-2 rounded-lg bg-muted/10 px-4 py-3">
            <div className="flex justify-between text-xs text-muted-foreground mb-2">
              <span>Indexed repositories</span>
              <span className="font-medium text-foreground">
                {stats.repositories.ready} / {stats.repositories.total}
              </span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted/30">
              <div
                className="h-full rounded-full bg-green-500 transition-all duration-500"
                style={{ width: `${(stats.repositories.ready / stats.repositories.total) * 100}%` }}
              />
            </div>
          </div>
        )}
      </Section>

      {/* Sign out */}
      <Section title="Session" description="Manage your current session">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-foreground">Sign out of GitPulse</p>
            <p className="text-xs text-muted-foreground">You can sign back in at any time.</p>
          </div>
          <Button
            id="sign-out-button"
            variant="ghost"
            className="gap-2 text-muted-foreground hover:bg-red-500/10 hover:text-red-400"
            onClick={() => signOut({ callbackUrl: "/sign-in" })}
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </Button>
        </div>
      </Section>

      {/* Version */}
      <p className="text-center text-[10px] text-muted-foreground/40">
        GitPulse v0.7.0 — Phase 7
      </p>
    </div>
  );
}
