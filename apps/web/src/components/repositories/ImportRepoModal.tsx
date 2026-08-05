"use client";

import { useState } from "react";
import { GitBranch, Loader2, Plus, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useImportRepository } from "@/hooks/useRepositories";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ImportRepoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// ─── URL Validator ────────────────────────────────────────────────────────────

function isValidGitHubUrl(url: string): boolean {
  return /^https?:\/\/github\.com\/[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+\/?$/.test(
    url.trim()
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ImportRepoModal({ open, onOpenChange }: ImportRepoModalProps) {
  const [url, setUrl] = useState("");
  const [touched, setTouched] = useState(false);
  const { mutateAsync: importRepo, isPending } = useImportRepository();

  const isValid = isValidGitHubUrl(url);
  const showError = touched && url.length > 0 && !isValid;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (!isValid) return;

    try {
      const repo = await importRepo(url);
      toast.success(`"${repo.fullName}" imported successfully!`, {
        description: "Repository is queued for processing.",
      });
      setUrl("");
      setTouched(false);
      onOpenChange(false);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to import repository";
      toast.error(message);
    }
  };

  const handleClose = (open: boolean) => {
    if (!isPending) {
      setUrl("");
      setTouched(false);
      onOpenChange(open);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600/20 to-indigo-600/20 ring-1 ring-violet-500/20">
            <GitBranch className="h-5 w-5 text-violet-400" />
          </div>
          <DialogTitle>Import Repository</DialogTitle>
          <DialogDescription>
            Paste any public GitHub repository URL. GitPulse will fetch its
            metadata and queue it for AI indexing.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="mt-2 space-y-4">
          {/* URL Input */}
          <div className="space-y-1.5">
            <label
              htmlFor="repo-url"
              className="text-xs font-medium text-muted-foreground"
            >
              GitHub Repository URL
            </label>
            <input
              id="repo-url"
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onBlur={() => setTouched(true)}
              placeholder="https://github.com/facebook/react"
              disabled={isPending}
              className={`w-full rounded-lg border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 outline-none transition-all focus:ring-2 focus:ring-primary/40 disabled:opacity-50 ${
                showError
                  ? "border-red-500/70 focus:ring-red-500/30"
                  : "border-border focus:border-primary/50"
              }`}
            />
            {showError && (
              <p className="flex items-center gap-1.5 text-xs text-red-400">
                <AlertCircle className="h-3 w-3 shrink-0" />
                Enter a valid GitHub URL: github.com/owner/repo
              </p>
            )}
          </div>

          {/* Example hint */}
          <div className="rounded-lg bg-muted/40 px-3 py-2.5">
            <p className="text-xs text-muted-foreground">
              <span className="font-medium text-foreground">Example:</span>{" "}
              https://github.com/vercel/next.js
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <Button
              id="cancel-import-button"
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => handleClose(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              id="confirm-import-button"
              type="submit"
              variant="gradient"
              className="flex-1 gap-2"
              disabled={isPending || !url}
            >
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Importing…
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4" />
                  Import
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
