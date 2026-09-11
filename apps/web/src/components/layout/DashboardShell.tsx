"use client";

import { useEffect, useState } from "react";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import type { ReactNode } from "react";

interface DashboardShellProps {
  children: ReactNode;
  title?: string;
}

const COLLAPSE_STORAGE_KEY = "gitpulse:sidebar-collapsed";

export function DashboardShell({ children, title }: DashboardShellProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Restore the collapsed preference (desktop only) after mount, so SSR
  // markup and first client render stay in sync (avoids a hydration flash).
  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem(COLLAPSE_STORAGE_KEY) === "true");
    } catch {
      // localStorage unavailable — fall back to expanded.
    }
  }, []);

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(COLLAPSE_STORAGE_KEY, String(next));
      } catch {
        // Non-fatal — preference just won't persist.
      }
      return next;
    });
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar
        collapsed={collapsed}
        onToggleCollapsed={toggleCollapsed}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
      />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header title={title} onOpenMobileMenu={() => setMobileOpen(true)} />
        <main className="flex-1 overflow-y-auto">
          <div className="h-full p-4 sm:p-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
