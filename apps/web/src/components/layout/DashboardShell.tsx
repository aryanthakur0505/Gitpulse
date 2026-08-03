import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import type { ReactNode } from "react";

interface DashboardShellProps {
  children: ReactNode;
  title?: string;
}

export function DashboardShell({ children, title }: DashboardShellProps) {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header title={title} />
        <main className="flex-1 overflow-y-auto">
          <div className="h-full p-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
