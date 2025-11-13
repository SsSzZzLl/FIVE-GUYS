import { useCallback, useMemo, useState } from "react";
import { useAccount } from "wagmi";
import { toast } from "react-hot-toast";
import PageHeader from "@/components/common/PageHeader";
import SynthesisSelector from "@/components/synthesis/SynthesisSelector";
import { useCardSynthesis } from "@/hooks/useCardSynthesis";
import { useNFTCollection } from "@/hooks/useNFTCollection";
import { formatGtk } from "@/utils/formatters";

export default function SynthesisPage() {
  const { address } = useAccount();
  const { cards, refresh } = useNFTCollection();
  const {
    synthesize,
    approveGtk,
    enableCollectionApproval,
    synthesisFee,
    allowance,
    gtkBalance,
    isApprovedForAll,
    isProcessing,
  } = useCardSynthesis();
  const [selected, setSelected] = useState<bigint[]>([]);
  const [lastHash, setLastHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const toggle = useCallback((tokenId: bigint) => {
    setSelected((prev) =>
      prev.some((item) => item === tokenId) ? prev.filter((item) => item !== tokenId) : [...prev, tokenId],
    );
  }, []);

  const selectedCards = useMemo(
    () => cards.filter((card) => selected.some((tokenId) => tokenId === card.tokenId)),
    [cards, selected],
  );

  const raritySet = useMemo(
    () => new Set(selectedCards.map((card) => card.rarity)),
    [selectedCards],
  );

  const rarityMismatch = raritySet.size > 1;
  const needsGtkApproval = allowance < synthesisFee;
  const insufficientGtk = gtkBalance < synthesisFee;

  const handleSynthesize = useCallback(async () => {
    if (selectedCards.length !== 5) {
      setError("Select exactly five shards for reassembly.");
      return;
    }
    if (rarityMismatch) {
      setError("All selected shards must share the same fragment tier.");
      return;
    }

    try {
      setError(null);
      const txHash = await synthesize(selected);
      toast.success("Reassembly cycle complete.");
      setLastHash(txHash);
      setSelected([]);
      await refresh();
    } catch (err) {
      console.error(err);
      const message = err instanceof Error ? err.message : "Reassembly failed";
      setError(message);
      toast.error(message);
    }
  }, [rarityMismatch, refresh, selected, selectedCards.length, synthesize]);

  return (
    <div className="space-y-10 px-10 py-12">
      <PageHeader
        title="Reassembly Lab"
        subtitle="Combine five identical construct shards and gamble on an upgrade. Each reassembly consumes GTK, risks failure, and always returns a fresh unit to keep the roster active."
        actions={
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => setSelected([])}
              className="rounded-xl border border-white/20 px-5 py-2 text-[11px] uppercase tracking-[0.28em] text-textSecondary hover:bg-white/5"
            >
              Clear selection
            </button>
            <button
              type="button"
              disabled={selectedCards.length !== 5 || rarityMismatch || isProcessing}
              onClick={() => void handleSynthesize()}
              className="rounded-xl bg-neonPrimary px-5 py-2 text-[11px] uppercase tracking-[0.3em] text-white shadow-neon transition hover:bg-neonSecondary disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isProcessing ? "Processing..." : `Reassemble (${selectedCards.length}/5)`}
            </button>
          </div>
        }
      />

      <section className="rounded-3xl border border-white/10 bg-[#131028]/80 p-6 text-[11px] uppercase tracking-[0.24em] text-textSecondary">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <div>
            <p className="text-textSecondary/70">Reassembly fee</p>
            <p className="mt-2 text-lg text-white">{formatGtk(synthesisFee)} GTK</p>
          </div>
          <div>
            <p className="text-textSecondary/70">GTK reserves</p>
            <p className="mt-2 text-lg text-white">{formatGtk(gtkBalance)} GTK</p>
          </div>
          <div>
            <p className="text-textSecondary/70">GTK allowance</p>
            <p className="mt-2 text-lg text-white">{formatGtk(allowance)} GTK</p>
          </div>
          <div>
            <p className="text-textSecondary/70">Failure chance</p>
            <p className="mt-2 text-lg text-white">10%</p>
          </div>
        </div>
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => void approveGtk()}
            disabled={!address || !needsGtkApproval || isProcessing}
            className="rounded-xl border border-neonSecondary px-4 py-2 text-[10px] uppercase tracking-[0.28em] text-neonSecondary hover:bg-neonSecondary/10 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {needsGtkApproval ? "Authorize GTK for reassembly" : "GTK ready"}
          </button>
          <button
            type="button"
            onClick={() => void enableCollectionApproval()}
            disabled={!address || isApprovedForAll || isProcessing}
            className="rounded-xl border border-neonSecondary px-4 py-2 text-[10px] uppercase tracking-[0.28em] text-neonSecondary hover:bg-neonSecondary/10 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isApprovedForAll ? "Shard transfers enabled" : "Enable shard transfers"}
          </button>
          {insufficientGtk ? (
            <span className="rounded-xl border border-amber-400/40 bg-amber-500/10 px-3 py-1 text-[10px] uppercase tracking-[0.24em] text-amber-200">
              Insufficient GTK reserves
            </span>
          ) : null}
        </div>
      </section>

      {error ? (
        <div className="rounded-3xl border border-red-400/40 bg-red-500/10 p-4 text-[11px] uppercase tracking-[0.28em] text-red-200">
          {error}
        </div>
      ) : null}

      {rarityMismatch ? (
        <div className="rounded-3xl border border-amber-400/40 bg-amber-500/10 p-4 text-[11px] uppercase tracking-[0.28em] text-amber-200">
          Selected shards belong to different fragment tiers.
        </div>
      ) : null}

      <SynthesisSelector cards={cards} selected={selected} onToggle={toggle} />

      {lastHash ? (
        <div className="rounded-3xl border border-neonSecondary/40 bg-neonSecondary/10 p-4 text-[11px] uppercase tracking-[0.28em] text-neonSecondary">
          Last reassembly tx: {lastHash}
        </div>
      ) : null}
    </div>
  );
}

