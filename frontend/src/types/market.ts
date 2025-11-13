import type { CardMetadata } from "@/types/nft";
import type { Rarity } from "@/utils/rarity";

export interface MarketListing {
  id: string;
  tokenId: string;
  seller: string;
  priceGtk: number;
  rarity: Rarity;
  name: string;
  imageUri: string;
  metadataUri?: string;
  metadata?: CardMetadata;
  createdAt: string;
  isSold?: boolean;
  buyer?: string;
  soldTxHash?: string;
  soldAt?: string;
  signature?: string;
  signedAt?: number;
}

export interface MarketFilters {
  rarity?: Rarity | "ALL";
  minPrice?: number;
  maxPrice?: number;
  sortBy: "recent" | "priceAsc" | "priceDesc" | "rarity";
}

export interface CreateListingPayload {
  tokenId: string;
  priceGtk: number;
  rarity: Rarity;
  name: string;
  imageUri: string;
  metadataUri?: string;
  metadata?: CardMetadata;
}

