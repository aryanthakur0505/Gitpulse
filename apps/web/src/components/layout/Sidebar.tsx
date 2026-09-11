"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  GitBranch,
  LayoutDashboard,
  MessageSquare,
  Settings,
  Zap,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    label: "Repositories",
    href: "/repositories",
    icon: GitBranch,
  },
  {
    label: "Conversations",
    href: "/conversations",
    icon: MessageSquare,
  },
  {
    label: "Settings",
    href: "/settings",
    icon: Settings,
  },
];

interface SidebarProps {
  collapsed: boolean;
  onToggleCollapsed: () => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

export function Sidebar({
  collapsed,
  onToggleCollapsed,
  mobileOpen,
  onCloseMobile,
}: SidebarProps) {
  const pathname = usePathname();

  // The "collapsed" preference is a desktop-rail concept — when the mobile
  // drawer is open it should always show full labels, regardless of it.
  const isRailCollapsed = collapsed && !mobileOpen;

  return (
    <>
      {/* Mobile backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}

      <aside
        className={cn(
          "flex h-full flex-col border-r border-sidebar-border bg-sidebar transition-[width,transform] duration-200",
          "fixed inset-y-0 left-0 z-50 md:static md:z-auto",
          isRailCollapsed ? "w-[72px]" : "w-[240px]",
          mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}
      >
        {/* Logo */}
        <div
          className={cn(
            "flex h-16 shrink-0 items-center gap-3 border-b border-sidebar-border",
            isRailCollapsed ? "justify-center px-2" : "px-5"
          )}
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-violet-600 to-indigo-600 shadow-lg shadow-violet-500/30">
            <Zap className="h-4 w-4 text-white" />
          </div>
          {!isRailCollapsed && (
            <div className="min-w-0">
              <span className="text-sm font-bold text-foreground">GitPulse</span>
              <span className="ml-1 rounded-full bg-primary/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-primary">
                Beta
              </span>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto overflow-x-hidden px-3 py-4">
          <div className="space-y-1">
            {navItems.map((item) => {
              const isActive =
                pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  title={isRailCollapsed ? item.label : undefined}
                  onClick={onCloseMobile}
                  className={cn(
                    "group flex items-center gap-3 rounded-lg py-2 text-sm font-medium transition-all duration-150",
                    isRailCollapsed ? "justify-center px-2" : "px-2",
                    isActive
                      ? "text-primary"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <div
                    className={cn(
                      "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors",
                      isActive
                        ? "bg-primary/15 text-primary"
                        : "text-muted-foreground group-hover:bg-sidebar-accent group-hover:text-foreground"
                    )}
                  >
                    <item.icon className="h-4 w-4 shrink-0" />
                  </div>
                  {!isRailCollapsed && (
                    <>
                      <span className="min-w-0 truncate">{item.label}</span>
                      {isActive && (
                        <div className="ml-auto h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                      )}
                    </>
                  )}
                </Link>
              );
            })}
          </div>
        </nav>

        {/* Footer: collapse toggle + version */}
        <div className="border-t border-sidebar-border px-3 py-3">
          <button
            onClick={onToggleCollapsed}
            className={cn(
              "hidden md:flex w-full items-center gap-3 rounded-lg py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-foreground",
              isRailCollapsed ? "justify-center px-2" : "px-2"
            )}
            aria-label={isRailCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={isRailCollapsed ? "Expand sidebar" : undefined}
          >
            {isRailCollapsed ? (
              <PanelLeftOpen className="h-4 w-4 shrink-0" />
            ) : (
              <>
                <PanelLeftClose className="h-4 w-4 shrink-0" />
                Collapse
              </>
            )}
          </button>
          {!isRailCollapsed && (
            <p className="mt-2 px-2 text-[10px] text-muted-foreground/60">
              GitPulse v0.8.0 — Phase 8
            </p>
          )}
        </div>
      </aside>
    </>
  );
}
