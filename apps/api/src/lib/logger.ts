import winston from "winston";
import { env } from "../config/env";

const { combine, timestamp, printf, colorize, errors, json } = winston.format;

// ─── Development Format ───────────────────────────────────────────────────────
const devFormat = combine(
  colorize({ all: true }),
  timestamp({ format: "HH:mm:ss" }),
  errors({ stack: true }),
  printf(({ level, message, timestamp: ts, stack, ...meta }) => {
    const metaStr =
      Object.keys(meta).length > 0
        ? `\n${JSON.stringify(meta, null, 2)}`
        : "";
    return `${ts} [${level}]: ${stack ?? message}${metaStr}`;
  })
);

// ─── Production Format ────────────────────────────────────────────────────────
const prodFormat = combine(timestamp(), errors({ stack: true }), json());

// ─── Logger ───────────────────────────────────────────────────────────────────
export const logger = winston.createLogger({
  level: env.LOG_LEVEL,
  format: env.NODE_ENV === "production" ? prodFormat : devFormat,
  defaultMeta: { service: "gitpulse-api" },
  transports: [new winston.transports.Console()],
  exitOnError: false,
});

// Capture uncaught errors through Winston
export function setupProcessLogging(): void {
  process.on("uncaughtException", (error) => {
    logger.error("Uncaught exception", { error: error.message, stack: error.stack });
    process.exit(1);
  });

  process.on("unhandledRejection", (reason) => {
    logger.error("Unhandled rejection", { reason });
    process.exit(1);
  });
}
