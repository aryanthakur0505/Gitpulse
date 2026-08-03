import { PrismaClient } from "../generated/client";

// ─── Prisma Client Singleton ──────────────────────────────────────────────────
// In development, prevent multiple Prisma Client instances due to hot reloading.
// In production, a single instance is always created.

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env["NODE_ENV"] === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });

if (process.env["NODE_ENV"] !== "production") {
  globalForPrisma.prisma = db;
}

// ─── Re-exports ───────────────────────────────────────────────────────────────
export { PrismaClient, Prisma } from "../generated/client";
export type {
  User,
  Repository,
  RepositoryFile,
  CodeChunk,
  Conversation,
  Message,
  RepositoryStatus,
  MessageRole,
} from "../generated/client";
