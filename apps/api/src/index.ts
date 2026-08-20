import "dotenv/config";
import { createApp } from "./app";
import { env } from "./config/env";
import { logger, setupProcessLogging } from "./lib/logger";
import { getRedisClient, closeRedis } from "./config/redis";
import { getQueue, closeAllQueues, QUEUES } from "./lib/queue";
import { db } from "@gitpulse/db";
import {
  startRepositoryProcessorWorker,
  stopRepositoryProcessorWorker,
} from "./workers/repositoryProcessor";
import {
  startEmbeddingWorker,
  stopEmbeddingWorker,
} from "./workers/embeddingWorker";

// ─── Bootstrap ────────────────────────────────────────────────────────────────

setupProcessLogging();

async function bootstrap(): Promise<void> {
  // 1. Validate database connection
  try {
    await db.$connect();
    logger.info("Database connected");
  } catch (err) {
    logger.error("Failed to connect to database", { error: err });
    process.exit(1);
  }

  // 2. Initialize Redis
  const redis = getRedisClient();
  await redis.connect();

  // 3. Initialize queues
  getQueue(QUEUES.REPOSITORY_PROCESSING);
  getQueue(QUEUES.EMBEDDING);
  logger.info("BullMQ queues initialized");

  // 4. Start background workers
  startRepositoryProcessorWorker();
  startEmbeddingWorker();
  logger.info("Background workers started");

  // 5. Start HTTP server
  const app = createApp();
  const server = app.listen(env.PORT, () => {
    logger.info(`🚀 API server running on http://localhost:${env.PORT}`, {
      env: env.NODE_ENV,
      port: env.PORT,
    });
  });

  // ─── Graceful Shutdown ───────────────────────────────────────────────────
  const shutdown = async (signal: string): Promise<void> => {
    logger.info(`Received ${signal} — shutting down gracefully...`);

    server.close(async () => {
      try {
        await Promise.all([
          stopRepositoryProcessorWorker(),
          stopEmbeddingWorker(),
          db.$disconnect(),
          closeRedis(),
          closeAllQueues(),
        ]);
        logger.info("All connections closed. Goodbye.");
        process.exit(0);
      } catch (err) {
        logger.error("Error during shutdown", { error: err });
        process.exit(1);
      }
    });

    // Force exit after 10 seconds
    setTimeout(() => {
      logger.error("Forced exit after timeout");
      process.exit(1);
    }, 10_000);
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

bootstrap().catch((err) => {
  console.error("RAW BOOTSTRAP ERROR:", err);
  logger.error("Bootstrap failed", { error: err });
  process.exit(1);
});
