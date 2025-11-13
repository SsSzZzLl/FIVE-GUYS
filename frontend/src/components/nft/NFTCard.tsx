import type { ReactNode } from "react";
import IpfsImage from "@/components/common/IpfsImage";
import type { CardMetadata } from "@/types/nft";
import { RARITY_STYLE_MAP, type Rarity } from "@/utils/rarity";

interface NFTCardProps {
  tokenId?: bigint;
  metadata: CardMetadata;
  rarity: Rarity;
  footerSlot?: ReactNode;
}

export default function NFTCard({ tokenId, metadata, rarity, footerSlot }: NFTCardProps) {
  const style = RARITY_STYLE_MAP[rarity];

  return (
    <article
      className={`flex h-full max-w-[260px] flex-col overflow-hidden rounded-[22px] border-4 bg-[#0F0C1E]/80 ${style.borderColor} ${style.glow}`}
    >
      <div className="flex items-center justify-center bg-black/20 p-4">
        <IpfsImage
          uri={metadata.image}
          alt={metadata.name}
          className="max-h-56 w-auto object-contain"
        />
      </div>
      <div className="flex flex-1 flex-col gap-4 p-5">
        <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.28em] text-textSecondary/70">
          <span>{style.label}</span>
          {tokenId !== undefined ? <span>#{tokenId.toString()}</span> : null}
        </div>
        <h3 className="text-sm uppercase tracking-[0.24em] text-white">{metadata.name}</h3>
        <div className="space-y-2 text-[10px] text-textSecondary/80">
          {metadata.attributes.map((attr) => (
            <div key={`${attr.trait_type}-${attr.value}`} className="flex justify-between">
              <span>{attr.trait_type}</span>
              <span>{attr.value}</span>
            </div>
          ))}
        </div>
        {footerSlot}
      </div>
    </article>
  );
}

