import path from "node:path";
import { fileURLToPath } from "node:url";
import fs from "fs-extra";
import type { MarketplaceListing } from "../models/marketplace.model.js";

const DEFAULT_RELATIVE_PATH = path.join("..", "storage", "marketplace.json");
const moduleDir = path.dirname(fileURLToPath(import.meta.url));

function resolveStoragePath(): string {
  const fromEnv = process.env.MARKETPLACE_STORAGE_PATH;
  if (fromEnv && fromEnv.trim().length > 0) {
    return path.resolve(process.cwd(), fromEnv);
  }
  return path.resolve(moduleDir, DEFAULT_RELATIVE_PATH);
}

const storagePath = resolveStoragePath();

async function ensureStorageFile(): Promise<void> {
  await fs.ensureFile(storagePath);
  const fileContent = await fs.readJson(storagePath).catch(() => null);
  if (!Array.isArray(fileContent)) {
    await fs.writeJson(storagePath, [], { spaces: 2 });
  }
}

export async function loadMarketplaceListings(): Promise<MarketplaceListing[]> {
  await ensureStorageFile();
  const data = await fs.readJson(storagePath).catch(() => []);
  if (!Array.isArray(data)) {
    return [];
  }
  return data as MarketplaceListing[];
}

export async function saveMarketplaceListings(listings: MarketplaceListing[]): Promise<void> {
  await ensureStorageFile();
  await fs.writeJson(storagePath, listings, { spaces: 2 });
}

export function getMarketplaceStorageLocation(): string {
  return storagePath;
}


