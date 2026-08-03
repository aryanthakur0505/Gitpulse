import Redis from "ioredis";
import { env } from "./env";
import { logger } from "../lib/logger";

// ─── Singleton Redis Client ───────────────────────────────────────────────────

let redisClient: Redis | null = null;

export function getRedisClient(): Redis {
  if (redisClient) return redisClient;

  redisClient = new Redis(env.REDIS_URL, {
    maxRetriesPerRequest: null, // Required by BullMQ
    enableReadyCheck: false,
    lazyConnect: true,
  });

  redisClient.on("connect", () => {
    logger.info("Redis connected");
  });

  redisClient.on("error", (err) => {
    logger.error("Redis error", { error: err.message });
  });

  redisClient.on("close", () => {
    logger.warn("Redis connection closed");
  });

  return redisClient;
}

export async function closeRedis(): Promise<void> {
  if (redisClient) {
    await redisClient.quit();
    redisClient = null;
    logger.info("Redis connection closed gracefully");
  }
}
