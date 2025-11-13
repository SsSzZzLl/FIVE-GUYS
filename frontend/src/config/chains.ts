import type { Transport } from "viem";
import { fallback, http } from "viem";
import { sepolia } from "wagmi/chains";

const rpcCandidates = [
  import.meta.env.VITE_RPC_URL?.trim(),
  "https://ethereum-sepolia-rpc.publicnode.com",
  "https://rpc.sepolia.org",
  "https://sepolia.gateway.tenderly.co",
].filter(Boolean) as string[];

export const SUPPORTED_CHAINS = [sepolia] as const;

export const transports: Record<(typeof SUPPORTED_CHAINS)[number]["id"], Transport> = {
  [sepolia.id]: fallback(
    rpcCandidates.map((url) =>
      http(url, {
        timeout: 10_000,
        retryCount: 2,
        retryDelay: 500,
      }),
    ),
  ),
};

