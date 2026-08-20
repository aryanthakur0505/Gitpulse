import { Router, Request, Response, NextFunction } from "express";
import { db } from "@gitpulse/db";
import { requireAuth } from "../middleware/auth";
import { logger } from "../lib/logger";

const router = Router();

router.use(requireAuth);

/**
 * GET /api/stats
 * Returns aggregated analytics for the authenticated user's workspace.
 */
router.get(
  "/",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.sub;

      // Run all queries in parallel
      const [
        repositories,
        conversationCount,
        messageCount,
        chunkCount,
      ] = await Promise.all([
        // All repos with file + conversation counts
        db.repository.findMany({
          where: { userId },
          select: {
            id: true,
            fullName: true,
            language: true,
            status: true,
            indexedAt: true,
            createdAt: true,
            stars: true,
            _count: { select: { files: true, conversations: true } },
          },
          orderBy: { createdAt: "desc" },
        }),

        // Total conversations for this user
        db.conversation.count({ where: { userId } }),

        // Total messages for this user
        db.message.count({
          where: { conversation: { userId } },
        }),

        // Total indexed code chunks for this user's repos
        db.codeChunk.count({
          where: { file: { repository: { userId } } },
        }),
      ]);

      // Derived stats
      const totalRepos = repositories.length;
      const readyRepos = repositories.filter((r) => r.status === "READY").length;
      const failedRepos = repositories.filter((r) => r.status === "FAILED").length;
      const processingRepos = repositories.filter(
        (r) => !["READY", "FAILED"].includes(r.status)
      ).length;

      // Language distribution (only across READY repos)
      const langMap: Record<string, number> = {};
      for (const repo of repositories) {
        if (repo.status === "READY" && repo.language) {
          langMap[repo.language] = (langMap[repo.language] ?? 0) + 1;
        }
      }
      const languageDistribution = Object.entries(langMap)
        .sort((a, b) => b[1] - a[1])
        .map(([language, count]) => ({ language, count }));

      // Recent activity — last 5 indexed repos
      const recentActivity = repositories
        .filter((r) => r.status === "READY" && r.indexedAt)
        .slice(0, 5)
        .map((r) => ({
          id: r.id,
          fullName: r.fullName,
          language: r.language,
          indexedAt: r.indexedAt,
          fileCount: r._count.files,
          conversationCount: r._count.conversations,
        }));

      logger.info("[Stats] Fetched workspace stats", {
        userId,
        totalRepos,
        chunkCount,
      });

      res.json({
        success: true,
        stats: {
          repositories: {
            total: totalRepos,
            ready: readyRepos,
            failed: failedRepos,
            processing: processingRepos,
          },
          conversations: {
            total: conversationCount,
            messages: messageCount,
          },
          codeChunks: chunkCount,
          languageDistribution,
          recentActivity,
        },
      });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
