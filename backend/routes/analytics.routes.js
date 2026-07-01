
import { Router } from "express";
import { getProgress, getSummary, getHeatmap } from "../controllers/analytics.controller.js";
import { authenticate } from "../middleware/auth.middleware.js";

const router = Router();

router.use(authenticate);

router.get("/progress", getProgress);
router.get("/summary",  getSummary);
router.get("/heatmap",  getHeatmap);

export default router;
