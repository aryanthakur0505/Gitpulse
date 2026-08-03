import axios, { AxiosError, type AxiosRequestConfig } from "axios";
import { getSession } from "next-auth/react";

// ─── API Base Client ──────────────────────────────────────────────────────────

export const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api",
  headers: { "Content-Type": "application/json" },
  timeout: 30_000,
});

// Attach the API token from the NextAuth session to every request
api.interceptors.request.use(async (config) => {
  if (typeof window !== "undefined") {
    const session = await getSession();
    if (session?.apiToken) {
      config.headers.Authorization = `Bearer ${session.apiToken}`;
    }
  }
  return config;
});

// Normalize error responses
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError<{ error: string }>) => {
    const message =
      error.response?.data?.error ??
      error.message ??
      "An unexpected error occurred";
    const apiError = new Error(message) as Error & { status?: number };
    apiError.status = error.response?.status;
    return Promise.reject(apiError);
  }
);

// ─── Internal API Client (server-side only) ───────────────────────────────────
// Used in NextAuth callbacks and Next.js API routes to call Express directly.

export const internalApi = axios.create({
  baseURL: process.env.API_URL ?? "http://localhost:4000/api",
  headers: {
    "Content-Type": "application/json",
    "X-Internal-Secret": process.env.API_INTERNAL_SECRET ?? "",
  },
  timeout: 10_000,
});
