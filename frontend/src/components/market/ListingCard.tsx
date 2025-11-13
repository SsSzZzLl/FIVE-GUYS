import IpfsImage from "@/components/common/IpfsImage";
import type { MarketListing } from "@/types/market";
import { shortAddress } from "@/utils/formatters";
import { RARITY_STYLE_MAP } from "@/utils/rarity";

interface ListingCardProps {
  listing: MarketListing;
  currentUser?: string;
  onBuy?: (listing: MarketListing) => void;
  canBuy?: boolean;
  isBuying?: boolean;
  disableActions?: boolean;
}

export default function ListingCard({
  listing,
  currentUser,
  onBuy,
  canBuy = false,
  isBuying = false,
  disableActions = false,
}: ListingCardProps) {
  const rarityStyle = RARITY_STYLE_MAP[listing.rarity];
  const isOwner =
    currentUser !== undefined && listing.seller.toLowerCase() === currentUser.toLowerCase();
  const canPurchase = !isOwner && canBuy;
  const buttonDisabled = disableActions || isBuying;

  return (
    <article className="flex flex-col gap-4 rounded-3xl border border-white/10 bg-[#14112A]/80 p-6 transition hover:border-neonSecondary/60 hover:shadow-neon">
      <div className={`rounded-2xl border-4 bg-[#0F0C1E]/80 ${rarityStyle.borderColor} ${rarityStyle.glow}`}>
        <div className="flex items-center justify-center bg-black/20 p-4">
          <IpfsImage
            uri={listing.imageUri || listing.metadata?.image || listing.metadataUri || ""}
            alt={listing.name}
            className="max-h-56 w-auto object-contain"
          />
        </div>
        <div className="flex flex-col gap-3 p-4">
          <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.28em] text-textSecondary/70">
            <span>{rarityStyle.label}</span>
            <span>#{listing.tokenId}</span>
          </div>
          <h3 className="text-sm uppercase tracking-[0.24em] text-white">{listing.name}</h3>
          <div className="space-y-2 text-[10px] uppercase tracking-[0.24em] text-textSecondary/80">
            <div className="flex justify-between">
              <span>Seller</span>
              <span>{shortAddress(listing.seller)}</span>
            </div>
            <div className="flex justify-between text-white">
              <span>Price</span>
              <span>{listing.priceGtk.toLocaleString("en-US", { maximumFractionDigits: 4 })} GTK</span>
            </div>
            <div className="flex justify-between">
              <span>Listed at</span>
              <span>{new Date(listing.createdAt).toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>

      {isOwner ? (
        <div className="rounded-xl border border-white/15 px-4 py-3 text-center text-[10px] uppercase tracking-[0.28em] text-textSecondary">
          Listed by you · awaiting buyer
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {canPurchase ? (
            <button
              type="button"
              onClick={() => onBuy?.(listing)}
              disabled={buttonDisabled}
              className="rounded-xl bg-neonPrimary px-4 py-3 text-[11px] uppercase tracking-[0.32em] text-white transition hover:bg-neonSecondary disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isBuying ? "Processing..." : "Buy with GTK"}
            </button>
          ) : (
            <div className="rounded-xl border border-white/10 px-4 py-3 text-center text-[10px] uppercase tracking-[0.28em] text-textSecondary">
              {canBuy ? "Already listed by you" : "Connect wallet to purchase"}
            </div>
          )}
          <a
            href={`https://sepolia.etherscan.io/address/${listing.seller}`}
            target="_blank"
            rel="noreferrer"
            className="rounded-xl border border-neonSecondary/60 px-4 py-3 text-center text-[11px] uppercase tracking-[0.32em] text-neonSecondary transition hover:bg-neonSecondary/10"
          >
            View Seller
          </a>
        </div>
      )}
    </article>
  );
}

