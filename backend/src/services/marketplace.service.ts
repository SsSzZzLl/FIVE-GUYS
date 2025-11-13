import { ethers } from "ethers";
import { loadMarketplaceListings, saveMarketplaceListings } from "../config/marketplaceStorage.js";
import { resolveMarketplaceAddress, resolveRpcUrl } from "../config/contracts.js";
import type {
  CreateMarketplaceListingInput,
  MarketplaceListing,
} from "../models/marketplace.model.js";
import { recordRankingEvent } from "./leaderboard.service.js";

const MARKETPLACE_ABI = [
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "uint256", name: "tokenId", type: "uint256" },
      { indexed: true, internalType: "address", name: "seller", type: "address" },
      { indexed: false, internalType: "uint256", name: "price", type: "uint256" },
    ],
    name: "Listed",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "uint256", name: "tokenId", type: "uint256" },
      { indexed: true, internalType: "address", name: "seller", type: "address" },
    ],
    name: "ListingCancelled",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, internalType: "uint256", name: "tokenId", type: "uint256" },
      { indexed: true, internalType: "address", name: "seller", type: "address" },
      { indexed: true, internalType: "address", name: "buyer", type: "address" },
      { indexed: false, internalType: "uint256", name: "price", type: "uint256" },
    ],
    name: "Sold",
    type: "event",
  },
  {
    inputs: [{ internalType: "uint256", name: "tokenId", type: "uint256" }],
    name: "isListed",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "tokenId", type: "uint256" }],
    name: "getListing",
    outputs: [
      {
        components: [
          { internalType: "address", name: "seller", type: "address" },
          { internalType: "uint256", name: "price", type: "uint256" },
          { internalType: "bool", name: "active", type: "bool" },
        ],
        internalType: "struct Marketplace.Listing",
        name: "",
        type: "tuple",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
] as const;

type ListingMap = Map<string, MarketplaceListing>;

const RARITY_INDEX: Record<string, number> = {
  COMMON: 0,
  RARE: 1,
  EPIC: 2,
  LEGENDARY: 3,
};

const listingsState: ListingMap = new Map();
let initializedPromise: Promise<void> | null = null;
let provider: ethers.JsonRpcProvider | null = null;
let marketplaceContract: ethers.Contract | null = null;
let lastReconcileAt = 0;

function toGtk(value: bigint | number): number {
  return typeof value === "number" ? value : Number(ethers.formatUnits(value, 18));
}

async function persistState(): Promise<void> {
  const snapshot = Array.from(listingsState.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
  await saveMarketplaceListings(snapshot);
}

function normaliseKey(tokenId?: string, id?: string): string | undefined {
  if (tokenId && tokenId.length > 0) {
    return tokenId;
  }
  if (id && id.length > 0) {
    return id;
  }
  return undefined;
}

function upsertListing(tokenId: string, patch: Partial<MarketplaceListing>): MarketplaceListing {
  const existing = listingsState.get(tokenId);
  const base: MarketplaceListing =
    existing ??
    ({
      id: tokenId,
      tokenId,
      seller: patch.seller ?? "",
      priceGtk: patch.priceGtk ?? 0,
      rarity: patch.rarity ?? "COMMON",
      name: patch.name ?? "",
      imageUri: patch.imageUri ?? "",
      createdAt: patch.createdAt ?? new Date().toISOString(),
      isSold: patch.isSold ?? false,
    } satisfies MarketplaceListing);

  const merged: MarketplaceListing = {
    ...base,
    ...patch,
    id: patch.id ?? base.id ?? tokenId,
    tokenId,
    isSold: patch.isSold ?? base.isSold ?? false,
  };

  listingsState.set(tokenId, merged);
  return merged;
}

async function getBlockTimestamp(log: ethers.EventLog): Promise<string> {
  if (!provider) {
    return new Date().toISOString();
  }
  const block = await provider.getBlock(log.blockNumber);
  if (!block) {
    return new Date().toISOString();
  }
  return new Date(Number(block.timestamp) * 1000).toISOString();
}

async function handleListed(log: ethers.EventLog, persist = true): Promise<void> {
  const tokenIdRaw = log.args?.tokenId ?? log.args?.[0];
  const sellerRaw = log.args?.seller ?? log.args?.[1];
  const priceRaw = log.args?.price ?? log.args?.[2];
  if (tokenIdRaw === undefined || sellerRaw === undefined || priceRaw === undefined) {
    return;
  }
  const tokenId = BigInt(tokenIdRaw).toString();
  const seller = String(sellerRaw);
  const priceGtk = toGtk(priceRaw as bigint);
  const timestamp = await getBlockTimestamp(log);

  upsertListing(tokenId, {
    seller,
    priceGtk,
    createdAt: timestamp,
    isSold: false,
  });

  if (persist) {
    await persistState();
  }
}

async function handleSold(log: ethers.EventLog, persist = true): Promise<void> {
  const tokenIdRaw = log.args?.tokenId ?? log.args?.[0];
  const sellerRaw = log.args?.seller ?? log.args?.[1];
  const buyerRaw = log.args?.buyer ?? log.args?.[2];
  const priceRaw = log.args?.price ?? log.args?.[3];

  if (tokenIdRaw === undefined || buyerRaw === undefined) {
    return;
  }

  const tokenId = BigInt(tokenIdRaw).toString();
  const priceGtk = priceRaw !== undefined ? toGtk(priceRaw as bigint) : undefined;
  const buyer = String(buyerRaw);
  const seller = sellerRaw !== undefined ? String(sellerRaw) : undefined;
  const timestamp = await getBlockTimestamp(log);

  const listing = upsertListing(tokenId, {
    isSold: true,
    buyer,
    soldTxHash: log.transactionHash,
    soldAt: timestamp,
  });

  if (priceGtk !== undefined) {
    listing.priceGtk = priceGtk;
  }
  if (seller && !listing.seller) {
    listing.seller = seller;
  }

  listingsState.set(tokenId, listing);

  if (persist) {
    await persistState();
  }

  const rarityIndex = RARITY_INDEX[listing.rarity] ?? 0;

  await Promise.allSettled([
    seller
      ? recordRankingEvent({
          address: seller,
          type: "sale",
          rarity: rarityIndex,
        })
      : Promise.resolve(),
    recordRankingEvent({
      address: buyer,
      type: "purchase",
      rarity: rarityIndex,
    }),
  ]);
}

async function handleCancelled(log: ethers.EventLog, persist = true): Promise<void> {
  const tokenIdRaw = log.args?.tokenId ?? log.args?.[0];
  const sellerRaw = log.args?.seller ?? log.args?.[1];
  if (tokenIdRaw === undefined) {
    return;
  }
  const tokenId = BigInt(tokenIdRaw).toString();
  const timestamp = await getBlockTimestamp(log);

  const listing = upsertListing(tokenId, {
    isSold: true,
    soldAt: timestamp,
    soldTxHash: log.transactionHash,
  });

  if (sellerRaw && !listing.buyer) {
    listing.buyer = String(sellerRaw);
  }

  listingsState.set(tokenId, listing);

  if (persist) {
    await persistState();
  }
}

async function reconcileActiveListings(force = false): Promise<void> {
  if (!marketplaceContract) {
    return;
  }
  const now = Date.now();
  if (!force && now - lastReconcileAt < 15_000) {
    return;
  }
  lastReconcileAt = now;

  let mutated = false;
  for (const listing of listingsState.values()) {
    if (listing.isSold) {
      continue;
    }
    try {
      const tokenId = BigInt(listing.tokenId);
      const stillActive = await marketplaceContract.isListed(tokenId);
      if (!stillActive) {
        upsertListing(listing.tokenId, {
          isSold: true,
          soldAt: new Date().toISOString(),
        });
        mutated = true;
      }
    } catch (error) {
      console.warn(`⚠️ Failed to reconcile listing ${listing.tokenId}`, error);
    }
  }

  if (mutated) {
    await persistState();
  }
}

async function syncFromChain(): Promise<void> {
  if (!marketplaceContract || !provider) {
    return;
  }

  const fromBlock = Number(process.env.MARKETPLACE_SYNC_FROM_BLOCK ?? "0");
  const latestBlock = await provider.getBlockNumber();

  const listedLogs = await marketplaceContract.queryFilter(
    marketplaceContract.filters.Listed(),
    fromBlock,
    latestBlock,
  );
  const soldLogs = await marketplaceContract.queryFilter(
    marketplaceContract.filters.Sold(),
    fromBlock,
    latestBlock,
  );
  const cancelledLogs = await marketplaceContract.queryFilter(
    marketplaceContract.filters.ListingCancelled(),
    fromBlock,
    latestBlock,
  );

  const allLogs = [...listedLogs, ...soldLogs, ...cancelledLogs].sort((a, b) => {
    if (a.blockNumber === b.blockNumber) {
      return Number(a.index ?? 0) - Number(b.index ?? 0);
    }
    return a.blockNumber - b.blockNumber;
  });

  if (allLogs.length === 0) {
    return;
  }

  for (const rawLog of allLogs) {
    const candidate = rawLog as unknown as Partial<ethers.EventLog>;
    const eventName = candidate.fragment?.name ?? candidate.eventName;
    if (!eventName || !candidate.args) {
      continue;
    }
    const log = candidate as ethers.EventLog;
    if (eventName === "Listed") {
      await handleListed(log, false);
    } else if (eventName === "Sold") {
      await handleSold(log, false);
    } else if (eventName === "ListingCancelled") {
      await handleCancelled(log, false);
    }
  }

  await persistState();
}

async function bootstrap(): Promise<void> {
  const stored = await loadMarketplaceListings();
  for (const item of stored) {
    const key = normaliseKey(item.tokenId, item.id);
    if (!key) {
      continue;
    }
    listingsState.set(key, {
      ...item,
      id: item.id ?? key,
      tokenId: item.tokenId ?? key,
    });
  }

  const marketplaceAddress = resolveMarketplaceAddress();
  if (!marketplaceAddress) {
    console.warn("⚠️ Marketplace address not configured. Event sync disabled.");
    return;
  }

  provider = new ethers.JsonRpcProvider(resolveRpcUrl());
  marketplaceContract = new ethers.Contract(marketplaceAddress, MARKETPLACE_ABI, provider);

  await syncFromChain();

  marketplaceContract.on("Listed", async (...args) => {
    const log = args[args.length - 1] as ethers.EventLog;
    await handleListed(log);
  });

  marketplaceContract.on("Sold", async (...args) => {
    const log = args[args.length - 1] as ethers.EventLog;
    await handleSold(log);
  });

  marketplaceContract.on("ListingCancelled", async (...args) => {
    const log = args[args.length - 1] as ethers.EventLog;
    await handleCancelled(log);
  });
}

async function ensureInitialized(): Promise<void> {
  if (!initializedPromise) {
    initializedPromise = bootstrap().catch((error) => {
      console.error("Failed to initialise marketplace sync", error);
    });
  }
  await initializedPromise;
}

export async function getMarketplaceListings(): Promise<MarketplaceListing[]> {
  await ensureInitialized();
  await reconcileActiveListings();
  return Array.from(listingsState.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

export async function createMarketplaceListing(
  input: CreateMarketplaceListingInput,
): Promise<MarketplaceListing> {
  await ensureInitialized();
  const tokenId = input.tokenId;
  const entry = upsertListing(tokenId, {
    ...input,
    id: tokenId,
    tokenId,
    isSold: listingsState.get(tokenId)?.isSold ?? false,
    createdAt: listingsState.get(tokenId)?.createdAt ?? new Date().toISOString(),
  });
  listingsState.set(tokenId, entry);
  await persistState();
  return entry;
}

export async function removeMarketplaceListing(
  _id: string,
  _seller: string,
): Promise<void> {
  throw new Error("Removing listings is disabled once published.");
}
