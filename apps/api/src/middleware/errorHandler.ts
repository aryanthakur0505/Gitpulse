import { Request, Response, NextFunction } from "express";
import { ZodError } from "zod";
import { logger } from "../lib/logger";

// ─── AppError ─────────────────────────────────────────────────────────────────

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;

  constructor(statusCode: number, message: string, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    Object.setPrototypeOf(this, AppError.prototype);
    Error.captureStackTrace(this, this.constructor);
  }
}

// ─── HTTP Status Helpers ──────────────────────────────────────────────────────

export const notFound = (message = "Not found"): AppError =>
  new AppError(404, message);

export const unauthorized = (message = "Unauthorized"): AppError =>
  new AppError(401, message);

export const forbidden = (message = "Forbidden"): AppError =>
  new AppError(403, message);

export const badRequest = (message: string): AppError =>
  new AppError(400, message);

// ─── Error Handler Middleware ─────────────────────────────────────────────────

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
): void {
  // Zod validation errors
  if (err instanceof ZodError) {
    res.status(400).json({
      success: false,
      error: "Validation failed",
      details: err.errors.map((e) => ({
        field: e.path.join("."),
        message: e.message,
      })),
    });
    return;
  }

  // Known operational errors
  if (err instanceof AppError) {
    if (err.statusCode >= 500) {
      logger.error("Operational error", {
        message: err.message,
        stack: err.stack,
      });
    }
    res.status(err.statusCode).json({
      success: false,
      error: err.message,
    });
    return;
  }

  // Unknown / programmer errors
  logger.error("Unhandled error", {
    message: err.message,
    stack: err.stack,
  });

  res.status(500).json({
    success: false,
    error: "An unexpected error occurred",
  });
}
