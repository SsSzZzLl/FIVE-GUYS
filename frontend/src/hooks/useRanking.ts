import { useQuery } from "@tanstack/react-query";
import axios from "axios";

export interface RankingEntry {
  address: string;
  value: number;
  meta?: string;
}

interface RankingResponse {
  draws: RankingEntry[];
  profits: RankingEntry[];
  rarity: RankingEntry[];
}

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4100/api";

const emptyRanking: RankingResponse = { draws: [], profits: [], rarity: [] };

async function fetchRanking(): Promise<RankingResponse> {
  try {
    const response = await axios.get<RankingResponse>(`${API_BASE}/leaderboard`);
    return response.data ?? emptyRanking;
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 404) {
      console.info("Leaderboard API not found (404). Returning empty rankings.");
      return emptyRanking;
    }
    throw error;
  }
}

export function useRanking() {
  const query = useQuery({
    queryKey: ["ranking"],
    queryFn: fetchRanking,
    staleTime: 60_000,
    refetchInterval: 120_000,
  });

  return {
    draws: query.data?.draws ?? emptyRanking.draws,
    profits: query.data?.profits ?? emptyRanking.profits,
    rarity: query.data?.rarity ?? emptyRanking.rarity,
    ...query,
  };
}

