import type { Rarity } from "@/utils/rarity";

export interface MetadataAttribute {
  trait_type: string;
  value: string | number;
}

export interface CardMetadata {
  name: string;
  description?: string;
  image: string;
  animation_url?: string | null;
  external_url?: string | null;
  attributes: MetadataAttribute[];
}

export interface OwnedCard {
  tokenId: bigint;
  metadata: CardMetadata;
  rarity: Rarity;
  tokenUri: string;
}

export interface BlindBoxResult {
  tokenId: bigint;
  metadata: CardMetadata;
  rarity: Rarity;
  txHash?: `0x${string}`;
}

