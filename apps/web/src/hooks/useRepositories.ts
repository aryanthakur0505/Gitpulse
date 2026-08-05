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
  indexedAt: string | null;
  createdAt: string;
  updatedAt: string;
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
