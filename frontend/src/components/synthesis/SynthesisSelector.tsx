import IpfsImage from "@/components/common/IpfsImage";
import type { OwnedCard } from "@/types/nft";
import { RARITY_STYLE_MAP } from "@/utils/rarity";

interface SynthesisSelectorProps {
  cards: OwnedCard[];
  selected: bigint[];
  onToggle: (tokenId: bigint) => void;
}

export default function SynthesisSelector({
  cards,
  selected,
  onToggle,
}: SynthesisSelectorProps) {
  if (cards.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-white/10 p-12 text-center text-[11px] uppercase tracking-[0.28em] text-textSecondary">
        No NFTs detected. Draw cards first before synthesizing.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
      {cards.map((card) => {
        const isSelected = selected.some((item) => item === card.tokenId);
        const style = RARITY_STYLE_MAP[card.rarity];
        return (
          <button
            type="button"
            key={card.tokenId.toString()}
            onClick={() => onToggle(card.tokenId)}
            className={`group flex w-full max-w-[260px] flex-col overflow-hidden rounded-[20px] border-4 bg-[#14112A]/80 ${style.borderColor} ${
              isSelected ? style.glow : ""
            } transition`}
          >
            <div className="flex items-center justify-center bg-black/20 p-4">
              <IpfsImage
                uri={card.metadata.image}
                alt={card.metadata.name}
                className="max-h-56 w-auto object-contain opacity-90 transition group-hover:opacity-100"
              />
            </div>
            <div className="flex flex-1 flex-col gap-3 p-4 text-left">
              <div className="flex items-center justify-between text-[10px] uppercase tracking-[0.28em] text-textSecondary/70">
                <span>{style.label}</span>
                <span>#{card.tokenId.toString()}</span>
              </div>
              <h4 className="text-sm uppercase tracking-[0.24em] text-white">{card.metadata.name}</h4>
              <span
                className={`mt-auto rounded-xl border px-3 py-2 text-center text-[10px] uppercase tracking-[0.32em] ${
                  isSelected ? "border-neonSecondary text-neonSecondary" : "border-white/20 text-textSecondary"
                }`}
              >
                {isSelected ? "Selected" : "Select"}
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
}

