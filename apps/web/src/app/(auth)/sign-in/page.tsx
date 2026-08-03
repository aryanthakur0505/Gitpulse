import type { Metadata } from "next";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { SignInButton } from "@/components/auth/SignInButton";
import { GitBranch, MessageSquare, Search, Zap } from "lucide-react";

export const metadata: Metadata = {
  title: "Sign In",
  description: "Sign in to GitPulse with your GitHub account.",
};

const features = [
  {
    icon: GitBranch,
    title: "Import Repositories",
    description: "Import any public GitHub repository in seconds.",
  },
  {
    icon: Search,
    title: "Semantic Search",
    description: "Find code using natural language queries.",
  },
  {
    icon: MessageSquare,
    title: "Chat with Code",
    description: "Ask questions, get explanations, understand architecture.",
  },
];

export default async function SignInPage() {
  const session = await getServerSession(authOptions);
  if (session) redirect("/dashboard");

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background">
      {/* Background glow orbs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-40 -top-40 h-[500px] w-[500px] rounded-full bg-violet-600/10 blur-[120px]" />
        <div className="absolute -bottom-40 -right-40 h-[500px] w-[500px] rounded-full bg-indigo-600/10 blur-[120px]" />
        <div className="absolute left-1/2 top-1/2 h-[300px] w-[300px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-purple-600/5 blur-[80px]" />
      </div>

      {/* Grid pattern overlay */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: `linear-gradient(hsl(var(--border)) 1px, transparent 1px), linear-gradient(to right, hsl(var(--border)) 1px, transparent 1px)`,
          backgroundSize: "60px 60px",
        }}
      />

      <div className="relative z-10 w-full max-w-md px-4">
        {/* Card */}
        <div className="glass rounded-2xl p-8 shadow-2xl shadow-black/50">
          {/* Logo */}
          <div className="mb-8 flex flex-col items-center text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 shadow-lg shadow-violet-500/40">
              <Zap className="h-7 w-7 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">
              Welcome to{" "}
              <span className="text-gradient">GitPulse</span>
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Your AI-powered GitHub knowledge assistant
            </p>
          </div>

          {/* Sign-in button */}
          <SignInButton callbackUrl="/dashboard" />

          {/* Divider */}
          <div className="my-6 flex items-center gap-3">
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs text-muted-foreground">
              What you get
            </span>
            <div className="h-px flex-1 bg-border" />
          </div>

          {/* Features */}
          <div className="space-y-3">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="flex items-start gap-3 rounded-lg p-3 transition-colors hover:bg-white/[0.02]"
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                  <feature.icon className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {feature.title}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {feature.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <p className="mt-6 text-center text-xs text-muted-foreground/50">
          By signing in, you agree to our{" "}
          <span className="cursor-pointer underline-offset-2 hover:underline">
            Terms of Service
          </span>{" "}
          and{" "}
          <span className="cursor-pointer underline-offset-2 hover:underline">
            Privacy Policy
          </span>
          .
        </p>
      </div>
    </div>
  );
}
