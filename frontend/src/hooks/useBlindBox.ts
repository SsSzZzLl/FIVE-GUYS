import { useCallback, useEffect } from "react";
import { useAccount, usePublicClient, useReadContract, useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import { decodeEventLog } from "viem";
import { BlindBoxAbi } from "@/abi/BlindBox";
import { ERC20Abi } from "@/abi/ERC20";
import { NFTCollectionAbi } from "@/abi/NFTCollection";
import { requireContract } from "@/config/contracts";
import { SUPPORTED_CHAINS } from "@/config/chains";
import type { BlindBoxResult, CardMetadata } from "@/types/nft";
import { fetchIpfsJson } from "@/utils/ipfs";
import { rarityFromIndex, rarityFromLabel } from "@/utils/rarity";
import { useUserStore } from "@/store/useUserStore";
import { postRankingEvent, rarityToScoreIndex } from "@/utils/ranking";

export function useBlindBox() {
  const { address } = useAccount();
  const publicClient = usePublicClient({ chainId: SUPPORTED_CHAINS[0].id })!;
  const blindBoxAddress = requireContract("blindBox");
  const erc20Address = requireContract("erc20Token");
  const nftCollectionAddress = requireContract("nftCollection");
  const {
    data: ticketPrice,
    refetch: refetchTicketPrice,
  } = useReadContract({
    address: blindBoxAddress,
    abi: BlindBoxAbi,
    functionName: "ticketPrice",
  });

  const {
    data: ticketBalance,
    refetch: refetchTickets,
  } = useReadContract({
    address: blindBoxAddress,
    abi: BlindBoxAbi,
    functionName: "userTicketCount",
    args: address ? [address] : undefined,
    query: { enabled: Boolean(address) },
  });

  const {
    data: allowance,
    refetch: refetchAllowance,
  } = useReadContract({
    address: erc20Address,
    abi: ERC20Abi,
    functionName: "allowance",
    args: address ? [address, blindBoxAddress] : undefined,
    query: { enabled: Boolean(address) },
  });

  const {
    data: gtkBalance,
    refetch: refetchGtkBalance,
  } = useReadContract({
    address: erc20Address,
    abi: ERC20Abi,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: Boolean(address) },
  });

  const { writeContractAsync, data: pendingHash, isPending } = useWriteContract();

  const { isLoading: isConfirming } = useWaitForTransactionReceipt({
    hash: pendingHash,
    query: { enabled: Boolean(pendingHash) },
  });

  const updateGtkBalance = useUserStore((state) => state.updateGtkBalance);
  const updateTicketBalance = useUserStore((state) => state.updateTicketBalance);

  useEffect(() => {
    updateGtkBalance(gtkBalance ?? 0n);
  }, [gtkBalance, updateGtkBalance]);

  useEffect(() => {
    updateTicketBalance(ticketBalance ?? 0n);
  }, [ticketBalance, updateTicketBalance]);

  const refreshState = useCallback(async () => {
    await Promise.all([refetchTickets(), refetchAllowance(), refetchTicketPrice(), refetchGtkBalance()]);
  }, [refetchAllowance, refetchGtkBalance, refetchTicketPrice, refetchTickets]);

  const approveSpend = useCallback(
    async (amount: bigint) => {
      const hash = await writeContractAsync({
        address: erc20Address,
        abi: ERC20Abi,
        functionName: "approve",
        args: [blindBoxAddress, amount],
      });
      await publicClient.waitForTransactionReceipt({ hash });
      await Promise.all([refetchAllowance(), refetchGtkBalance()]);
    },
    [
      blindBoxAddress,
      erc20Address,
      publicClient,
      refetchAllowance,
      refetchGtkBalance,
      writeContractAsync,
    ],
  );

  const buyTicket = useCallback(async (ticketCount: bigint = 1n) => {
    if (!address) throw new Error("Wallet not connected");
    const gasLimit = await publicClient.estimateContractGas({
      address: blindBoxAddress,
      abi: BlindBoxAbi,
      functionName: "buyTicket",
      account: address,
      args: [ticketCount],
    });
    const hash = await writeContractAsync({
      address: blindBoxAddress,
      abi: BlindBoxAbi,
      functionName: "buyTicket",
      gas: gasLimit,
      args: [ticketCount],
    });
    await publicClient.waitForTransactionReceipt({ hash });
    await Promise.all([refetchTickets(), refetchAllowance(), refetchTicketPrice(), refetchGtkBalance()]);
    return hash;
  }, [
    blindBoxAddress,
    publicClient,
    refetchAllowance,
    refetchGtkBalance,
    refetchTicketPrice,
    refetchTickets,
    writeContractAsync,
  ]);

  const drawCard = useCallback(async (): Promise<BlindBoxResult> => {
    if (!address) throw new Error("Wallet not connected");
    const gasLimit = await publicClient.estimateContractGas({
      address: blindBoxAddress,
      abi: BlindBoxAbi,
      functionName: "drawCard",
      account: address,
    });
    const hash = await writeContractAsync({
      address: blindBoxAddress,
      abi: BlindBoxAbi,
      functionName: "drawCard",
      gas: gasLimit,
    });

    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    let decodedTokenId: bigint | undefined;
    let decodedRarityIndex: number | undefined;

    const decodedEvent = receipt.logs
      .map((log) => {
        try {
          return decodeEventLog({
            abi: BlindBoxAbi,
            data: log.data,
            topics: log.topics,
          });
        } catch {
          return null;
        }
      })
      .find((event) => event?.eventName === "CardDrawn");

    if (decodedEvent?.args) {
      decodedTokenId = BigInt(decodedEvent.args.tokenId as bigint);
      decodedRarityIndex = Number(decodedEvent.args.rarity);
    } else {
      const nftEvent = receipt.logs
        .map((log) => {
          try {
            return decodeEventLog({
              abi: NFTCollectionAbi,
              data: log.data,
              topics: log.topics,
            });
          } catch {
            return null;
          }
        })
        .find((event) => event?.eventName === "NFTCreated");

      if (nftEvent?.args) {
        decodedTokenId = BigInt(nftEvent.args.tokenId as bigint);
        decodedRarityIndex = Number(nftEvent.args.rarity);
      }
    }

    if (decodedTokenId === undefined) {
      try {
        const nextTokenId = (await publicClient.readContract({
          address: nftCollectionAddress,
          abi: NFTCollectionAbi,
          functionName: "nextTokenId",
        })) as bigint;
        if (nextTokenId > 0n) {
          decodedTokenId = nextTokenId - 1n;
        }
      } catch (error) {
        console.warn("Failed to read nextTokenId for fallback", error);
      }
    }

    if (decodedTokenId === undefined) {
      throw new Error("Card draw event not found");
    }

    const tokenId = decodedTokenId;

    const tokenUri = (await publicClient.readContract({
      address: nftCollectionAddress,
      abi: NFTCollectionAbi,
      functionName: "tokenURI",
      args: [tokenId],
    })) as string;

    const metadata = await fetchIpfsJson<CardMetadata>(tokenUri);
    const rarityAttribute = metadata.attributes?.find(
      (attr) => attr.trait_type?.toLowerCase() === "rarity",
    );
    const rarity =
      decodedRarityIndex !== undefined
        ? rarityFromIndex(decodedRarityIndex)
        : rarityFromLabel(rarityAttribute?.value);

    await refetchTickets();
    void postRankingEvent({
      address,
      type: "draw",
      rarity: rarityToScoreIndex(rarity),
    });

    return {
      tokenId,
      metadata,
      rarity,
      txHash: hash,
    };
  }, [blindBoxAddress, nftCollectionAddress, publicClient, refetchTickets, writeContractAsync]);

  return {
    ticketPrice: ticketPrice ?? 0n,
    ticketBalance: ticketBalance ?? 0n,
    allowance: allowance ?? 0n,
    gtkBalance: gtkBalance ?? 0n,
    isProcessing: isPending || isConfirming,
    approveSpend,
    buyTicket,
    drawCard,
    refreshState,
  };
}

