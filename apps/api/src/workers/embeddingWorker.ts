import { Worker, type Job } from "bullmq";
import { db } from "@gitpulse/db";
import { env } from "../config/env";
import { bullMQConnection, QUEUES } from "../lib/queue";
import { logger } from "../lib/logger";
import { generateEmbeddings } from "../lib/localEmbeddings";
import { upsertVectors, repoNamespace, type VectorRecord } from "../lib/pinecone";

// ─── Job Payload ──────────────────────────────────────────────────────────────

export interface EmbeddingJob {
  repositoryId: string;
}

// ─── Status Helpers ───────────────────────────────────────────────────────────

async function setStatus(
  repositoryId: string,
  status: "READY" | "FAILED",
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

// ─── Sleep Helper ─────────────────────────────────────────────────────────────

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// ─── Core Embedder ────────────────────────────────────────────────────────────

async function embedRepository(repositoryId: string): Promise<void> {
  const repository = await db.repository.findUnique({
    where: { id: repositoryId },
    select: { id: true, fullName: true },
  });

  if (!repository) {
    throw new Error(`Repository ${repositoryId} not found in database`);
  }

  logger.info(`[EmbedWorker] Starting embedding for: ${repository.fullName}`, {
    repositoryId,
  });

  // Fetch all chunks that have not been embedded yet.
  // On re-indexing, embeddingId is cleared by repositoryProcessor so this
  // naturally picks up the fresh chunks.
  const chunks = await db.codeChunk.findMany({
    where: {
      embeddingId: null,
      file: { repositoryId },
    },
    select: {
      id: true,
      content: true,
      startLine: true,
      endLine: true,
      file: {
        select: {
          id: true,
          path: true,
        },
      },
    },
  });

  if (chunks.length === 0) {
    logger.warn(`[EmbedWorker] No un-embedded chunks found, marking READY`, {
      repositoryId,
    });
    await setStatus(repositoryId, "READY", { indexedAt: new Date() });
    return;
  }

  logger.info(
    `[EmbedWorker] ${chunks.length} chunks to embed in batches of ${env.EMBEDDING_BATCH_SIZE}`,
    { repositoryId }
  );

  const ns = repoNamespace(repositoryId);
  let embeddedCount = 0;

  // Process in batches
  for (let i = 0; i < chunks.length; i += env.EMBEDDING_BATCH_SIZE) {
    const batch = chunks.slice(i, i + env.EMBEDDING_BATCH_SIZE);
    const batchNum = Math.floor(i / env.EMBEDDING_BATCH_SIZE) + 1;
    const totalBatches = Math.ceil(chunks.length / env.EMBEDDING_BATCH_SIZE);

    logger.info(
      `[EmbedWorker] Processing batch ${batchNum}/${totalBatches} (${batch.length} chunks)`,
      { repositoryId }
    );

    // 1. Generate embeddings for the whole batch in one API call
    const texts = batch.map((chunk) => chunk.content);
    const vectors = await generateEmbeddings(texts);

    // 2. Build vector records — use chunkId as the Pinecone vector ID
    //    so we can look up DB records directly from search results.
    const vectorRecords: VectorRecord[] = batch.map((chunk, idx) => ({
      id: chunk.id,
      values: vectors[idx]!,
      metadata: {
        chunkId: chunk.id,
        fileId: chunk.file.id,
        repositoryId,
        filePath: chunk.file.path,
        startLine: chunk.startLine,
        endLine: chunk.endLine,
        // Truncate content stored in metadata to 1000 chars to stay within
        // Pinecone's 40KB metadata limit per vector
        content: chunk.content.slice(0, 1000),
      },
    }));

    // 3. Upsert into Pinecone
    await upsertVectors(repositoryId, vectorRecords);

    // 4. Write embeddingId back to each CodeChunk row in a single transaction
    await db.$transaction(
      batch.map((chunk) =>
        db.codeChunk.update({
          where: { id: chunk.id },
          data: { embeddingId: chunk.id }, // vector ID == chunk ID
        })
      )
    );

    embeddedCount += batch.length;

    logger.info(
      `[EmbedWorker] Batch ${batchNum}/${totalBatches} done — ${embeddedCount}/${chunks.length} embedded`,
      { repositoryId, namespace: ns }
    );

    // Rate-limit guard: pause 200ms between batches to stay comfortably
    // within OpenAI's free-tier RPM/TPM limits.
    if (i + env.EMBEDDING_BATCH_SIZE < chunks.length) {
      await sleep(200);
    }
  }

  // 5. All chunks embedded — mark repository READY
  await setStatus(repositoryId, "READY", { indexedAt: new Date() });

  logger.info(
    `[EmbedWorker] ✅ Embedding complete for ${repository.fullName}: ${embeddedCount} chunks embedded`,
    { repositoryId }
  );
}

// ─── Worker Registration ──────────────────────────────────────────────────────

let embeddingWorker: Worker | null = null;

export function startEmbeddingWorker(): Worker {
  if (embeddingWorker) return embeddingWorker;

  embeddingWorker = new Worker<EmbeddingJob>(
    QUEUES.EMBEDDING,
    async (job: Job<EmbeddingJob>) => {
      const { repositoryId } = job.data;

      if (!repositoryId) {
        throw new Error("Embedding job is missing repositoryId");
      }

      try {
        await embedRepository(repositoryId);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Unknown embedding error";

        logger.error(
          `[EmbedWorker] ❌ Failed embedding for repository: ${repositoryId}`,
          { error: message }
        );

        await setStatus(repositoryId, "FAILED", { errorMessage: message });

        // Re-throw so BullMQ records the failure and can retry
        throw err;
      }
    },
    {
      connection: bullMQConnection,
      concurrency: 1, // embedding is I/O heavy and API-rate-limited; 1 at a time is safe
    }
  );

  embeddingWorker.on("completed", (job) => {
    logger.info(`[EmbedWorker] Job ${job.id} completed`, {
      repositoryId: job.data.repositoryId,
    });
  });

  embeddingWorker.on("failed", (job, err) => {
    logger.error(`[EmbedWorker] Job ${job?.id} failed`, {
      repositoryId: job?.data?.repositoryId,
      error: err.message,
    });
  });

  embeddingWorker.on("error", (err) => {
    logger.error("[EmbedWorker] Worker error", { error: err.message });
  });

  logger.info("[EmbedWorker] Embedding worker started");
  return embeddingWorker;
}

export async function stopEmbeddingWorker(): Promise<void> {
  if (embeddingWorker) {
    await embeddingWorker.close();
    embeddingWorker = null;
    logger.info("[EmbedWorker] Embedding worker stopped");
  }
}
