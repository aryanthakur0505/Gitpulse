"use client";

import { useState } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Rejecting/throwing keeps the dialog open so the caller can surface an error toast. */
  onConfirm: () => Promise<void> | void;
  variant?: "destructive" | "default";
}

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * Reusable confirm/destructive-action dialog — replaces native `confirm()`
 * popups app-wide. Manages its own pending state around `onConfirm`.
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Delete",
  cancelLabel = "Cancel",
  onConfirm,
  variant = "destructive",
}: ConfirmDialogProps) {
  const [isPending, setIsPending] = useState(false);

  const handleConfirm = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault(); // keep Radix from auto-closing before the action resolves
    setIsPending(true);
    try {
      await onConfirm();
      onOpenChange(false);
    } catch {
      // Caller is responsible for surfacing an error toast; keep the dialog
      // open so the user can retry or cancel.
    } finally {
      setIsPending(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={(next) => !isPending && onOpenChange(next)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div
            className={
              variant === "destructive"
                ? "mb-1 flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/10 ring-1 ring-red-500/20"
                : "mb-1 flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600/20 to-indigo-600/20 ring-1 ring-violet-500/20"
            }
          >
            <AlertTriangle
              className={variant === "destructive" ? "h-5 w-5 text-red-400" : "h-5 w-5 text-violet-400"}
            />
          </div>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>{cancelLabel}</AlertDialogCancel>
          <AlertDialogAction
            variant={variant}
            disabled={isPending}
            onClick={handleConfirm}
            className="gap-2"
          >
            {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
