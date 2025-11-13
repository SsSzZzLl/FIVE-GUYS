import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAccount, usePublicClient } from "wagmi";
import { NFTCollectionAbi } from "@/abi/NFTCollection";
import { requireContract } from "@/config/contracts";
import { SUPPORTED_CHAINS } from "@/config/chains";
import type { CardMetadata, OwnedCard } from "@/types/nft";
import { fetchIpfsJson } from "@/utils/ipfs";
import { rarityFromIndex, rarityFromLabel } from "@/utils/rarity";
import { fetchListings } from "@/hooks/useMarketplace";

export function useNFTCollection() {
  const { address } = useAccount();
  const addressKey = useMemo(() => address?.toLowerCase() ?? "", [address]);
  const previousAddressRef = useRef<string>("");
  const publicClient = usePublicClient({ chainId: SUPPORTED_CHAINS[0].id })!;
  const nftCollectionAddress = requireContract("nftCollection");
  const [cards, setCards] = useState<OwnedCard[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const { data: marketplaceListings } = useQuery({
    queryKey: ["marketplace", "listings"],
    queryFn: fetchListings,
    staleTime: 30_000,
  });

  const addressLower = address?.toLowerCase();

  const blockedTokenIds = useMemo(() => {
    if (!addressLower) return new Set<string>();
    const listings = marketplaceListings ?? [];
    const blocked = new Set<string>();
    for (const listing of listings) {
      if (listing.seller.toLowerCase() === addressLower) {
        blocked.add(listing.tokenId.toString());
      }
    }
    return blocked;
  }, [addressLower, marketplaceListings]);

  const blockedIdsArray = useMemo(() => Array.from(blockedTokenIds), [blockedTokenIds]);

  useEffect(() => {
    if (previousAddressRef.current !== addressKey) {
      previousAddressRef.current = addressKey;
      setCards([]);
    }
  }, [addressKey]);

  const refresh = useCallback(async () => {
    if (!address) {
      setCards([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const balance = (await publicClient.readContract({
        address: nftCollectionAddress,
        abi: NFTCollectionAbi,
        functionName: "balanceOf",
        args: [address],
      })) as bigint;

      const count = Number(balance);

      let ownedTokenIds: bigint[] = [];

      if (count > 0) {
        try {
          ownedTokenIds = await Promise.all(
            Array.from({ length: count }, async (_, index) => {
              const tokenId = (await publicClient.readContract({
                address: nftCollectionAddress,
                abi: NFTCollectionAbi,
                functionName: "tokenOfOwnerByIndex",
                args: [address, BigInt(index)],
              })) as bigint;
              return tokenId;
            }),
          );
        } catch (err) {
          console.debug("tokenOfOwnerByIndex unavailable, falling back to ownerOf scan", err);
          const nextTokenId = (await publicClient.readContract({
            address: nftCollectionAddress,
            abi: NFTCollectionAbi,
            functionName: "nextTokenId",
          })) as bigint;
          const ownerLower = address.toLowerCase();
          const discovered: bigint[] = [];

          for (let tokenId = 0n; tokenId < nextTokenId; tokenId++) {
            try {
              const owner = (await publicClient.readContract({
                address: nftCollectionAddress,
                abi: NFTCollectionAbi,
                functionName: "ownerOf",
                args: [tokenId],
              })) as string;
              if (owner.toLowerCase() === ownerLower) {
                discovered.push(tokenId);
              }
            } catch (error) {
              // Likely an unminted tokenId – skip
            }
          }

          ownedTokenIds = discovered;
        }
      }

      const owned = await Promise.all(
        ownedTokenIds.map(async (tokenId) => {
          const tokenUri = (await publicClient.readContract({
            address: nftCollectionAddress,
            abi: NFTCollectionAbi,
            functionName: "tokenURI",
            args: [tokenId],
          })) as string;

          const attributes = (await publicClient.readContract({
            address: nftCollectionAddress,
            abi: NFTCollectionAbi,
            functionName: "getTokenAttributes",
            args: [tokenId],
          })) as any;

          const metadata = await fetchIpfsJson<CardMetadata>(tokenUri);
          const rarityAttribute = metadata.attributes?.find(
            (attr) => attr.trait_type?.toLowerCase() === "rarity",
          );
          const rarityValueFromContract =
            typeof attributes?.rarity !== "undefined" ? attributes.rarity : attributes?.[2];
          const rarity =
            typeof rarityValueFromContract === "number" && !Number.isNaN(rarityValueFromContract)
              ? rarityFromIndex(Number(rarityValueFromContract))
              : rarityFromLabel(rarityAttribute?.value);

          return {
            tokenId,
            tokenUri,
            metadata,
            rarity,
          } satisfies OwnedCard;
        }),
      );

      const blockedSet = new Set(blockedIdsArray);

      const filteredOwned = owned.filter(
        (card) => !blockedSet.has(card.tokenId.toString()),
      );

      setCards(filteredOwned);
    } catch (error) {
      console.error("Failed to load NFT collection", error);
    } finally {
      setIsLoading(false);
    }
  }, [address, publicClient, nftCollectionAddress, blockedIdsArray]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { cards, isLoading, refresh };
}
