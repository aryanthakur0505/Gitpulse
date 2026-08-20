import { Router } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import repositoriesRouter from "./repositories";
import conversationsRouter from "./conversations";
import statsRouter from "./stats";

const router = Router();

router.use("/health", healthRouter);
router.use("/auth", authRouter);
router.use("/repositories", repositoriesRouter);
router.use("/conversations", conversationsRouter);
router.use("/stats", statsRouter);

// 404 for unknown API routes
router.use((_req, res) => {
  res.status(404).json({ success: false, error: "Route not found" });
});

export default router;
