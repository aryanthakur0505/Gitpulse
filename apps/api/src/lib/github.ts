import axios, { AxiosInstance } from "axios";
import { env } from "../config/env";
import { AppError } from "../middleware/errorHandler";

// ─── GitHub API Client ────────────────────────────────────────────────────────

const github: AxiosInstance = axios.create({
  baseURL: "https://api.github.com",
  headers: {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
    ...(env.GITHUB_TOKEN
      ? { Authorization: `Bearer ${env.GITHUB_TOKEN}` }
      : {}),
  },
  timeout: 10_000,
});

// ─── Types ────────────────────────────────────────────────────────────────────

export interface GitHubRepoMetadata {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  html_url: string;
  clone_url: string;
  language: string | null;
  stargazers_count: number;
  forks_count: number;
  private: boolean;
  default_branch: string;
}

// ─── URL Parser ───────────────────────────────────────────────────────────────

/**
 * Parses a GitHub repository URL and returns owner + repo name.
 * Accepts both HTTPS and SSH formats.
 *
 * Examples:
 *   https://github.com/facebook/react      → { owner: "facebook", repo: "react" }
 *   https://github.com/facebook/react.git  → { owner: "facebook", repo: "react" }
 */
export function parseGitHubUrl(url: string): { owner: string; repo: string } {
  const trimmed = url.trim().replace(/\.git$/, "");

  // Match https://github.com/owner/repo
  const httpsMatch = trimmed.match(
    /^https?:\/\/github\.com\/([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_.-]+)\/?$/
  );
  if (httpsMatch) {
    return { owner: httpsMatch[1], repo: httpsMatch[2] };
  }

  // Match git@github.com:owner/repo
  const sshMatch = trimmed.match(
    /^git@github\.com:([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_.-]+)$/
  );
  if (sshMatch) {
    return { owner: sshMatch[1], repo: sshMatch[2] };
  }

  throw new AppError(400, "Invalid GitHub repository URL");
}

// ─── Fetch Repo Metadata ──────────────────────────────────────────────────────

/**
 * Fetches repository metadata from the GitHub REST API.
 * Throws descriptive errors for private repos, non-existent repos, etc.
 */
export async function fetchRepoMetadata(
  owner: string,
  repo: string
): Promise<GitHubRepoMetadata> {
  try {
    const { data } = await github.get<GitHubRepoMetadata>(
      `/repos/${owner}/${repo}`
    );
    return data;
  } catch (err: unknown) {
    if (axios.isAxiosError(err)) {
      if (err.response?.status === 404) {
        throw new AppError(
          404,
          `Repository "${owner}/${repo}" not found or is private`
        );
      }
      if (err.response?.status === 403) {
        throw new AppError(
          403,
          "GitHub API rate limit exceeded. Add a GITHUB_TOKEN to your .env to increase limits."
        );
      }
    }
    throw new AppError(502, "Failed to fetch repository data from GitHub");
  }
}
