export type Rarity = "COMMON" | "RARE" | "EPIC" | "LEGENDARY";

export const RARITY_STYLE_MAP: Record<
  Rarity,
  { label: string; borderColor: string; glow: string; color: string; score: number }
> = {
  COMMON: {
    label: "Common",
    borderColor: "border-white/20",
    glow: "",
    color: "text-white",
    score: 1,
  },
  RARE: {
    label: "Rare",
    borderColor: "border-sky-400/60",
    glow: "shadow-[0_0_25px_rgba(100,200,255,0.45)]",
    color: "text-sky-300",
    score: 2,
  },
  EPIC: {
    label: "Epic",
    borderColor: "border-purple-400/60",
    glow: "shadow-[0_0_30px_rgba(180,120,255,0.5)]",
    color: "text-purple-300",
    score: 3,
  },
  LEGENDARY: {
    label: "Legendary",
    borderColor: "border-amber-300/70",
    glow: "shadow-[0_0_35px_rgba(255,220,120,0.55)]",
    color: "text-amber-200",
    score: 4,
  },
};

export const RARITY_OPTIONS = [
  { value: "COMMON", label: "Common" },
  { value: "RARE", label: "Rare" },
  { value: "EPIC", label: "Epic" },
  { value: "LEGENDARY", label: "Legendary" },
] as const;

const RARITY_VALUES: Rarity[] = ["COMMON", "RARE", "EPIC", "LEGENDARY"];

export const RARITY_RANK: Record<Rarity, number> = {
  COMMON: 0,
  RARE: 1,
  EPIC: 2,
  LEGENDARY: 3,
};

export function rarityFromIndex(index: number): Rarity {
  return RARITY_VALUES[index] ?? "COMMON";
}

export function rarityToIndex(rarity: Rarity): number {
  return RARITY_VALUES.indexOf(rarity);
}

export function rarityFromLabel(label: string | number | undefined): Rarity {
  if (typeof label === "number") {
    return rarityFromIndex(label);
  }
  if (!label) {
    return "COMMON";
  }
  const normalized = String(label).trim().toUpperCase();
  switch (normalized) {
    case "COMMON":
      return "COMMON";
    case "RARE":
      return "RARE";
    case "EPIC":
      return "EPIC";
    case "LEGENDARY":
      return "LEGENDARY";
    default:
      return "COMMON";
  }
}

