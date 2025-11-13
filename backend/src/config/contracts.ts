import path from "node:path";
import { fileURLToPath } from "node:url";
import fs from "fs-extra";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DEPLOYMENT_FILE = path.resolve(
  __dirname,
  "..",
  "..",
  "..",
  "ignition",
  "deployments",
  "chain-11155111",
  "deployed_addresses.json",
);

type DeploymentMap = Record<string, string>;

let cachedDeployments: DeploymentMap | null = null;

function loadDeployments(): DeploymentMap {
  if (cachedDeployments) {
    return cachedDeployments;
  }

  if (!fs.existsSync(DEPLOYMENT_FILE)) {
    cachedDeployments = {};
    return cachedDeployments;
  }

  try {
    const json = fs.readJsonSync(DEPLOYMENT_FILE) as DeploymentMap;
    cachedDeployments = json ?? {};
  } catch {
    cachedDeployments = {};
  }

  return cachedDeployments;
}

function resolveFromDeployment(key: string): string | undefined {
  const deployments = loadDeployments();
  const value = deployments[key];
  if (typeof value === "string" && value.startsWith("0x")) {
    return value;
  }
  return undefined;
}

export function resolveMarketplaceAddress(): string | undefined {
  return (
    process.env.MARKETPLACE_ADDRESS ??
    resolveFromDeployment("DeployAll#Step06_Deploy_Marketplace")
  );
}

export function resolveErc20Address(): string | undefined {
  return process.env.ERC20_TOKEN_ADDRESS ?? resolveFromDeployment("DeployAll#Step01_Deploy_ERC20Token");
}

export function resolveNftCollectionAddress(): string | undefined {
  return (
    process.env.NFT_COLLECTION_ADDRESS ??
    resolveFromDeployment("DeployAll#Step02_Deploy_NFTCollection")
  );
}

export function resolveRpcUrl(): string {
  return (
    process.env.SEPOLIA_RPC_URL ??
    process.env.RPC_URL ??
    "https://ethereum-sepolia-rpc.publicnode.com"
  );
}

