import axios from "axios";
import type { Rarity } from "@/utils/rarity";
import { rarityFromLabel, rarityToIndex } from "@/utils/rarity";

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4100/api";

export type RankingEventType = "draw" | "purchase" | "sale" | "fusion";

export interface RankingEventPayload {
  address: string;
  type: RankingEventType;
  rarity?: number;
  targetRarity?: number;
  success?: boolean;
}

export async function postRankingEvent(payload: RankingEventPayload): Promise<void> {
  try {
    await axios.post(`${API_BASE}/leaderboard/events`, payload);
  } catch (error) {
    console.error("Failed to post ranking event", error);
  }
}

export function rarityToScoreIndex(value: Rarity | string | number | undefined): number {
  if (typeof value === "number") return value;
  const normalized = rarityFromLabel(value);
  return rarityToIndex(normalized);
}


