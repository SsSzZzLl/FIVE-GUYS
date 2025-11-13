import { loadLeaderboard, saveLeaderboard } from "../config/database.js";
import type { PlayerStats, RankingEvent } from "../models/leaderboard.model.js";

const MAX_DEFAULT_LIMIT = 100;
const RARITY_WEIGHTS = [1, 4, 9, 16];

function rarityWeight(index?: number): number {
  if (index === undefined || Number.isNaN(index)) return 0;
  return RARITY_WEIGHTS[index] ?? 0;
}

function createPlayerStats(address: string): PlayerStats {
  return {
    address,
    draws: 0,
    owned: 0,
    sales: 0,
    purchases: 0,
    fusions: 0,
    rarityPoints: 0,
    score: 0,
    updatedAt: new Date().toISOString(),
  };
}

function computeScore(stats: PlayerStats): number {
  const base =
    stats.owned * 10 +
    stats.rarityPoints * 3 +
    stats.draws * 2 +
    stats.purchases * 4;
  const penalty = stats.sales * 4 + stats.fusions;
  const score = base - penalty;
  return score > 0 ? score : 0;
}

function applyEvent(stats: PlayerStats, event: RankingEvent): void {
  const now = new Date().toISOString();
  const rarityValue = rarityWeight(event.rarity);

  switch (event.type) {
    case "draw":
      stats.draws += 1;
      stats.owned += 1;
      stats.rarityPoints += rarityValue;
      break;
    case "purchase":
      stats.purchases += 1;
      stats.owned += 1;
      stats.rarityPoints += rarityValue;
      break;
    case "sale":
      stats.sales += 1;
      if (stats.owned > 0) stats.owned -= 1;
      if (rarityValue > 0) {
        stats.rarityPoints = Math.max(0, stats.rarityPoints - rarityValue);
      }
      break;
    case "fusion": {
      stats.fusions += 1;
      const consumedWeight = rarityWeight(event.rarity) * 5;
      if (consumedWeight > 0) {
        stats.rarityPoints = Math.max(0, stats.rarityPoints - consumedWeight);
      }
      stats.owned = stats.owned >= 5 ? stats.owned - 5 : 0;
      stats.owned += 1;
      const outputWeight = rarityWeight(event.targetRarity ?? event.rarity);
      stats.rarityPoints += outputWeight;
      break;
    }
    default:
      break;
  }

  stats.score = computeScore(stats);
  stats.updatedAt = now;
}

function sanitiseLimit(limit?: number): number {
  if (limit === undefined || Number.isNaN(limit)) return MAX_DEFAULT_LIMIT;
  return Math.min(Math.max(limit, 1), MAX_DEFAULT_LIMIT);
}

export async function recordRankingEvent(event: RankingEvent): Promise<PlayerStats> {
  const addressLower = event.address.toLowerCase();
  const stats = await loadLeaderboard();
  let entry = stats.find((item) => item.address.toLowerCase() === addressLower);

  if (!entry) {
    entry = createPlayerStats(addressLower);
    stats.push(entry);
  }

  applyEvent(entry, event);
  await saveLeaderboard(stats);
  return entry;
}

export interface RankingEntryView {
  address: string;
  value: number;
  meta?: string;
}

export interface RankingSummary {
  draws: RankingEntryView[];
  profits: RankingEntryView[];
  rarity: RankingEntryView[];
}

function toRankingEntry(
  stats: PlayerStats,
  value: number,
  meta?: string,
): RankingEntryView {
  return {
    address: stats.address,
    value,
    meta,
  };
}

export async function getRankingSummary(limit?: number): Promise<RankingSummary> {
  const stats = await loadLeaderboard();
  const capped = sanitiseLimit(limit);

  const draws = [...stats]
    .sort((a, b) => b.draws - a.draws)
    .slice(0, capped)
    .map((item) => toRankingEntry(item, item.draws, `Score: ${item.score}`));

  const profits = [...stats]
    .sort((a, b) => b.score - a.score)
    .slice(0, capped)
    .map((item) => toRankingEntry(item, item.score, `Owned: ${item.owned}`));

  const rarity = [...stats]
    .sort((a, b) => b.rarityPoints - a.rarityPoints)
    .slice(0, capped)
    .map((item) =>
      toRankingEntry(item, item.rarityPoints, `Draws: ${item.draws}, Fusions: ${item.fusions}`),
    );

  return {
    draws,
    profits,
    rarity,
  };
}

export async function clearLeaderboard(): Promise<void> {
  await saveLeaderboard([]);
}

export async function getAllPlayerStats(): Promise<PlayerStats[]> {
  return loadLeaderboard();
}

