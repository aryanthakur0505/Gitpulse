import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { unauthorized } from "./errorHandler";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface JwtPayload {
  sub: string;   // User cuid (our internal DB id)
  githubId: string;
  email?: string;
  name?: string;
  iat?: number;
  exp?: number;
}

// ─── Token Utilities ──────────────────────────────────────────────────────────

export function signToken(payload: Omit<JwtPayload, "iat" | "exp">): string {
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: "30d",
    algorithm: "HS256",
  });
}

export function verifyToken(token: string): JwtPayload {
  return jwt.verify(token, env.JWT_SECRET) as JwtPayload;
}

// ─── Auth Middleware ──────────────────────────────────────────────────────────

export function requireAuth(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith("Bearer ")) {
    return next(unauthorized("Missing or invalid Authorization header"));
  }

  const token = authHeader.slice(7);

  try {
    const payload = verifyToken(token);
    req.user = payload;
    next();
  } catch {
    next(unauthorized("Invalid or expired token"));
  }
}

// ─── Internal Secret Middleware ───────────────────────────────────────────────
// Used for internal Next.js → Express calls (e.g., auth sync)

export function requireInternalSecret(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  const secret = req.headers["x-internal-secret"];

  if (!secret || secret !== env.API_INTERNAL_SECRET) {
    return next(unauthorized("Invalid internal secret"));
  }

  next();
}
