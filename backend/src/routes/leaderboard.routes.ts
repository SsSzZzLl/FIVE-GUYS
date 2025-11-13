import { Router } from "express";
import {
  handleGetLeaderboard,
  handleRankingEvent,
  handleResetLeaderboard,
} from "../controllers/leaderboard.controller.js";

const router = Router();

router.get("/", handleGetLeaderboard);
router.post("/events", handleRankingEvent);
router.delete("/", handleResetLeaderboard);

export default router;

