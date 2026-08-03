import { Router } from "express";
import healthRouter from "./health";
import authRouter from "./auth";

const router = Router();

router.use("/health", healthRouter);
router.use("/auth", authRouter);

// 404 for unknown API routes
router.use((_req, res) => {
  res.status(404).json({ success: false, error: "Route not found" });
});

export default router;
