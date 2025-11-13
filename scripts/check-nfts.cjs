/* eslint-disable @typescript-eslint/no-var-requires */
const fs = require("node:fs");
const path = require("node:path");

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
  const { ethers } = require("hardhat");

  const defaultAddress = loadDeploymentAddress();
  const targetAddress = (process.env.NFT_COLLECTION_ADDRESS ?? defaultAddress) ?? "";

  if (!targetAddress) {
    throw new Error(
      "无法确定 NFTCollection 地址。请设置 NFT_COLLECTION_ADDRESS 环境变量或确保 Ignition 部署记录存在。",
    );
  }

  console.log(`ℹ️  使用 NFTCollection 地址: ${targetAddress}`);

  const nft = await ethers.getContractAt("NFTCollection", targetAddress);

  const nextTokenId = Number(await nft.nextTokenId());
  console.log(`ℹ️  合约当前 nextTokenId = ${nextTokenId}`);

  if (nextTokenId === 0) {
    console.log("🚫 尚未铸造任何 NFT。");
    return;
  }

  const tokenIds = parseTokenIds(nextTokenId);
  console.log(`ℹ️  将检查 tokenId: ${tokenIds.join(", ")}`);

  const reports = [];

  for (const tokenId of tokenIds) {
    const tokenUri = await nft.tokenURI(tokenId);
    const attributes = await nft.getTokenAttributes(tokenId);
    const metadata = await fetchMetadata(tokenUri);

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
    });
  }

  console.table(reports);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

