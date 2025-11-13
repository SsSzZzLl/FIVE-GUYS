import type { Request, Response } from "express";
import {
  createMarketplaceListing,
  getMarketplaceListings,
  removeMarketplaceListing,
} from "../services/marketplace.service.js";
import type { CreateMarketplaceListingInput } from "../models/marketplace.model.js";

function parseListingInput(body: unknown): CreateMarketplaceListingInput {
  if (!body || typeof body !== "object") {
    throw new Error("Invalid payload");
  }

  const payload = body as Partial<CreateMarketplaceListingInput>;

  if (!payload.tokenId || typeof payload.tokenId !== "string") {
    throw new Error("tokenId is required");
  }

  if (!payload.seller || typeof payload.seller !== "string") {
    throw new Error("seller is required");
  }

  if (typeof payload.priceGtk !== "number" || Number.isNaN(payload.priceGtk) || payload.priceGtk < 0) {
    throw new Error("priceGtk must be a positive number");
  }

  if (!payload.rarity || !["COMMON", "RARE", "EPIC", "LEGENDARY"].includes(payload.rarity)) {
    throw new Error("rarity is invalid");
  }

  if (!payload.name || typeof payload.name !== "string") {
    throw new Error("name is required");
  }

  if (!payload.imageUri || typeof payload.imageUri !== "string") {
    throw new Error("imageUri is required");
  }

  const signature =
    typeof payload.signature === "string" && payload.signature.length > 0
      ? payload.signature
      : undefined;
  const signedAt =
    typeof payload.signedAt === "number" && Number.isFinite(payload.signedAt)
      ? payload.signedAt
      : undefined;

  return {
    tokenId: payload.tokenId,
    seller: payload.seller,
    priceGtk: payload.priceGtk,
    rarity: payload.rarity,
    name: payload.name,
    imageUri: payload.imageUri,
    metadataUri:
      typeof payload.metadataUri === "string" && payload.metadataUri.length > 0
        ? payload.metadataUri
        : undefined,
    metadata: payload.metadata,
    signature,
    signedAt,
  };
}

export async function listMarketplace(req: Request, res: Response): Promise<void> {
  const data = await getMarketplaceListings();
  res.json({ listings: data });
}

export async function createMarketplace(req: Request, res: Response): Promise<void> {
  try {
    const input = parseListingInput(req.body);
    const created = await createMarketplaceListing(input);
    res.status(201).json(created);
  } catch (error) {
    res.status(400).json({
      message: error instanceof Error ? error.message : "Invalid payload",
    });
  }
}

export async function deleteMarketplace(req: Request, res: Response): Promise<void> {
  const { id } = req.params;
  const seller =
    typeof req.query.seller === "string" && req.query.seller.length > 0
      ? req.query.seller
      : undefined;

  if (!seller) {
    res.status(400).json({ message: "seller query parameter is required" });
    return;
  }

  try {
    await removeMarketplaceListing(id, seller);
    res.status(204).send();
  } catch (error) {
    if (error instanceof Error && error.message === "Listing not found") {
      res.status(404).json({ message: error.message });
      return;
    }
    if (error instanceof Error && error.message.includes("disabled")) {
      res.status(403).json({ message: error.message });
      return;
    }
    if (error instanceof Error && error.message === "Forbidden") {
      res.status(403).json({ message: "You can only remove your own listings" });
      return;
    }
    res.status(500).json({ message: "Failed to remove listing" });
  }
}

export async function purchaseMarketplace(_req: Request, res: Response): Promise<void> {
  res.status(410).json({
    message:
      "Purchases must be completed on-chain via Marketplace.buyCard. This endpoint is deprecated.",
  });
}


