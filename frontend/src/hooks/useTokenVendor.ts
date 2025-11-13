import { useCallback } from "react";
import {
  useAccount,
  usePublicClient,
  useReadContract,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi";
import { TokenVendorAbi } from "@/abi/TokenVendor";
import { requireContract } from "@/config/contracts";
import { SUPPORTED_CHAINS } from "@/config/chains";

export function useTokenVendor() {
  const { address } = useAccount();
  const vendorAddress = requireContract("tokenVendor");
  const publicClient = usePublicClient({ chainId: SUPPORTED_CHAINS[0].id })!;

  const {
    data: tokensPerEth,
    refetch: refetchTokensPerEth,
  } = useReadContract({
    address: vendorAddress,
    abi: TokenVendorAbi,
    functionName: "tokensPerEth",
  });

  const { writeContractAsync, data: pendingHash, isPending } = useWriteContract();
  const { isLoading: isConfirming } = useWaitForTransactionReceipt({
    hash: pendingHash,
    query: { enabled: Boolean(pendingHash) },
  });

  const buyTokens = useCallback(
    async (ethValue: bigint) => {
      if (!address) throw new Error("Wallet not connected");
      if (ethValue <= 0n) throw new Error("ETH amount must be greater than 0");

      const gasLimit = await publicClient.estimateContractGas({
        address: vendorAddress,
        abi: TokenVendorAbi,
        functionName: "buyTokens",
        account: address,
        value: ethValue,
      });

      const hash = await writeContractAsync({
        address: vendorAddress,
        abi: TokenVendorAbi,
        functionName: "buyTokens",
        gas: gasLimit,
        value: ethValue,
      });

      await publicClient.waitForTransactionReceipt({ hash });
      await refetchTokensPerEth();
      return hash;
    },
    [address, publicClient, refetchTokensPerEth, vendorAddress, writeContractAsync],
  );

  return {
    tokensPerEth: tokensPerEth ?? 0n,
    isProcessing: isPending || isConfirming,
    buyTokens,
  };
}

