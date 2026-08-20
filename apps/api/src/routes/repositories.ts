import { Router, Request, Response, NextFunction } from "express";
import { z } from "zod";
import { db } from "@gitpulse/db";
import { requireAuth } from "../middleware/auth";
import { notFound, badRequest } from "../middleware/errorHandler";
import { parseGitHubUrl, fetchRepoMetadata } from "../lib/github";
import { getQueue, QUEUES } from "../lib/queue";
import { deleteNamespace } from "../lib/pinecone";

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

      // 5. Enqueue the repository processing job
      await getQueue(QUEUES.REPOSITORY_PROCESSING).add(
        "process",
        { repositoryId: repository.id },
        { jobId: `repo-${repository.id}` } // idempotent: won't duplicate if already queued
      );

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
          errorMessage: true,
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
 * Get a single repository by ID with file and chunk counts.
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

      // Get chunk count separately
      const chunkCount = await db.codeChunk.count({
        where: { file: { repositoryId: id } },
      });

      res.json({ success: true, repository: { ...repository, chunkCount } });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /api/repositories/:id/reindex
 * Wipes existing chunks/embeddings and re-queues the full processing pipeline.
 */
router.post(
  "/:id/reindex",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const userId = req.user!.sub;

      const repository = await db.repository.findFirst({
        where: { id, userId },
        select: { id: true, fullName: true, status: true },
      });

      if (!repository) return next(notFound("Repository not found"));

      const inProgress = ["PENDING", "CLONING", "PROCESSING", "EMBEDDING"];
      if (inProgress.includes(repository.status)) {
        return next(badRequest("Repository is already being processed"));
      }

      // Reset status → PENDING and clear error
      await db.repository.update({
        where: { id },
        data: { status: "PENDING", errorMessage: null, indexedAt: null },
      });

      // Delete existing chunks (cascade from files)
      await db.repositoryFile.deleteMany({ where: { repositoryId: id } });

      // Clear Pinecone namespace
      await deleteNamespace(id);

      // Re-enqueue
      await getQueue(QUEUES.REPOSITORY_PROCESSING).add(
        "process",
        { repositoryId: id },
        { jobId: `repo-${id}-reindex-${Date.now()}` }
      );

      res.json({ success: true, message: "Re-indexing started" });
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

      // Clean up Pinecone vectors for this repository.
      // Non-blocking: we await it but any Pinecone error is swallowed
      // (logged as a warning inside deleteNamespace) so the HTTP response
      // always succeeds even if the vector store is temporarily unavailable.
      await deleteNamespace(repository.id);

      res.json({ success: true, message: "Repository deleted successfully" });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
