import { useEffect, useMemo } from "react";
import axios from "axios";
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import {
  useAccount,
  usePublicClient,
  useWriteContract,
  useSignMessage,
  useReadContract,
} from "wagmi";
import { maxUint256, parseUnits } from "viem";
import type {
  CreateListingPayload,
  MarketFilters,
  MarketListing,
} from "@/types/market";
import { RARITY_RANK } from "@/utils/rarity";
import { SUPPORTED_CHAINS } from "@/config/chains";
import { requireContract } from "@/config/contracts";
import { ERC20Abi } from "@/abi/ERC20";
import { MarketplaceAbi } from "@/abi/Marketplace";
import { NFTCollectionAbi } from "@/abi/NFTCollection";
import { useUserStore } from "@/store/useUserStore";

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4100/api";

export async function fetchListings(): Promise<MarketListing[]> {
  const response = await axios.get<{ listings: MarketListing[] }>(
    `${API_BASE}/marketplace/listings`,
  );
  return response.data.listings ?? [];
}

async function postListing(
  payload: CreateListingPayload & { seller: string; signature: string; signedAt: number },
): Promise<MarketListing> {
  const response = await axios.post<MarketListing>(
    `${API_BASE}/marketplace/listings`,
    payload,
  );
  return response.data;
}

export function useMarketplace(filters: MarketFilters) {
  const { address } = useAccount();
  const addressLower = address?.toLowerCase();
  const queryClient = useQueryClient();
  const publicClient = usePublicClient({ chainId: SUPPORTED_CHAINS[0].id })!;
  const { writeContractAsync } = useWriteContract();
  const { signMessageAsync } = useSignMessage();
  const erc20Address = requireContract("erc20Token");
  const nftCollectionAddress = requireContract("nftCollection");
  const marketplaceAddress = requireContract("marketplace");
  const updateGtkBalance = useUserStore((state) => state.updateGtkBalance);

  const listingsQuery = useQuery({
    queryKey: ["marketplace", "listings"],
    queryFn: fetchListings,
    staleTime: 30_000,
  });

  const {
    data: gtkBalanceRaw,
    refetch: refetchGtkBalance,
  } = useReadContract({
    address: erc20Address,
    abi: ERC20Abi,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: Boolean(address) },
  });

  const {
    data: gtkAllowanceRaw,
    refetch: refetchGtkAllowance,
  } = useReadContract({
    address: erc20Address,
    abi: ERC20Abi,
    functionName: "allowance",
    args: address ? [address, marketplaceAddress] : undefined,
    query: { enabled: Boolean(address) },
  });

  const {
    data: marketplaceApprovedRaw,
    refetch: refetchMarketplaceApproval,
  } = useReadContract({
    address: nftCollectionAddress,
    abi: NFTCollectionAbi,
    functionName: "isApprovedForAll",
    args: address ? [address, marketplaceAddress] : undefined,
    query: { enabled: Boolean(address) },
  });

  const gtkBalance = gtkBalanceRaw ?? 0n;
  const gtkAllowance = gtkAllowanceRaw ?? 0n;
  const isMarketplaceApproved = Boolean(marketplaceApprovedRaw);

  useEffect(() => {
    updateGtkBalance(gtkBalance);
  }, [gtkBalance, updateGtkBalance]);

  const createMutation = useMutation({
    mutationFn: async (payload: CreateListingPayload) => {
      if (!address) throw new Error("Wallet not connected");
      if (!isMarketplaceApproved) {
        throw new Error("Approve the marketplace to manage your NFTs before listing.");
      }

      const tokenId = BigInt(payload.tokenId);
      const priceWei = parseUnits(payload.priceGtk.toString(), 18);

      const signedAt = Date.now();
      const signature = await signMessageAsync({
        message: `List token #${payload.tokenId} for ${payload.priceGtk} GTK at ${signedAt}`,
      });

      const gas = await publicClient.estimateContractGas({
        address: marketplaceAddress,
        abi: MarketplaceAbi,
        functionName: "listCard",
        account: address,
        args: [tokenId, priceWei],
      });

      const hash = await writeContractAsync({
        address: marketplaceAddress,
        abi: MarketplaceAbi,
        functionName: "listCard",
        args: [tokenId, priceWei],
        gas,
      });

      await publicClient.waitForTransactionReceipt({ hash });
      await postListing({ ...payload, seller: address, signature, signedAt });

      return hash;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["marketplace", "listings"] }).catch(() => {});
    },
  });

  const purchaseMutation = useMutation({
    mutationFn: async (listing: MarketListing) => {
      if (!address) throw new Error("Wallet not connected");

      const tokenId = BigInt(listing.tokenId);
      const priceWei = parseUnits(listing.priceGtk.toString(), 18);

      const stillListed = await publicClient.readContract({
        address: marketplaceAddress,
        abi: MarketplaceAbi,
        functionName: "isListed",
        args: [tokenId],
      });
      if (!stillListed) {
        throw new Error("This listing is already inactive on-chain. Refresh the relay feed.");
      }

      if (gtkBalance < priceWei) {
        throw new Error("Insufficient GTK balance. Purchase more tokens first.");
      }

      if (gtkAllowance < priceWei) {
        throw new Error("Approve GTK spending for the marketplace before purchasing.");
      }

      const gas = await publicClient.estimateContractGas({
        address: marketplaceAddress,
        abi: MarketplaceAbi,
        functionName: "buyCard",
        account: address,
        args: [tokenId],
      });

      const hash = await writeContractAsync({
        address: marketplaceAddress,
        abi: MarketplaceAbi,
        functionName: "buyCard",
        args: [tokenId],
        gas,
      });

      await publicClient.waitForTransactionReceipt({ hash });
      await Promise.all([refetchGtkBalance(), refetchGtkAllowance()]);

      return hash;
    },
    onSuccess: (_hash, listing) => {
      queryClient.setQueryData<MarketListing[] | undefined>(
        ["marketplace", "listings"],
        (previous) => {
          if (!previous) {
            return previous;
          }
          const now = new Date().toISOString();
          return previous.map((item) =>
            item.id === listing.id || item.tokenId === listing.tokenId
              ? {
                  ...item,
                  isSold: true,
                  buyer: address ?? item.buyer,
                  soldAt: now,
                }
              : item,
          );
        },
      );
      queryClient.invalidateQueries({ queryKey: ["marketplace", "listings"] }).catch(() => {});
    },
  });

  const approveMarketplaceMutation = useMutation({
    mutationFn: async (): Promise<string> => {
      if (!address) throw new Error("Wallet not connected");
      const hash = await writeContractAsync({
        address: nftCollectionAddress,
        abi: NFTCollectionAbi,
        functionName: "setApprovalForAll",
        args: [marketplaceAddress, true],
      });
      await publicClient.waitForTransactionReceipt({ hash });
      await refetchMarketplaceApproval();
      return hash;
    },
  });

  const approveGtkMutation = useMutation({
    mutationFn: async (): Promise<string> => {
      if (!address) throw new Error("Wallet not connected");
      const hash = await writeContractAsync({
        address: erc20Address,
        abi: ERC20Abi,
        functionName: "approve",
        args: [marketplaceAddress, maxUint256],
      });
      await publicClient.waitForTransactionReceipt({ hash });
      await Promise.all([refetchGtkAllowance(), refetchGtkBalance()]);
      return hash;
    },
  });

  const {
    filteredListings,
    activeListings,
    myActiveListings,
    mySoldListings,
    purchasedListings,
    blockedTokenIds,
  } = useMemo(() => {
    const rawListings = listingsQuery.data ?? [];
    const active = rawListings.filter((listing) => !listing.isSold);

    const filtered = active.filter((listing) => {
      if (filters.rarity && filters.rarity !== "ALL" && listing.rarity !== filters.rarity) {
        return false;
      }
      if (filters.minPrice !== undefined && listing.priceGtk < filters.minPrice) {
        return false;
      }
      if (filters.maxPrice !== undefined && listing.priceGtk > filters.maxPrice) {
        return false;
      }
      return true;
    });

    const sorted = filtered.sort((a, b) => {
      switch (filters.sortBy) {
        case "priceAsc":
          return a.priceGtk - b.priceGtk;
        case "priceDesc":
          return b.priceGtk - a.priceGtk;
        case "rarity":
          return RARITY_RANK[b.rarity] - RARITY_RANK[a.rarity];
        default:
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
    });

    const myActive =
      addressLower === undefined
        ? []
        : active.filter((listing) => listing.seller.toLowerCase() === addressLower);

    const mySold =
      addressLower === undefined
        ? []
        : rawListings.filter(
            (listing) => listing.isSold && listing.seller.toLowerCase() === addressLower,
          );

    const myPurchased =
      addressLower === undefined
        ? []
        : rawListings.filter(
            (listing) => listing.isSold && listing.buyer?.toLowerCase() === addressLower,
          );

    const blockedIds = new Set<string>();
    for (const listing of myActive) {
      blockedIds.add(listing.tokenId.toString());
    }
    for (const listing of mySold) {
      blockedIds.add(listing.tokenId.toString());
    }

    return {
      filteredListings: sorted,
      activeListings: active,
      myActiveListings: myActive,
      mySoldListings: mySold,
      purchasedListings: myPurchased,
      blockedTokenIds: blockedIds,
    };
  }, [addressLower, filters, listingsQuery.data]);

  return {
    listings: filteredListings,
    allListings: listingsQuery.data ?? [],
    activeListings,
    myActiveListings,
    mySoldListings,
    purchasedListings,
    blockedTokenIds,
    isLoading: listingsQuery.isLoading,
    refetch: listingsQuery.refetch,
    createListing: createMutation.mutateAsync,
    isCreating: createMutation.isPending,
    purchaseListing: purchaseMutation.mutateAsync,
    isPurchasing: purchaseMutation.isPending,
    approveMarketplace: approveMarketplaceMutation.mutateAsync,
    isApprovingMarketplace: approveMarketplaceMutation.isPending,
    approveGtk: approveGtkMutation.mutateAsync,
    isApprovingGtk: approveGtkMutation.isPending,
    isMarketplaceApproved,
    gtkAllowance,
    gtkBalance,
    error:
      listingsQuery.error ??
      createMutation.error ??
      purchaseMutation.error ??
      approveMarketplaceMutation.error ??
      approveGtkMutation.error,
  };
}

