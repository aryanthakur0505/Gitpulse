import { Router, Request, Response, NextFunction } from "express";
import { z } from "zod";
import { db } from "@gitpulse/db";
import { requireAuth } from "../middleware/auth";
import { notFound, badRequest } from "../middleware/errorHandler";
import { runRagPipeline } from "../services/ragService";
import type { ChatMessage } from "../lib/llm";
import { logger } from "../lib/logger";

const router = Router();

// All routes require a valid JWT
router.use(requireAuth);

// ─── Schemas ──────────────────────────────────────────────────────────────────

const createConversationSchema = z.object({
  repositoryId: z.string().min(1),
  title: z.string().max(200).optional(),
});

const sendMessageSchema = z.object({
  content: z.string().min(1).max(10_000),
});

// ─── Routes ───────────────────────────────────────────────────────────────────

/**
 * GET /api/conversations?repositoryId=:id
 * Lists conversations. If repositoryId is omitted, returns ALL conversations for the user.
 */
router.get(
  "/",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.sub;
      const { repositoryId } = req.query;

      if (repositoryId) {
        if (typeof repositoryId !== "string") {
          return next(badRequest("repositoryId must be a string"));
        }
        // Verify ownership
        const repo = await db.repository.findFirst({
          where: { id: repositoryId, userId },
          select: { id: true },
        });
        if (!repo) return next(notFound("Repository not found"));
      }

      const conversations = await db.conversation.findMany({
        where: {
          userId,
          ...(repositoryId ? { repositoryId: repositoryId as string } : {}),
        },
        orderBy: { updatedAt: "desc" },
        include: {
          _count: { select: { messages: true } },
          repository: { select: { id: true, fullName: true, language: true } },
        },
      });

      res.json({ success: true, conversations });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /api/conversations
 * Creates a new conversation for a repository.
 */
router.post(
  "/",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.sub;
      const { repositoryId, title } = createConversationSchema.parse(req.body);

      // Verify ownership + READY status
      const repo = await db.repository.findFirst({
        where: { id: repositoryId, userId },
        select: { id: true, status: true, fullName: true },
      });
      if (!repo) return next(notFound("Repository not found"));
      if (repo.status !== "READY") {
        return next(badRequest("Repository must be in READY state to start a conversation"));
      }

      const conversation = await db.conversation.create({
        data: {
          userId,
          repositoryId,
          title: title ?? "New Conversation",
        },
      });

      res.status(201).json({ success: true, conversation });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /api/conversations/:id
 * Fetches a conversation with all its messages.
 */
router.get(
  "/:id",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.sub;
      const { id } = req.params;

      const conversation = await db.conversation.findFirst({
        where: { id, userId },
        include: {
          messages: { orderBy: { createdAt: "asc" } },
          repository: { select: { id: true, fullName: true, language: true } },
        },
      });

      if (!conversation) return next(notFound("Conversation not found"));

      res.json({ success: true, conversation });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * POST /api/conversations/:id/messages
 * Sends a user message and streams the RAG-powered AI response via SSE.
 */
router.post(
  "/:id/messages",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.sub;
      const { id } = req.params;
      const { content } = sendMessageSchema.parse(req.body);

      // Verify conversation ownership
      const conversation = await db.conversation.findFirst({
        where: { id, userId },
        include: {
          messages: { orderBy: { createdAt: "asc" }, take: 20 },
          repository: { select: { id: true, status: true } },
        },
      });

      if (!conversation) return next(notFound("Conversation not found"));
      if (conversation.repository.status !== "READY") {
        return next(badRequest("Repository is not ready"));
      }

      // Persist user message immediately
      await db.message.create({
        data: {
          conversationId: id!,
          role: "USER",
          content,
        },
      });

      // Build conversation history for multi-turn context (last 10 messages)
      const history: ChatMessage[] = conversation.messages.slice(-10).map((m) => ({
        role: m.role === "USER" ? "user" : "assistant",
        content: m.content,
      }));

      // ── SSE Setup ───────────────────────────────────────────────────────────
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");
      res.setHeader("X-Accel-Buffering", "no"); // nginx: disable buffering
      res.flushHeaders();

      const sendEvent = (event: string, data: unknown) => {
        res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
      };

      // ── RAG Pipeline ────────────────────────────────────────────────────────
      try {
        const { answer, sources } = await runRagPipeline(
          conversation.repository.id,
          content,
          history,
          (token) => sendEvent("token", { token })
        );

        // Send sources after streaming completes
        sendEvent("sources", { sources });

        // Persist assistant message
        await db.message.create({
          data: {
            conversationId: id!,
            role: "ASSISTANT",
            content: answer,
            // Round-trip through JSON to satisfy Prisma's InputJsonValue constraint
            metadata: JSON.parse(JSON.stringify({ sources })),
          },
        });

        // Update conversation's updatedAt
        await db.conversation.update({
          where: { id },
          data: { updatedAt: new Date() },
        });

        sendEvent("done", { success: true });
      } catch (ragErr) {
        logger.error("[Conversations] RAG pipeline failed", {
          error: ragErr instanceof Error ? ragErr.message : String(ragErr),
          conversationId: id,
        });
        sendEvent("error", {
          message: ragErr instanceof Error ? ragErr.message : "RAG pipeline failed",
        });
      }

      res.end();
    } catch (err) {
      next(err);
    }
  }
);

/**
 * DELETE /api/conversations/:id
 * Deletes a conversation and all its messages.
 */
router.delete(
  "/:id",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.sub;
      const { id } = req.params;

      const conversation = await db.conversation.findFirst({
        where: { id, userId },
        select: { id: true },
      });
      if (!conversation) return next(notFound("Conversation not found"));

      await db.conversation.delete({ where: { id } });

      res.json({ success: true });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
