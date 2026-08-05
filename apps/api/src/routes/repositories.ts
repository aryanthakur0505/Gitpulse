import { Router, Request, Response, NextFunction } from "express";
import { z } from "zod";
import { db } from "@gitpulse/db";
import { requireAuth } from "../middleware/auth";
import { notFound, badRequest } from "../middleware/errorHandler";
import { parseGitHubUrl, fetchRepoMetadata } from "../lib/github";

const router = Router();

// All routes here require a valid JWT
router.use(requireAuth);

// ─── Schemas ──────────────────────────────────────────────────────────────────

const importRepoSchema = z.object({
  url: z.string().min(1, "Repository URL is required"),
});

// ─── Routes ───────────────────────────────────────────────────────────────────

/**
 * POST /api/repositories
 * Import a new GitHub repository for the authenticated user.
 */
router.post(
  "/",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { url } = importRepoSchema.parse(req.body);
      const userId = req.user!.sub;

      // 1. Parse the URL into owner + repo
      const { owner, repo } = parseGitHubUrl(url);

      // 2. Check if this repo is already imported by this user
      const existing = await db.repository.findFirst({
        where: { fullName: `${owner}/${repo}`, userId },
      });
      if (existing) {
        return next(
          badRequest(`Repository "${owner}/${repo}" is already imported`)
        );
      }

      // 3. Fetch metadata from GitHub
      const meta = await fetchRepoMetadata(owner, repo);

      // 4. Persist to database with PENDING status
      const repository = await db.repository.create({
        data: {
          userId,
          githubId: meta.id,
          name: meta.name,
          fullName: meta.full_name,
          description: meta.description,
          url: meta.html_url,
          cloneUrl: meta.clone_url,
          language: meta.language,
          stars: meta.stargazers_count,
          forks: meta.forks_count,
          isPrivate: meta.private,
          defaultBranch: meta.default_branch,
          status: "PENDING",
        },
      });

      res.status(201).json({ success: true, repository });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/repositories
 * List all repositories for the authenticated user.
 */
router.get(
  "/",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.sub;

      const repositories = await db.repository.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          name: true,
          fullName: true,
          description: true,
          url: true,
          language: true,
          stars: true,
          forks: true,
          isPrivate: true,
          status: true,
          indexedAt: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      res.json({ success: true, repositories });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/repositories/:id
 * Get a single repository by ID (must belong to the authenticated user).
 */
router.get(
  "/:id",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const userId = req.user!.sub;

      const repository = await db.repository.findFirst({
        where: { id, userId },
        include: {
          _count: { select: { files: true, conversations: true } },
        },
      });

      if (!repository) {
        return next(notFound("Repository not found"));
      }

      res.json({ success: true, repository });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * DELETE /api/repositories/:id
 * Delete a repository and all its associated data (cascade in DB).
 */
router.delete(
  "/:id",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const userId = req.user!.sub;

      const repository = await db.repository.findFirst({
        where: { id, userId },
      });

      if (!repository) {
        return next(notFound("Repository not found"));
      }

      await db.repository.delete({ where: { id } });

      res.json({ success: true, message: "Repository deleted successfully" });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
