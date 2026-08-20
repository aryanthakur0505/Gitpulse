"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Message {
  id: string;
  conversationId: string;
  role: "USER" | "ASSISTANT" | "SYSTEM";
  content: string;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

export interface Conversation {
  id: string;
  userId: string;
  repositoryId: string;
  title: string | null;
  createdAt: string;
  updatedAt: string;
  _count?: { messages: number };
  messages?: Message[];
  repository?: { id: string; fullName: string; language: string | null };
}

export interface RagSource {
  filePath: string;
  startLine: number;
  endLine: number;
  content: string;
  score: number;
}

// ─── Query Keys ───────────────────────────────────────────────────────────────

export const conversationKeys = {
  all: ["conversations"] as const,
  global: () => [...conversationKeys.all, "global"] as const,
  list: (repositoryId: string) =>
    [...conversationKeys.all, "list", repositoryId] as const,
  detail: (id: string) => [...conversationKeys.all, "detail", id] as const,
};

// ─── Hooks ────────────────────────────────────────────────────────────────────

/** All conversations for a specific repo */
export function useConversations(repositoryId: string) {
  return useQuery({
    queryKey: conversationKeys.list(repositoryId),
    queryFn: async () => {
      const { data } = await api.get<{ success: boolean; conversations: Conversation[] }>(
        `/conversations?repositoryId=${repositoryId}`
      );
      return data.conversations;
    },
    enabled: !!repositoryId,
  });
}

/** All conversations across ALL repos for the global /conversations page */
export function useAllConversations() {
  return useQuery({
    queryKey: conversationKeys.global(),
    queryFn: async () => {
      const { data } = await api.get<{ success: boolean; conversations: Conversation[] }>(
        `/conversations`
      );
      return data.conversations;
    },
    refetchInterval: 30_000,
  });
}


export function useConversation(id: string) {
  return useQuery({
    queryKey: conversationKeys.detail(id),
    queryFn: async () => {
      const { data } = await api.get<{ success: boolean; conversation: Conversation }>(
        `/conversations/${id}`
      );
      return data.conversation;
    },
    enabled: !!id,
  });
}

export function useCreateConversation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: { repositoryId: string; title?: string }) => {
      const { data: res } = await api.post<{ success: boolean; conversation: Conversation }>(
        "/conversations",
        data
      );
      return res.conversation;
    },
    onSuccess: (conv) => {
      queryClient.invalidateQueries({
        queryKey: conversationKeys.list(conv.repositoryId),
      });
    },
  });
}

export function useDeleteConversation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, repositoryId }: { id: string; repositoryId: string }) => {
      await api.delete(`/conversations/${id}`);
      return repositoryId;
    },
    onSuccess: (repositoryId) => {
      queryClient.invalidateQueries({
        queryKey: conversationKeys.list(repositoryId),
      });
    },
  });
}
