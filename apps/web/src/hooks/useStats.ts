"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface LanguageStat {
  language: string;
  count: number;
}

export interface RecentActivityItem {
  id: string;
  fullName: string;
  language: string | null;
  indexedAt: string | null;
  fileCount: number;
  conversationCount: number;
}

export interface WorkspaceStats {
  repositories: {
    total: number;
    ready: number;
    failed: number;
    processing: number;
  };
  conversations: {
    total: number;
    messages: number;
  };
  codeChunks: number;
  languageDistribution: LanguageStat[];
  recentActivity: RecentActivityItem[];
}

interface StatsResponse {
  success: boolean;
  stats: WorkspaceStats;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useStats() {
  return useQuery({
    queryKey: ["stats"],
    queryFn: async () => {
      const { data } = await api.get<StatsResponse>("/stats");
      return data.stats;
    },
    // Refresh every 30s so stats stay live while repos are processing
    refetchInterval: 30_000,
    staleTime: 10_000,
  });
}
