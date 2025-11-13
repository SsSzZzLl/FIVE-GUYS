import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ethers } from "ethers";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function loadDeploymentAddress() {
  const defaultFile = path.join(
    __dirname,
    "..",
    "ignition",
    "deployments",
    "chain-11155111",
    "deployed_addresses.json",
  );

  if (!fs.existsSync(defaultFile)) {
    return undefined;
  }

  const raw = JSON.parse(fs.readFileSync(defaultFile, "utf8"));
  return raw["DeployAll#Step02_Deploy_NFTCollection"];
}

function loadAbi() {
  const artifactPath = path.join(
    __dirname,
    "..",
    "artifacts",
    "contracts",
    "NFTCollection.sol",
    "NFTCollection.json",
  );

  if (!fs.existsSync(artifactPath)) {
    throw new Error(`找不到 ABI 文件: ${artifactPath}`);
  }

  const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));
  return artifact.abi;
}

function parseTokenIds(total) {
  const explicit = process.env.NFT_CHECK_TOKEN_IDS;
  if (explicit && explicit.trim().length > 0) {
    return explicit
      .split(",")
      .map((value) => Number(value.trim()))
      .filter((value) => Number.isInteger(value) && value >= 0 && value < total);
  }

  const limit = Math.min(total, Number(process.env.NFT_CHECK_SAMPLE_COUNT ?? "5"));
  return Array.from({ length: limit }, (_, index) => index);
}

async function fetchMetadata(uri) {
  let resolved = uri;
  if (uri.startsWith("ipfs://")) {
    const gateway =
      process.env.IPFS_GATEWAY ??
      "https://nftstorage.link/ipfs";
    resolved = uri.replace("ipfs://", `${gateway.replace(/\/$/, "")}/`);
  }

  try {
    const response = await fetch(resolved);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.warn(`⚠️  Failed to fetch metadata from ${resolved}: ${String(error)}`);
    return undefined;
  }
}

async function main() {
  const rpcUrl =
    process.env.SEPOLIA_RPC_URL ??
    process.env.ALCHEMY_SEPOLIA_RPC_URL ??
    "https://ethereum-sepolia-rpc.publicnode.com";

  const provider = new ethers.JsonRpcProvider(rpcUrl);

  const defaultAddress = loadDeploymentAddress();
  const targetAddress = process.env.NFT_COLLECTION_ADDRESS ?? defaultAddress;

  if (!targetAddress) {
    throw new Error("无法确定 NFTCollection 地址。请设置 NFT_COLLECTION_ADDRESS 或更新部署文件。");
  }

  const abi = loadAbi();
  const nft = new ethers.Contract(targetAddress, abi, provider);

  const nextTokenId = Number(await nft.nextTokenId());
  console.log(`ℹ️  使用 RPC: ${rpcUrl}`);
  console.log(`ℹ️  NFTCollection 地址: ${targetAddress}`);
  console.log(`ℹ️  nextTokenId = ${nextTokenId}`);

  if (nextTokenId === 0) {
    console.log("🚫 尚未铸造任何 NFT。");
    return;
  }

  const tokenIds = parseTokenIds(nextTokenId);
  console.log(`ℹ️  将检查 tokenId: ${tokenIds.join(", ")}`);

  const reports = [];

  for (const tokenId of tokenIds) {
    let tokenUri;
    let attributes;
    let metadata;
    let owner;

    try {
      owner = await nft.ownerOf(tokenId);
      tokenUri = await nft.tokenURI(tokenId);
      attributes = await nft.getTokenAttributes(tokenId);
      metadata = await fetchMetadata(tokenUri);
    } catch (error) {
      console.warn(`⚠️  Failed to resolve token #${tokenId}: ${String(error)}`);
      continue;
    }

    const rarityAttr =
      metadata?.attributes &&
      Array.isArray(metadata.attributes) &&
      metadata.attributes.find?.((item) => {
        if (!item || typeof item !== "object") return false;
        const trait = String(item.trait_type ?? "").toLowerCase();
        return trait === "rarity";
      });

    reports.push({
      tokenId,
      tokenUri,
      name: metadata?.name ?? attributes?.name ?? "",
      rarity: rarityAttr?.value ?? attributes?.rarity ?? "",
      owner,
    });
  }

  console.table(
    reports.map((item) => ({
      tokenId: item.tokenId,
      tokenUri: item.tokenUri,
      owner: item.owner,
      name: item.name,
      rarity: item.rarity,
    })),
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

