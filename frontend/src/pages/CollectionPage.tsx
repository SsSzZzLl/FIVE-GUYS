import PageHeader from "@/components/common/PageHeader";
import LoadingState from "@/components/common/LoadingState";
import NFTCard from "@/components/nft/NFTCard";
import { useNFTCollection } from "@/hooks/useNFTCollection";

export default function CollectionPage() {
  const { cards, isLoading, refresh } = useNFTCollection();

  return (
    <div className="space-y-10 px-10 py-12">
      <PageHeader
        title="Hangar Bay"
        subtitle="Recovered construct shards await deployment. Inventory syncs directly from the NFTCollection contract."
        actions={
          <button
            type="button"
            onClick={() => void refresh()}
            className="rounded-xl border border-neonSecondary px-5 py-2 text-[11px] uppercase tracking-[0.3em] text-neonSecondary hover:bg-neonSecondary/10"
          >
            Rescan inventory
          </button>
        }
      />

      {isLoading ? (
        <LoadingState />
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
          {cards.map((card) => (
            <NFTCard key={card.tokenId.toString()} metadata={card.metadata} rarity={card.rarity} tokenId={card.tokenId} />
          ))}
          {cards.length === 0 ? (
            <div className="col-span-full rounded-3xl border border-dashed border-white/10 p-10 text-center text-[11px] uppercase tracking-[0.3em] text-textSecondary">
              No shards docked yet. Run a salvage mission to stock the hangar.
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

