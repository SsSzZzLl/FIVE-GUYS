import { create } from "zustand";
import type { BlindBoxResult } from "@/types/nft";

type HistoryMap = Record<string, BlindBoxResult[]>;

interface DrawState {
  isDrawing: boolean;
  result?: BlindBoxResult;
  history: BlindBoxResult[];
  histories: HistoryMap;
  activeAddress?: string;
  setActiveAddress: (address?: string) => void;
  start: () => void;
  finish: (result: BlindBoxResult) => void;
  reset: () => void;
  clearAll: () => void;
}

function normalise(address?: string): string | undefined {
  if (!address) return undefined;
  return address.toLowerCase();
}

export const useDrawStore = create<DrawState>((set) => ({
  isDrawing: false,
  result: undefined,
  history: [],
  histories: {},
  activeAddress: undefined,
  setActiveAddress: (address) =>
    set((state) => {
      const key = normalise(address);
      if (!key) {
        return {
          activeAddress: undefined,
          history: [],
          result: undefined,
        };
      }
      const nextHistory = state.histories[key] ?? [];
      return {
        activeAddress: key,
        history: nextHistory,
        result: undefined,
      };
    }),
  start: () => set({ isDrawing: true, result: undefined }),
  finish: (result) =>
    set((state) => {
      const key = state.activeAddress;
      if (!key) {
        return {
          isDrawing: false,
          result,
        };
      }
      const existing = state.histories[key] ?? [];
      const deduped = existing.filter((item) => item.tokenId !== result.tokenId);
      const updated = [result, ...deduped].slice(0, 12);
      return {
        isDrawing: false,
        result,
        histories: {
          ...state.histories,
          [key]: updated,
        },
        history: updated,
      };
    }),
  reset: () => set({ isDrawing: false, result: undefined }),
  clearAll: () => set({ histories: {}, history: [], result: undefined }),
}));

