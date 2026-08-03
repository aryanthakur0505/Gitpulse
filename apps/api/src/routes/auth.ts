import { Router, Request, Response, NextFunction } from "express";
import { z } from "zod";
import { db } from "@gitpulse/db";
import { requireInternalSecret, requireAuth, signToken } from "../middleware/auth";
import { badRequest } from "../middleware/errorHandler";

const router = Router();

// ─── Schema ───────────────────────────────────────────────────────────────────

const syncUserSchema = z.object({
  githubId: z.string(),
  name: z.string().nullable().optional(),
  email: z.string().email().nullable().optional(),
  avatarUrl: z.string().url().nullable().optional(),
});

// ─── Routes ───────────────────────────────────────────────────────────────────

/**
 * POST /api/auth/sync
 * Called by Next.js during the NextAuth signIn callback.
 * Upserts the user in our database and returns an API JWT.
 * Protected by the internal secret header.
 */
router.post(
  "/sync",
  requireInternalSecret,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const body = syncUserSchema.parse(req.body);

      const user = await db.user.upsert({
        where: { githubId: body.githubId },
        update: {
          name: body.name ?? undefined,
          email: body.email ?? undefined,
          avatarUrl: body.avatarUrl ?? undefined,
        },
        create: {
          githubId: body.githubId,
          name: body.name ?? undefined,
          email: body.email ?? undefined,
          avatarUrl: body.avatarUrl ?? undefined,
        },
        select: {
          id: true,
          githubId: true,
          name: true,
          email: true,
          avatarUrl: true,
        },
      });

      const token = signToken({
        sub: user.id,
        githubId: user.githubId,
        email: user.email ?? undefined,
        name: user.name ?? undefined,
      });

      res.json({
        success: true,
        user,
        token,
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/auth/me
 * Returns the currently authenticated user's profile.
 */
router.get(
  "/me",
  requireAuth,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = await db.user.findUnique({
        where: { id: req.user!.sub },
        select: {
          id: true,
          githubId: true,
          name: true,
          email: true,
          avatarUrl: true,
          createdAt: true,
          _count: {
            select: { repositories: true, conversations: true },
          },
        },
      });

      if (!user) {
        return next(badRequest("User not found"));
      }

      res.json({ success: true, user });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
