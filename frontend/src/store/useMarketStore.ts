import { create } from "zustand";
import type { MarketFilters } from "@/types/market";

const DEFAULT_FILTERS: MarketFilters = {
  rarity: "ALL",
  sortBy: "recent",
};

interface MarketState {
  filters: MarketFilters;
  setFilters: (filters: MarketFilters) => void;
}

export const useMarketStore = create<MarketState>((set) => ({
  filters: DEFAULT_FILTERS,
  setFilters: (filters) => set({ filters }),
}));

