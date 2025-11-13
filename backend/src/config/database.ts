import path from "node:path";
import { fileURLToPath } from "node:url";
import fs from "fs-extra";
import type { PlayerStats } from "../models/leaderboard.model.js";

const DEFAULT_RELATIVE_PATH = path.join("..", "storage", "leaderboard.json");
const STORE_VERSION = 1;

interface LeaderboardStore {
  version: number;
  namespaces: Record<string, PlayerStats[]>;
}

const moduleDir = path.dirname(fileURLToPath(import.meta.url));

function resolveStoragePath(): string {
  const fromEnv = process.env.LEADERBOARD_STORAGE_PATH;
  if (fromEnv && fromEnv.trim().length > 0) {
    return path.resolve(process.cwd(), fromEnv);
  }

  return path.resolve(moduleDir, DEFAULT_RELATIVE_PATH);
}

const storagePath = resolveStoragePath();

function resolveNamespace(): string {
  const namespaceCandidates = [
    process.env.LEADERBOARD_NAMESPACE,
    process.env.BLINDBOX_ADDRESS,
    process.env.NFT_COLLECTION_ADDRESS,
  ];

  for (const candidate of namespaceCandidates) {
    if (candidate && candidate.trim().length > 0) {
      return candidate.trim().toLowerCase();
    }
  }

  return "default";
}

async function ensureStorageFile(): Promise<void> {
  await fs.ensureFile(storagePath);
  const fileContent = await fs.readJson(storagePath).catch(() => null);
  if (!fileContent) {
    const initial: LeaderboardStore = { version: STORE_VERSION, namespaces: {} };
    await fs.writeJson(storagePath, initial, { spaces: 2 });
  }
}

function normalizeStatsEntry(entry: any): PlayerStats | null {
  if (!entry) return null;

  if (typeof entry.address === "string") {
    return {
      address: entry.address,
      draws: Number(entry.draws ?? 0),
      owned: Number(entry.owned ?? 0),
      sales: Number(entry.sales ?? 0),
      purchases: Number(entry.purchases ?? 0),
      fusions: Number(entry.fusions ?? 0),
      rarityPoints: Number(entry.rarityPoints ?? 0),
      score: Number(entry.score ?? 0),
      updatedAt: typeof entry.updatedAt === "string" ? entry.updatedAt : new Date().toISOString(),
    };
  }

  if (typeof entry.playerId === "string") {
    return {
      address: entry.playerId,
      draws: 0,
      owned: 0,
      sales: 0,
      purchases: 0,
      fusions: 0,
      rarityPoints: 0,
      score: Number(entry.score ?? 0),
      updatedAt: typeof entry.updatedAt === "string" ? entry.updatedAt : new Date().toISOString(),
    };
  }

  if (typeof entry === "string") {
    return {
      address: entry,
      draws: 0,
      owned: 0,
      sales: 0,
      purchases: 0,
      fusions: 0,
      rarityPoints: 0,
      score: 0,
      updatedAt: new Date().toISOString(),
    };
  }

  return null;
}

async function readStore(): Promise<LeaderboardStore> {
  await ensureStorageFile();
  const raw = await fs.readJson(storagePath).catch(() => null);

  if (!raw) {
    return { version: STORE_VERSION, namespaces: {} };
  }

  if (Array.isArray(raw)) {
    const normalized = raw
      .map((item) => normalizeStatsEntry(item))
      .filter((item): item is PlayerStats => item !== null);
    return { version: STORE_VERSION, namespaces: { default: normalized } };
  }

  if (typeof raw === "object" && raw !== null) {
    const version =
      typeof raw.version === "number" && Number.isFinite(raw.version) ? raw.version : STORE_VERSION;
    const namespaces = typeof raw.namespaces === "object" && raw.namespaces !== null ? raw.namespaces : {};

    // 兼容旧格式：文件根节点可能直接是数组
    if (Array.isArray(raw.default) && !namespaces.default) {
      namespaces.default = raw.default
        .map((item: unknown) => normalizeStatsEntry(item))
        .filter((item: PlayerStats | null): item is PlayerStats => item !== null);
    }

    return {
      version,
      namespaces,
    } as LeaderboardStore;
  }

  return { version: STORE_VERSION, namespaces: {} };
}

async function writeStore(store: LeaderboardStore): Promise<void> {
  const snapshot: LeaderboardStore = {
    version: STORE_VERSION,
    namespaces: store.namespaces,
  };
  await fs.writeJson(storagePath, snapshot, { spaces: 2 });
}

export async function loadLeaderboard(): Promise<PlayerStats[]> {
  const store = await readStore();
  const namespace = resolveNamespace();
  const entries = store.namespaces?.[namespace];
  if (Array.isArray(entries) && entries.length > 0) {
    return entries as PlayerStats[];
  }
  return [];
}

export async function saveLeaderboard(entries: PlayerStats[]): Promise<void> {
  const store = await readStore();
  const namespace = resolveNamespace();
  store.namespaces[namespace] = entries;
  await writeStore(store);
}

export function getStorageLocation(): string {
  return storagePath;
}

