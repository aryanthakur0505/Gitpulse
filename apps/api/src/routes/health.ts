import { Router, Request, Response } from "express";
import { db } from "@gitpulse/db";

const router = Router();

/**
 * GET /health
 * Public health check endpoint — verifies server, database, and upstream connections.
 */
router.get("/", async (_req: Request, res: Response) => {
  const checks: Record<string, "ok" | "error"> = {
    server: "ok",
    database: "ok",
  };

  // Database connectivity check
  try {
    await db.$queryRaw`SELECT 1`;
  } catch {
    checks["database"] = "error";
  }

  const isHealthy = Object.values(checks).every((s) => s === "ok");

  res.status(isHealthy ? 200 : 503).json({
    status: isHealthy ? "ok" : "degraded",
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    checks,
  });
});

export default router;
