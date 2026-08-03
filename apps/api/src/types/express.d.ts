import { Request } from "express";
import { JwtPayload } from "../middleware/auth";

// Augment Express Request to include authenticated user
declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}
