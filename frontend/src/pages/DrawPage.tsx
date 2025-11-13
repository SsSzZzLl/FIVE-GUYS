import { useCallback, useEffect, useState } from "react";
import { useAccount } from "wagmi";
import PackOpening from "@/components/animations/PackOpening";
import CardReveal from "@/components/animations/CardReveal";
import PageHeader from "@/components/common/PageHeader";
import StatCard from "@/components/common/StatCard";
import NFTCard from "@/components/nft/NFTCard";
import { useBlindBox } from "@/hooks/useBlindBox";
import { useNFTCollection } from "@/hooks/useNFTCollection";
import { useDrawStore } from "@/store/useDrawStore";
import { formatGtk } from "@/utils/formatters";

export default function DrawPage() {
  const { address } = useAccount();
  const { cards, refresh } = useNFTCollection();
  const { ticketPrice, ticketBalance, allowance, isProcessing, approveSpend, buyTicket, drawCard } =
    useBlindBox();
  const { start, finish, reset, isDrawing, result, history, setActiveAddress } = useDrawStore();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setActiveAddress(address);
  }, [address, setActiveAddress]);

  const handleDraw = useCallback(async () => {
    try {
      setError(null);
      start();

      if (allowance < ticketPrice) {
        await approveSpend(ticketPrice);
      }

      await buyTicket();
      const drawResult = await drawCard();
      finish(drawResult);
      await refresh();
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Draw failed");
      reset();
    }
  }, [allowance, approveSpend, buyTicket, drawCard, finish, refresh, reset, start, ticketPrice]);

  return (
    <div className="space-y-10 px-10 py-12">
      <PageHeader
        title="Salvage Missions"
        subtitle="Spend GTK to dispatch drones into the ruins. Each mission returns a construct shard pulled straight from the ringworld graveyard."
        actions={
          <button
            type="button"
            onClick={() => void handleDraw()}
            disabled={isDrawing || isProcessing}
            className="rounded-xl bg-neonPrimary px-6 py-3 text-[11px] uppercase tracking-[0.32em] text-white shadow-neon transition hover:bg-neonSecondary disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isDrawing || isProcessing ? "Deploying..." : "Launch mission"}
          </button>
        }
      />

      <section className="grid grid-cols-1 gap-6 md:grid-cols-4">
        <StatCard title="Mission cost" value={`${formatGtk(ticketPrice)} GTK`} hint="GTK consumed per dispatch" />
        <StatCard title="Dispatch tickets" value={ticketBalance} hint="Stored in BlindBox.sol" />
        <StatCard title="GTK allowance" value={allowance} hint="Permission granted to the mission console" />
        <StatCard title="Constructs recovered" value={cards.length} />
      </section>

      {error ? (
        <div className="rounded-3xl border border-red-400/40 bg-red-500/10 p-4 text-[11px] uppercase tracking-[0.28em] text-red-200">
          {error}
        </div>
      ) : null}

      <div className="flex flex-col items-center gap-10">
        <PackOpening isActive={isDrawing}>
          <div className="space-y-6 text-center">
            <p className="text-[11px] uppercase tracking-[0.32em] text-textSecondary">Deploying drones</p>
            <div className="text-sm uppercase tracking-[0.4em] text-neonSecondary">GTK → Shard</div>
            <p className="text-[10px] leading-relaxed text-textSecondary/80">
              Awaiting Sepolia confirmation. Keep the channel open while the relay locks on to the signal.
            </p>
          </div>
        </PackOpening>

        <CardReveal visible={Boolean(result)} rarity={result?.rarity ?? "COMMON"}>
          {result ? <NFTCard metadata={result.metadata} rarity={result.rarity} tokenId={result.tokenId} /> : null}
        </CardReveal>
      </div>

      <section className="rounded-3xl border border-white/10 bg-[#131028]/80 p-8">
        <h3 className="text-sm uppercase tracking-[0.28em] text-white">Recovered constructs</h3>
        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
          {history.map((entry) => (
            <div
              key={`${entry.txHash}-${entry.tokenId.toString()}`}
              className="rounded-2xl border border-white/10 bg-white/5 p-4 text-[11px] uppercase tracking-[0.24em] text-textSecondary"
            >
              <div className="flex justify-between text-white">
                <span>{entry.metadata.name}</span>
                <span>Shard #{entry.tokenId.toString()}</span>
              </div>
              <div className="mt-2 text-[10px] text-textSecondary/80">Rarity: {entry.rarity}</div>
            </div>
          ))}
          {history.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/10 p-6 text-center text-[11px] uppercase tracking-[0.3em] text-textSecondary">
              No salvage logs yet. Dispatch drones to begin cataloguing recovered units.
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}

