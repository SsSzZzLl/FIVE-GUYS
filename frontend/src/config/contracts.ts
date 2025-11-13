import type { Address } from "viem";
import deploymentAddresses from "../../../ignition/deployments/chain-11155111/deployed_addresses.json" assert { type: "json" };

type DeploymentAddresses = Record<string, string>;

const deployed = deploymentAddresses as DeploymentAddresses;

const FALLBACK_ADDRESSES = {
  erc20Token: deployed["DeployAll#Step01_Deploy_ERC20Token"],
  nftCollection: deployed["DeployAll#Step02_Deploy_NFTCollection"],
  blindBox: deployed["DeployAll#Step03_Deploy_BlindBox"],
  tokenVendor: deployed["DeployAll#Step04_Deploy_TokenVendor"],
  cardSynthesis: deployed["DeployAll#Step05_Deploy_CardSynthesis"],
  marketplace: deployed["DeployAll#Step06_Deploy_Marketplace"],
} as const;

function asAddress(value: string | undefined): Address | undefined {
  if (!value) return undefined;
  return value.startsWith("0x") ? (value as Address) : undefined;
}

export const CONTRACTS = {
  erc20Token: asAddress(import.meta.env.VITE_ERC20_TOKEN_ADDRESS ?? FALLBACK_ADDRESSES.erc20Token),
  nftCollection: asAddress(import.meta.env.VITE_NFT_COLLECTION_ADDRESS ?? FALLBACK_ADDRESSES.nftCollection),
  blindBox: asAddress(import.meta.env.VITE_BLIND_BOX_ADDRESS ?? FALLBACK_ADDRESSES.blindBox),
  tokenVendor: asAddress(import.meta.env.VITE_TOKEN_VENDOR_ADDRESS ?? FALLBACK_ADDRESSES.tokenVendor),
  cardSynthesis: asAddress(import.meta.env.VITE_CARD_SYNTHESIS_ADDRESS ?? FALLBACK_ADDRESSES.cardSynthesis),
  marketplace: asAddress(import.meta.env.VITE_MARKETPLACE_ADDRESS ?? FALLBACK_ADDRESSES.marketplace),
} as const;

export type ContractName = keyof typeof CONTRACTS;

const ENV_VAR_NAMES: Record<ContractName, string> = {
  erc20Token: "VITE_ERC20_TOKEN_ADDRESS",
  nftCollection: "VITE_NFT_COLLECTION_ADDRESS",
  blindBox: "VITE_BLIND_BOX_ADDRESS",
  tokenVendor: "VITE_TOKEN_VENDOR_ADDRESS",
  cardSynthesis: "VITE_CARD_SYNTHESIS_ADDRESS",
  marketplace: "VITE_MARKETPLACE_ADDRESS",
};

export function requireContract(name: ContractName): Address {
  const address = CONTRACTS[name];
  if (!address) {
    throw new Error(`Missing contract address for ${name}. Set ${ENV_VAR_NAMES[name]} or update deployment data.`);
  }
  return address;
}
