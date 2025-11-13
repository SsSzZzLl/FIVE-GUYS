import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ethers } from "ethers";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DEPLOYMENT_FILE = path.resolve(
  __dirname,
  "..",
  "ignition",
  "deployments",
  "chain-11155111",
  "deployed_addresses.json",
);

function loadDeployments() {
  if (!fs.existsSync(DEPLOYMENT_FILE)) {
    return {};
  }

  try {
    const raw = fs.readFileSync(DEPLOYMENT_FILE, "utf8");
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function resolveAddress(key) {
  const deployments = loadDeployments();
  const value = deployments[key];
  if (typeof value === "string" && value.startsWith("0x")) {
    return value;
  }
  return undefined;
}

function resolveRpcUrl() {
  return (
    process.env.SEPOLIA_RPC_URL ??
    process.env.RPC_URL ??
    "https://ethereum-sepolia-rpc.publicnode.com"
  );
}

function parseTokenIds(fallback) {
  const explicit = process.env.MARKETPLACE_TOKEN_IDS;
  if (!explicit || explicit.trim().length === 0) {
    return fallback;
  }
  return Array.from(
    new Set(
      explicit
        .split(",")
        .map((value) => value.trim())
        .map((value) => {
          try {
            return BigInt(value);
          } catch {
            return undefined;
          }
        })
        .filter((value) => value !== undefined),
    ),
  );
}

const MARKETPLACE_ABI = [
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
  {
    inputs: [{ internalType: "uint256", name: "tokenId", type: "uint256" }],
    name: "isListed",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

const NFT_ABI = [
  {
    inputs: [{ internalType: "uint256", name: "tokenId", type: "uint256" }],
    name: "ownerOf",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

async function discoverListedTokenIds(contract) {
  const logs = await contract.queryFilter(contract.filters.Listed());
  const tokenIds = new Set();
  for (const log of logs) {
    const tokenId = log.args?.tokenId ?? log.args?.[0];
    if (tokenId !== undefined) {
      tokenIds.add(BigInt(tokenId));
    }
  }
  return Array.from(tokenIds).sort((a, b) => (a < b ? -1 : 1));
}

async function main() {
  const marketplaceAddress =
    process.env.MARKETPLACE_ADDRESS ?? resolveAddress("DeployAll#Step06_Deploy_Marketplace");
  const nftAddress =
    process.env.NFT_COLLECTION_ADDRESS ?? resolveAddress("DeployAll#Step02_Deploy_NFTCollection");

  if (!marketplaceAddress || !nftAddress) {
    throw new Error("Unable to resolve Marketplace or NFTCollection address.");
  }

  const provider = new ethers.JsonRpcProvider(resolveRpcUrl());
  const marketplace = new ethers.Contract(marketplaceAddress, MARKETPLACE_ABI, provider);
  const nft = new ethers.Contract(nftAddress, NFT_ABI, provider);

  const discovered = await discoverListedTokenIds(marketplace);
  const tokenIds = parseTokenIds(discovered);
  if (tokenIds.length === 0) {
    console.log("ℹ️  No listings discovered.");
    return;
  }

  const reports = [];

  for (const tokenId of tokenIds) {
    try {
      const [listing, owner] = await Promise.all([
        marketplace.getListing(tokenId),
        nft.ownerOf(tokenId).catch(() => undefined),
      ]);

      reports.push({
        tokenId: tokenId.toString(),
        seller: listing.seller,
        priceGtk: Number(ethers.formatUnits(listing.price ?? 0n, 18)),
        active: Boolean(listing.active),
        owner: owner ?? "Burned / Unknown",
      });
    } catch (error) {
      reports.push({
        tokenId: tokenId.toString(),
        error: String(error),
      });
    }
  }

  console.table(reports);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

