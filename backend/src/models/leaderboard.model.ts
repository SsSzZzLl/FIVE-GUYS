import { z } from "zod";

export const PlayerStatsSchema = z.object({
  address: z.string().min(1, "地址不能为空"),
  draws: z.number().int().nonnegative(),
  owned: z.number().int().nonnegative(),
  sales: z.number().int().nonnegative(),
  purchases: z.number().int().nonnegative(),
  fusions: z.number().int().nonnegative(),
  rarityPoints: z.number().int().nonnegative(),
  score: z.number().int().nonnegative(),
  updatedAt: z.string().datetime({ offset: true }),
});

export type PlayerStats = z.infer<typeof PlayerStatsSchema>;

export const RankingEventSchema = z.object({
  address: z.string().min(1, "地址不能为空"),
  type: z.enum(["draw", "purchase", "sale", "fusion"]),
  rarity: z.number().int().nonnegative().optional(),
  targetRarity: z.number().int().nonnegative().optional(),
  success: z.boolean().optional(),
});

export type RankingEvent = z.infer<typeof RankingEventSchema>;


