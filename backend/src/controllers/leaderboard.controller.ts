import type { Request, Response } from "express";
import { z } from "zod";
import {
  clearLeaderboard,
  getRankingSummary,
  recordRankingEvent,
} from "../services/leaderboard.service.js";
import { RankingEventSchema } from "../models/leaderboard.model.js";

const QuerySchema = z.object({
  limit: z
    .string()
    .transform((value) => Number.parseInt(value, 10))
    .refine((value) => !Number.isNaN(value) && value > 0, "limit 必须是正整数")
    .optional(),
});

export async function handleGetLeaderboard(req: Request, res: Response): Promise<void> {
  const parseResult = QuerySchema.safeParse(req.query);
  if (!parseResult.success) {
    res.status(400).json({
      message: "查询参数无效",
      issues: parseResult.error.flatten().fieldErrors,
    });
    return;
  }

  const { limit } = parseResult.data;
  const summary = await getRankingSummary(limit);
  res.json(summary);
}

export async function handleRankingEvent(req: Request, res: Response): Promise<void> {
  const parseResult = RankingEventSchema.safeParse(req.body);

  if (!parseResult.success) {
    res.status(400).json({
      message: "提交数据不合法",
      issues: parseResult.error.flatten().fieldErrors,
    });
    return;
  }

  const entry = await recordRankingEvent(parseResult.data);
  res.status(201).json({ data: entry });
}

export async function handleResetLeaderboard(_req: Request, res: Response): Promise<void> {
  await clearLeaderboard();
  res.status(204).end();
}

