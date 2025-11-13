import { useCallback, useMemo } from "react";
import {
  useAccount,
  usePublicClient,
  useWaitForTransactionReceipt,
  useWriteContract,
  useReadContract,
} from "wagmi";
import { decodeEventLog } from "viem";
import { CardSynthesisAbi } from "@/abi/CardSynthesis";
import { ERC20Abi } from "@/abi/ERC20";
import { NFTCollectionAbi } from "@/abi/NFTCollection";
import { requireContract } from "@/config/contracts";
import { SUPPORTED_CHAINS } from "@/config/chains";
import { postRankingEvent } from "@/utils/ranking";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

export function useCardSynthesis() {
  const { address } = useAccount();
  const effectiveAddress = address ?? ZERO_ADDRESS;
  const publicClient = usePublicClient({ chainId: SUPPORTED_CHAINS[0].id })!;

  const cardSynthesisAddress = requireContract("cardSynthesis");
  const erc20Address = requireContract("erc20Token");
  const nftCollectionAddress = requireContract("nftCollection");

  const { data: synthesisFeeRaw } = useReadContract({
    address: cardSynthesisAddress,
    abi: CardSynthesisAbi,
    functionName: "SYNTHESIS_FEE",
  });

  const synthesisFee = useMemo(() => synthesisFeeRaw ?? 0n, [synthesisFeeRaw]);

  const {
    data: allowanceRaw,
    refetch: refetchAllowance,
  } = useReadContract({
    address: erc20Address,
    abi: ERC20Abi,
    functionName: "allowance",
    args: [effectiveAddress, cardSynthesisAddress],
  });

  const {
    data: gtkBalanceRaw,
    refetch: refetchGtkBalance,
  } = useReadContract({
    address: erc20Address,
    abi: ERC20Abi,
    functionName: "balanceOf",
    args: [effectiveAddress],
  });

  const {
    data: approvedForAllRaw,
    refetch: refetchApproval,
  } = useReadContract({
    address: nftCollectionAddress,
    abi: NFTCollectionAbi,
    functionName: "isApprovedForAll",
    args: [effectiveAddress, cardSynthesisAddress],
  });

  const allowance = allowanceRaw ?? 0n;
  const gtkBalance = gtkBalanceRaw ?? 0n;
  const isApprovedForAll = Boolean(approvedForAllRaw);

  const { writeContractAsync, data: pendingHash, isPending } = useWriteContract();
  const { isLoading: isConfirming } = useWaitForTransactionReceipt({
    hash: pendingHash,
    query: { enabled: Boolean(pendingHash) },
  });

  const approveGtk = useCallback(async () => {
    if (!address) throw new Error("Wallet not connected");
    if (synthesisFee === 0n) throw new Error("Synthesis fee unavailable");

    const hash = await writeContractAsync({
      address: erc20Address,
      abi: ERC20Abi,
      functionName: "approve",
      args: [cardSynthesisAddress, synthesisFee],
    });
    await publicClient.waitForTransactionReceipt({ hash });
    await refetchAllowance();
  }, [address, cardSynthesisAddress, erc20Address, publicClient, refetchAllowance, synthesisFee, writeContractAsync]);

  const enableCollectionApproval = useCallback(async () => {
    if (!address) throw new Error("Wallet not connected");

    const hash = await writeContractAsync({
      address: nftCollectionAddress,
      abi: NFTCollectionAbi,
      functionName: "setApprovalForAll",
      args: [cardSynthesisAddress, true],
    });
    await publicClient.waitForTransactionReceipt({ hash });
    await refetchApproval();
  }, [address, cardSynthesisAddress, nftCollectionAddress, publicClient, refetchApproval, writeContractAsync]);

  const synthesize = useCallback(
    async (tokenIds: bigint[]) => {
      if (!address) throw new Error("Wallet not connected");
      if (tokenIds.length !== 5) throw new Error("Select exactly 5 NFTs to synthesize");
      if (!isApprovedForAll) throw new Error("Approve NFT collection for fusion first");
      if (allowance < synthesisFee) throw new Error("Approve GTK for fusion first");
      if (gtkBalance < synthesisFee) throw new Error("Insufficient GTK balance");

      const hash = await writeContractAsync({
        address: cardSynthesisAddress,
        abi: CardSynthesisAbi,
        functionName: "synthesize",
        args: [tokenIds],
      });

      const receipt = await publicClient.waitForTransactionReceipt({ hash });

      const fusionEvent = receipt.logs
        .map((log) => {
          try {
            return decodeEventLog({
              abi: CardSynthesisAbi,
              data: log.data,
              topics: log.topics,
            });
          } catch {
            return null;
          }
        })
        .find((event) => event?.eventName === "CardSynthesized");

      await Promise.all([refetchAllowance(), refetchGtkBalance()]);

      if (fusionEvent?.args) {
        const inputRarity = Number(fusionEvent.args.inputRarity ?? 0);
        const outputRarity = Number(fusionEvent.args.outputRarity ?? inputRarity);
        const successFlag =
          fusionEvent.args.success !== undefined ? Boolean(fusionEvent.args.success) : undefined;

        void postRankingEvent({
          address,
          type: "fusion",
          rarity: inputRarity,
          targetRarity: outputRarity,
          success: successFlag,
        });
      }

      return hash;
    },
    [
      address,
      allowance,
      cardSynthesisAddress,
      gtkBalance,
      isApprovedForAll,
      publicClient,
      refetchAllowance,
      refetchGtkBalance,
      synthesisFee,
      writeContractAsync,
    ],
  );

  return {
    synthesize,
    approveGtk,
    enableCollectionApproval,
    synthesisFee,
    allowance,
    gtkBalance,
    isApprovedForAll,
    isProcessing: isPending || isConfirming,
    lastTransactionHash: pendingHash,
  };
}

