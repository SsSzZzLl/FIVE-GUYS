import ListingCard from "./ListingCard";
import LoadingState from "@/components/common/LoadingState";
import type { MarketListing } from "@/types/market";

interface ListingGridProps {
  listings: MarketListing[];
  isLoading: boolean;
  currentUser?: string;
  onBuy?: (listing: MarketListing) => void;
  canBuy?: boolean;
  isPurchasing?: boolean;
  activePurchaseId?: string | null;
  emptyMessage?: string;
}

export default function ListingGrid({
  listings,
  isLoading,
  currentUser,
  onBuy,
  canBuy = false,
  isPurchasing = false,
  activePurchaseId = null,
  emptyMessage,
}: ListingGridProps) {
  if (isLoading) return <LoadingState />;

  return (
    <section className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
      {listings.map((listing) => (
        <ListingCard
          key={listing.id}
          listing={listing}
          currentUser={currentUser}
          onBuy={onBuy}
          canBuy={canBuy}
          isBuying={isPurchasing && activePurchaseId === listing.id}
          disableActions={isPurchasing && activePurchaseId !== listing.id}
        />
      ))}
      {listings.length === 0 ? (
        <div className="col-span-full rounded-3xl border border-dashed border-white/10 px-10 py-16 text-center text-[11px] uppercase tracking-[0.32em] text-textSecondary">
          {emptyMessage ?? "No active listings."}
        </div>
      ) : null}
    </section>
  );
}
