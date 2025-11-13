export type MarketplaceRarity = "COMMON" | "RARE" | "EPIC" | "LEGENDARY";

export interface MarketplaceAttribute {
  trait_type: string;
  value: string | number;
}

export interface MarketplaceMetadata {
  name: string;
  image: string;
  description?: string;
  attributes?: MarketplaceAttribute[];
}

export interface MarketplaceListing {
  id: string;
  tokenId: string;
  seller: string;
  priceGtk: number;
  rarity: MarketplaceRarity;
  name: string;
  imageUri: string;
  metadataUri?: string;
  metadata?: MarketplaceMetadata;
  createdAt: string;
  isSold?: boolean;
  buyer?: string;
  soldTxHash?: string;
  soldAt?: string;
  signature?: string;
  signedAt?: number;
}

export interface CreateMarketplaceListingInput {
  tokenId: string;
  seller: string;
  priceGtk: number;
  rarity: MarketplaceRarity;
  name: string;
  imageUri: string;
  metadataUri?: string;
  metadata?: MarketplaceMetadata;
  signature?: string;
  signedAt?: number;
}


