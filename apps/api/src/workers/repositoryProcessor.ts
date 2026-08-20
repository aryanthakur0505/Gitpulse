import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import simpleGit from "simple-git";
import { Worker, type Job } from "bullmq";
import { db } from "@gitpulse/db";
import { env } from "../config/env";
import { bullMQConnection, QUEUES, getQueue } from "../lib/queue";
import { logger } from "../lib/logger";
import {
  getIgnoreFilter,
  walkFiles,
  processFile,
} from "../services/fileProcessor";

// ─── Job Payload ──────────────────────────────────────────────────────────────

export interface RepositoryProcessingJob {
  repositoryId: string;
}

// ─── Temp Directory ───────────────────────────────────────────────────────────

function getTempDir(repositoryId: string): string {
  const base = env.REPOS_TEMP_DIR ?? path.join(os.tmpdir(), "gitpulse");
  return path.join(base, repositoryId);
}

function cleanupTempDir(dir: string): void {
  try {
    fs.rmSync(dir, { recursive: true, force: true });
    logger.debug(`Cleaned up temp directory: ${dir}`);
  } catch (err) {
    logger.warn(`Failed to cleanup temp directory: ${dir}`, { error: err });
  }
}

// ─── Status Helpers ───────────────────────────────────────────────────────────

async function setStatus(
  repositoryId: string,
  status: "CLONING" | "PROCESSING" | "EMBEDDING" | "READY" | "FAILED",
  extra?: { errorMessage?: string; indexedAt?: Date }
): Promise<void> {
  await db.repository.update({
    where: { id: repositoryId },
    data: {
      status,
      ...(extra?.errorMessage !== undefined
        ? { errorMessage: extra.errorMessage }
        : {}),
      ...(extra?.indexedAt !== undefined
        ? { indexedAt: extra.indexedAt }
        : {}),
    },
  });
}

// ─── Core Processor ───────────────────────────────────────────────────────────

