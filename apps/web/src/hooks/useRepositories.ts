"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

// ─── Types ────────────────────────────────────────────────────────────────────

export type RepositoryStatus =
  | "PENDING"
  | "CLONING"
  | "PROCESSING"
  | "EMBEDDING"
  | "READY"
  | "FAILED";

export interface Repository {
  id: string;
  name: string;
  fullName: string;
  description: string | null;
  url: string;
  language: string | null;
  stars: number;
  forks: number;
  isPrivate: boolean;
  status: RepositoryStatus;
  errorMessage: string | null;
  indexedAt: string | null;
  createdAt: string;
  updatedAt: string;
  // Included in GET /:id responses
  chunkCount?: number;
  _count?: { files: number; conversations: number };
}

interface RepositoriesResponse {
  success: boolean;
  repositories: Repository[];
}

interface ImportRepositoryResponse {
  success: boolean;
  repository: Repository;
}

// ─── Query Keys ───────────────────────────────────────────────────────────────

export const repositoryKeys = {
  all: ["repositories"] as const,
  list: () => [...repositoryKeys.all, "list"] as const,
  detail: (id: string) => [...repositoryKeys.all, "detail", id] as const,
};

// ─── Hooks ────────────────────────────────────────────────────────────────────

/**
 * Fetches the list of all repositories for the authenticated user.
 */
export function useRepositories() {
  return useQuery({
    queryKey: repositoryKeys.list(),
    queryFn: async () => {
      const { data } = await api.get<RepositoriesResponse>("/repositories");
      return data.repositories;
    },
  });
}

/**
 * Mutation to import a new GitHub repository.
 * Automatically invalidates the repositories list on success.
 */
export function useImportRepository() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (url: string) => {
      const { data } = await api.post<ImportRepositoryResponse>(
        "/repositories",
        { url }
      );
      return data.repository;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: repositoryKeys.list() });
    },
  });
}

/**
 * Mutation to delete a repository by ID.
 * Automatically invalidates the repositories list on success.
 */
export function useDeleteRepository() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/repositories/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: repositoryKeys.list() });
    },
  });
}

/**
 * Mutation to re-index a repository (wipe + re-process from scratch).
 */
export function useReindexRepository() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await api.post(`/repositories/${id}/reindex`);
    },
    onSuccess: (_data, id) => {
      // Invalidate both list and this repo's detail so status resets to PENDING
      queryClient.invalidateQueries({ queryKey: repositoryKeys.list() });
      queryClient.invalidateQueries({ queryKey: repositoryKeys.detail(id) });
    },
  });
}

// ─── Active Processing States ─────────────────────────────────────────────────

const IN_PROGRESS_STATUSES: RepositoryStatus[] = [
  "PENDING",
  "CLONING",
  "PROCESSING",
  "EMBEDDING",
];

/**
 * Fetches a single repository by ID.
 * Auto-polls every 3 seconds while the repo is in an in-progress state.
 * Polling stops automatically when the status becomes READY or FAILED.
 */
export function useRepository(id: string) {
  return useQuery({
    queryKey: repositoryKeys.detail(id),
    queryFn: async () => {
      const { data } = await api.get<{ success: boolean; repository: Repository }>(
        `/repositories/${id}`
      );
      return data.repository;
    },
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      if (!status) return 3_000;
      return IN_PROGRESS_STATUSES.includes(status) ? 3_000 : false;
    },
    enabled: !!id,
  });
}

