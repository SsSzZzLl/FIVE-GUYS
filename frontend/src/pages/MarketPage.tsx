import { useEffect, useMemo, useState } from "react";
import { useAccount } from "wagmi";
import { maxUint256 } from "viem";
import { toast } from "react-hot-toast";
import PageHeader from "@/components/common/PageHeader";
import ListingFilter from "@/components/market/ListingFilter";
import ListingGrid from "@/components/market/ListingGrid";
import { useMarketplace } from "@/hooks/useMarketplace";
import { useNFTCollection } from "@/hooks/useNFTCollection";
import { useMarketStore } from "@/store/useMarketStore";
import type { CreateListingPayload, MarketListing } from "@/types/market";
import NFTCard from "@/components/nft/NFTCard";
import { formatGtk } from "@/utils/formatters";

type ViewMode = "market" | "mine";

export default function MarketPage() {
  const { filters, setFilters } = useMarketStore();
  const marketplace = useMarketplace(filters);
  const { address } = useAccount();
  const { cards, refresh } = useNFTCollection();

  const [viewMode, setViewMode] = useState<ViewMode>("market");
  const [selectedTokenId, setSelectedTokenId] = useState<string | null>(null);
  const [price, setPrice] = useState<string>("10");
  const [buyingId, setBuyingId] = useState<string | null>(null);
  const [lastListingMessage, setLastListingMessage] = useState<string | null>(null);

  const allowanceUnlimited = marketplace.gtkAllowance === maxUint256;
  const gtkBalanceDisplay = `${formatGtk(marketplace.gtkBalance)} GTK`;
  const gtkAllowanceDisplay = allowanceUnlimited
    ? "Unlimited"
    : `${formatGtk(marketplace.gtkAllowance)} GTK`;

  const availableCards = useMemo(() => {
    return cards
      .filter((card) => !marketplace.blockedTokenIds.has(card.tokenId.toString()))
      .map((card) => ({
        ...card,
        tokenIdString: card.tokenId.toString(),
      }));
  }, [cards, marketplace.blockedTokenIds]);

  const selectedCard = useMemo(
    () =>
      availableCards.find(
        (card) => card.tokenIdString === (selectedTokenId ?? ""),
      ),
    [availableCards, selectedTokenId],
  );

  useEffect(() => {
    if (availableCards.length === 0) {
      setSelectedTokenId(null);
      return;
    }
    if (!selectedTokenId) {
      setSelectedTokenId(availableCards[0].tokenIdString);
    } else {
      const stillExists = availableCards.some(
        (card) => card.tokenIdString === selectedTokenId,
      );
      if (!stillExists) {
        setSelectedTokenId(availableCards[0].tokenIdString);
      }
    }
  }, [availableCards, selectedTokenId]);

  const handleCreateListing = async () => {
    if (!selectedCard) {
      toast.error("Select a shard to broadcast.");
      return;
    }

    const numericPrice = Number(price);
    if (Number.isNaN(numericPrice) || numericPrice <= 0) {
      toast.error("Set a valid asking price in GTK.");
      return;
    }

    const payload: CreateListingPayload = {
      tokenId: selectedCard.tokenIdString,
      priceGtk: numericPrice,
      rarity: selectedCard.rarity,
      name: selectedCard.metadata.name,
      imageUri: selectedCard.metadata.image,
      metadataUri: selectedCard.tokenUri,
      metadata: selectedCard.metadata,
    };

    let toastId: string | undefined;

    try {
      toastId = toast.loading("Broadcasting signal…");
      await marketplace.createListing(payload);
      const message = `Relay online: ${selectedCard.metadata.name} (#${selectedCard.tokenIdString}) · ${numericPrice} GTK`;
      setLastListingMessage(message);
      toast.success(message, { id: toastId });
      setPrice("10");
      setSelectedTokenId(null);
      await refresh();
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "Failed to create listing.", {
        id: toastId,
      });
    }
  };

  const handleBuy = async (listing: MarketListing) => {
    if (!address) {
      toast.error("Connect a wallet before acquiring shards.");
      return;
    }

    try {
      setBuyingId(listing.id);
      const txHash = await marketplace.purchaseListing(listing);
      toast.success(`Purchase confirmed. Hash: ${txHash.slice(0, 6)}…${txHash.slice(-4)}.`);
      await refresh();
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "Failed to complete purchase.");
    } finally {
      setBuyingId(null);
    }
  };

  const handleApproveGtk = async () => {
    if (!address) {
      toast.error("Connect a wallet before approving spend.");
      return;
    }

    let toastId: string | undefined;
    try {
      toastId = toast.loading("Authorising GTK spend…");
      const hash = await marketplace.approveGtk();
      toast.success(`Allowance updated. Hash: ${hash.slice(0, 6)}…${hash.slice(-4)}.`, {
        id: toastId,
      });
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "Failed to approve GTK.", {
        id: toastId,
      });
    }
  };

  const handleApproveMarketplace = async () => {
    if (!address) {
      toast.error("Connect a wallet before enabling the marketplace.");
      return;
    }

    let toastId: string | undefined;
    try {
      toastId = toast.loading("Granting NFT permissions…");
      const hash = await marketplace.approveMarketplace();
      toast.success(`Marketplace approved. Hash: ${hash.slice(0, 6)}…${hash.slice(-4)}.`, {
        id: toastId,
      });
    } catch (error) {
      console.error(error);
      toast.error(
        error instanceof Error ? error.message : "Failed to enable marketplace access.",
        {
          id: toastId,
        },
      );
    }
  };

  const listingsForView =
    viewMode === "market" ? marketplace.listings : marketplace.myActiveListings;

  return (
    <div className="space-y-10 px-10 py-12">
      <PageHeader
        title="Relay Bazaar"
        subtitle="Signal recovered shards to the Corps supply chain or acquire fresh stock from fellow salvagers."
        actions={
          <button
            type="button"
            onClick={() => void marketplace.refetch()}
            className="rounded-xl border border-neonSecondary px-5 py-2 text-[11px] uppercase tracking-[0.3em] text-neonSecondary hover:bg-neonSecondary/10"
          >
            Sync listings
          </button>
        }
      />

      <section className="rounded-3xl border border-white/10 bg-[#14112A]/80 p-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <p className="text-[11px] uppercase tracking-[0.28em] text-textSecondary/70">GTK balance</p>
            <p className="mt-2 text-xl text-white">{gtkBalanceDisplay}</p>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-[0.28em] text-textSecondary/70">Marketplace allowance</p>
            <p className="mt-2 text-xl text-white">{gtkAllowanceDisplay}</p>
          </div>
          <div>
            <p className="text-[11px] uppercase tracking-[0.28em] text-textSecondary/70">NFT permissions</p>
            <p className="mt-2 text-xl text-white">
              {marketplace.isMarketplaceApproved ? "Granted" : "Required"}
            </p>
          </div>
        </div>
        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => void handleApproveGtk()}
            disabled={!address || marketplace.isApprovingGtk || allowanceUnlimited}
            className="rounded-xl border border-neonSecondary px-4 py-2 text-[10px] uppercase tracking-[0.28em] text-neonSecondary hover:bg-neonSecondary/10 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {marketplace.isApprovingGtk
              ? "Authorising…"
              : allowanceUnlimited
                ? "GTK Approved"
                : "Approve GTK"}
          </button>
          <button
            type="button"
            onClick={() => void handleApproveMarketplace()}
            disabled={!address || marketplace.isApprovingMarketplace || marketplace.isMarketplaceApproved}
            className="rounded-xl border border-neonSecondary px-4 py-2 text-[10px] uppercase tracking-[0.28em] text-neonSecondary hover:bg-neonSecondary/10 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {marketplace.isApprovingMarketplace
              ? "Enabling…"
              : marketplace.isMarketplaceApproved
                ? "Marketplace Enabled"
                : "Enable Marketplace"}
          </button>
        </div>
      </section>

      <section className="rounded-3xl border border-white/10 bg-[#14112A]/80 p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="text-sm uppercase tracking-[0.28em] text-white">Signal listing</h3>
            <p className="mt-2 text-[11px] leading-relaxed text-textSecondary/80">
              Choose a shard from your hangar, set an asking price, and broadcast it to the relay. Active
              postings appear under “My Signals” for quick monitoring.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setViewMode("market")}
              className={`rounded-full px-4 py-2 text-[10px] uppercase tracking-[0.28em] transition ${
                viewMode === "market"
                  ? "bg-neonSecondary text-black shadow-neon"
                  : "border border-white/20 text-textSecondary hover:bg-white/5"
              }`}
            >
              Relay feed
            </button>
            <button
              type="button"
              onClick={() => address && setViewMode("mine")}
              disabled={!address}
              className={`rounded-full px-4 py-2 text-[10px] uppercase tracking-[0.28em] transition ${
                viewMode === "mine"
                  ? "bg-neonSecondary text-black shadow-neon"
                  : "border border-white/20 text-textSecondary hover:bg-white/5"
              } ${address ? "" : "cursor-not-allowed opacity-40"}`}
            >
              My signals
            </button>
          </div>
        </div>

        <div className="mt-6 space-y-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {availableCards.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-white/10 p-6 text-center text-[11px] uppercase tracking-[0.28em] text-textSecondary">
                Every eligible shard is already signaled or reserved.
              </div>
            ) : (
              availableCards.map((card) => {
                const isSelected = card.tokenIdString === selectedTokenId;
                return (
                  <button
                    key={card.tokenIdString}
                    type="button"
                    onClick={() =>
                      setSelectedTokenId(
                        isSelected ? null : card.tokenIdString,
                      )
                    }
                    className={`group flex w-full justify-center rounded-[26px] border-2 border-transparent bg-black/10 p-3 transition hover:border-neonSecondary/60 ${
                      isSelected ? "border-neonSecondary shadow-neon" : "border-white/10"
                    }`}
                  >
                    <NFTCard metadata={card.metadata} rarity={card.rarity} tokenId={card.tokenId} />
                  </button>
                );
              })
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <label className="space-y-2 text-[10px] uppercase tracking-[0.3em] text-textSecondary">
              Asking price (GTK)
              <input
                type="number"
                min={0}
                step="0.1"
                value={price}
                onChange={(event) => setPrice(event.target.value)}
                className="w-full rounded-xl border border-white/20 bg-[#121026] px-3 py-2 text-[11px] uppercase tracking-[0.2em]"
                placeholder="10"
              />
            </label>

            <div className="md:col-span-2">
              {selectedCard ? (
                <div className="rounded-2xl border border-neonSecondary/40 bg-neonSecondary/10 px-4 py-3 text-[10px] uppercase tracking-[0.28em] text-neonSecondary">
                  Broadcasting: {selectedCard.metadata.name} · #{selectedCard.tokenIdString} ({selectedCard.rarity})
                </div>
              ) : (
                <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-[10px] uppercase tracking-[0.28em] text-textSecondary">
                  Select a shard to arm your signal.
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => void handleCreateListing()}
              disabled={
                !address ||
                !selectedCard ||
                marketplace.isCreating ||
                availableCards.length === 0
              }
              className="rounded-xl bg-neonPrimary px-5 py-3 text-[11px] uppercase tracking-[0.3em] text-white shadow-neon transition hover:bg-neonSecondary disabled:cursor-not-allowed disabled:opacity-60"
            >
              {marketplace.isCreating ? "Broadcasting..." : "Broadcast listing"}
            </button>
          </div>

          {!address ? (
            <p className="text-[10px] uppercase tracking-[0.28em] text-amber-300">
              Connect your wallet to transmit signals through the relay.
            </p>
          ) : null}

          {lastListingMessage ? (
            <div className="rounded-2xl border border-neonSecondary/40 bg-neonSecondary/10 px-4 py-3 text-[10px] uppercase tracking-[0.28em] text-neonSecondary">
              {lastListingMessage}
            </div>
          ) : null}
        </div>
      </section>

      <ListingFilter filters={filters} onChange={setFilters} />

      <ListingGrid
        listings={listingsForView ?? []}
        isLoading={marketplace.isLoading}
        currentUser={address}
        onBuy={viewMode === "market" ? (listing) => void handleBuy(listing) : undefined}
        canBuy={viewMode === "market" && Boolean(address)}
        isPurchasing={marketplace.isPurchasing}
        activePurchaseId={buyingId}
        emptyMessage={
          viewMode === "market"
            ? "No signals detected on the relay."
            : "You have not broadcast any shards yet."
        }
      />

      {viewMode === "mine" && marketplace.mySoldListings.length > 0 ? (
        <section className="rounded-3xl border border-white/10 bg-[#14112A]/70 p-6 text-[10px] uppercase tracking-[0.28em] text-textSecondary">
          <h4 className="text-sm uppercase tracking-[0.28em] text-white">Relay ledger</h4>
          <ul className="mt-4 space-y-2 text-[10px] text-textSecondary/80">
            {marketplace.mySoldListings.map((listing) => {
              const soldAt = listing.soldAt ?? listing.createdAt;
              return (
                <li key={`${listing.id}-sold`} className="flex flex-wrap justify-between gap-2">
                  <span>
                    #{listing.tokenId} · {listing.name}
                  </span>
                  <span>
                    {listing.priceGtk} GTK · {new Date(soldAt).toLocaleString()}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}
    </div>
  );
}