async function processRepository(repositoryId: string): Promise<void> {
  // 1. Fetch repository record
  const repository = await db.repository.findUnique({
    where: { id: repositoryId },
  });

  if (!repository) {
    throw new Error(`Repository ${repositoryId} not found in database`);
  }

  logger.info(`[Worker] Starting processing for: ${repository.fullName}`, {
    repositoryId,
  });

  const tempDir = getTempDir(repositoryId);

  try {
    // ── Step 1: Clone ──────────────────────────────────────────────────────
    await setStatus(repositoryId, "CLONING");
    logger.info(`[Worker] Cloning ${repository.cloneUrl} → ${tempDir}`);

    // Ensure clean temp dir
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
    fs.mkdirSync(tempDir, { recursive: true });

    const git = simpleGit();
    await git.clone(repository.cloneUrl, tempDir, [
      "--depth=1",      // shallow clone — we only need the latest snapshot
      "--single-branch",
      `--branch=${repository.defaultBranch}`,
    ]);

    logger.info(`[Worker] Clone complete for: ${repository.fullName}`);

    // ── Step 2: Index Files ────────────────────────────────────────────────
    await setStatus(repositoryId, "PROCESSING");

    const ig = getIgnoreFilter(tempDir);

    let fileCount = 0;
    let chunkCount = 0;
    let skippedCount = 0;

    for await (const { absolutePath, relativePath } of walkFiles(tempDir, ig)) {
      const processed = processFile(absolutePath, relativePath);

      if (!processed || processed.chunks.length === 0) {
        skippedCount++;
        continue;
      }

      // Sanitize: strip null bytes which cause Postgres connector errors
      const safeChunks = processed.chunks
        .map((c) => ({ ...c, content: c.content.replace(/\0/g, "") }))
        .filter((c) => c.content.trim().length > 0);

      if (safeChunks.length === 0) {
        skippedCount++;
        continue;
      }

      // Upsert the file record
      const fileRecord = await db.repositoryFile.upsert({
        where: {
          repositoryId_path: {
            repositoryId,
            path: processed.relativePath,
          },
        },
        create: {
          repositoryId,
          path: processed.relativePath,
          language: processed.language,
          size: processed.size,
          lineCount: processed.lineCount,
        },
        update: {
          language: processed.language,
          size: processed.size,
          lineCount: processed.lineCount,
        },
      });

      // Delete any old chunks for this file (re-indexing scenario)
      await db.codeChunk.deleteMany({ where: { fileId: fileRecord.id } });

      // Create chunks in batches to avoid Prisma/Postgres parameter limits
      const BATCH_SIZE = 200;
      for (let i = 0; i < safeChunks.length; i += BATCH_SIZE) {
        const batch = safeChunks.slice(i, i + BATCH_SIZE);
        try {
          await db.codeChunk.createMany({
            data: batch.map((chunk) => ({
              fileId: fileRecord.id,
              content: chunk.content,
              startLine: chunk.startLine,
              endLine: chunk.endLine,
              tokenCount: chunk.tokenCount,
            })),
          });
        } catch (batchErr) {
          // If a batch fails, insert chunks one by one to skip the bad ones
          logger.warn(`[Worker] Batch insert failed for ${processed.relativePath}, falling back to individual inserts`, { error: batchErr });
          for (const chunk of batch) {
            try {
              await db.codeChunk.create({
                data: {
                  fileId: fileRecord.id,
                  content: chunk.content,
                  startLine: chunk.startLine,
                  endLine: chunk.endLine,
                  tokenCount: chunk.tokenCount,
                },
              });
            } catch {
              // Skip individual bad chunks silently
            }
          }
        }
      }

      fileCount++;
      chunkCount += safeChunks.length;

      if (fileCount % 50 === 0) {
        logger.info(
          `[Worker] Progress: ${fileCount} files, ${chunkCount} chunks`,
          { repositoryId }
        );
      }
    }

    // ── Step 3: Hand off to Embedding Worker ──────────────────────────────
    await setStatus(repositoryId, "EMBEDDING");

    await getQueue(QUEUES.EMBEDDING).add(
      "embed",
      { repositoryId },
      { jobId: `embed-${repositoryId}` } // idempotent
    );

    logger.info(
      `[Worker] ✅ Chunking done for ${repository.fullName}: ` +
        `${fileCount} files, ${chunkCount} chunks, ${skippedCount} skipped — embedding queued`,
      { repositoryId }
    );
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Unknown processing error";

    logger.error(`[Worker] ❌ Failed processing ${repository.fullName}`, {
      repositoryId,
      error: message,
    });

    await setStatus(repositoryId, "FAILED", { errorMessage: message });

    // Re-throw so BullMQ registers this as a failed job and can retry
    throw err;
  } finally {
    // Always clean up the temp directory
    cleanupTempDir(tempDir);
  }
}

// ─── Worker Registration ──────────────────────────────────────────────────────

let repositoryProcessorWorker: Worker | null = null;

export function startRepositoryProcessorWorker(): Worker {
  if (repositoryProcessorWorker) {
    return repositoryProcessorWorker;
  }

  repositoryProcessorWorker = new Worker<RepositoryProcessingJob>(
    QUEUES.REPOSITORY_PROCESSING,
    async (job: Job<RepositoryProcessingJob>) => {
      const { repositoryId } = job.data;

      if (!repositoryId) {
        throw new Error("Job is missing repositoryId");
      }

      await processRepository(repositoryId);
    },
    {
      connection: bullMQConnection,
      concurrency: 2, // process up to 2 repos simultaneously
      limiter: {
        max: 5,
        duration: 60_000, // max 5 jobs per minute (rate-limit GitHub clones)
      },
    }
  );

  repositoryProcessorWorker.on("completed", (job) => {
    logger.info(`[Worker] Job ${job.id} completed`, {
      repositoryId: job.data.repositoryId,
    });
  });

  repositoryProcessorWorker.on("failed", (job, err) => {
    logger.error(`[Worker] Job ${job?.id} failed`, {
      repositoryId: job?.data?.repositoryId,
      error: err.message,
    });
  });

  repositoryProcessorWorker.on("error", (err) => {
    logger.error("[Worker] Worker error", { error: err.message });
  });

  logger.info("[Worker] Repository processor worker started");
  return repositoryProcessorWorker;
}

export async function stopRepositoryProcessorWorker(): Promise<void> {
  if (repositoryProcessorWorker) {
    await repositoryProcessorWorker.close();
    repositoryProcessorWorker = null;
    logger.info("[Worker] Repository processor worker stopped");
  }
}
