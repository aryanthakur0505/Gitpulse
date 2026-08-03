import { Queue, Worker, QueueEvents, type ConnectionOptions } from "bullmq";
import { env } from "../config/env";
import { logger } from "./logger";

// ─── Queue Names ──────────────────────────────────────────────────────────────
export const QUEUES = {
  REPOSITORY_PROCESSING: "repository:processing",
  EMBEDDING: "embedding",
} as const;

export type QueueName = (typeof QUEUES)[keyof typeof QUEUES];

// ─── Redis Connection ─────────────────────────────────────────────────────────
const connection: ConnectionOptions = {
  host: new URL(env.REDIS_URL).hostname,
  port: parseInt(new URL(env.REDIS_URL).port || "6379", 10),
  maxRetriesPerRequest: null,
};

// ─── Queue Factory ────────────────────────────────────────────────────────────
const queues = new Map<QueueName, Queue>();

export function getQueue(name: QueueName): Queue {
  if (queues.has(name)) {
    return queues.get(name)!;
  }

  const queue = new Queue(name, {
    connection,
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 2000,
      },
      removeOnComplete: { count: 100 },
      removeOnFail: { count: 500 },
    },
  });

  queue.on("error", (err) => {
    logger.error(`Queue [${name}] error`, { error: err.message });
  });

  queues.set(name, queue);
  logger.info(`Queue [${name}] initialized`);
  return queue;
}

// ─── Close All Queues ─────────────────────────────────────────────────────────
export async function closeAllQueues(): Promise<void> {
  const closePromises = Array.from(queues.values()).map((q) => q.close());
  await Promise.all(closePromises);
  queues.clear();
  logger.info("All queues closed gracefully");
}

// ─── Re-exports for workers ───────────────────────────────────────────────────
export { Queue, Worker, QueueEvents, connection as bullMQConnection };
