import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { parseEther } from "viem";
import PageHeader from "@/components/common/PageHeader";
import StatCard from "@/components/common/StatCard";
import { useBlindBox } from "@/hooks/useBlindBox";
import { useNFTCollection } from "@/hooks/useNFTCollection";
import { useDrawStore } from "@/store/useDrawStore";
import { useTokenVendor } from "@/hooks/useTokenVendor";
import { useUserStore } from "@/store/useUserStore";
import { formatGtk } from "@/utils/formatters";

export default function HomePage() {
  const { ticketPrice, ticketBalance, refreshState } = useBlindBox();
  const { cards } = useNFTCollection();
  const { history } = useDrawStore();
  const gtkBalance = useUserStore((state) => state.gtkBalance);
  const { tokensPerEth, buyTokens, isProcessing: isBuying } = useTokenVendor();

  const [ethAmount, setEthAmount] = useState("0.01");
  const [purchaseError, setPurchaseError] = useState<string | null>(null);
  const [lastPurchaseTx, setLastPurchaseTx] = useState<`0x${string}` | null>(null);

  const expectedTokens = useMemo(() => {
    try {
      const wei = parseEther(ethAmount || "0");
      return (wei * tokensPerEth) / 10n ** 18n;
    } catch {
      return 0n;
    }
  }, [ethAmount, tokensPerEth]);

  const handlePurchase = async () => {
    try {
      setPurchaseError(null);
      setLastPurchaseTx(null);

      const wei = parseEther(ethAmount || "0");
      if (wei <= 0n) {
        setPurchaseError("Enter an ETH amount greater than zero.");
        return;
      }

      const txHash = await buyTokens(wei);
      setLastPurchaseTx(txHash);
      await refreshState();
    } catch (error) {
      setPurchaseError(
        error instanceof Error ? error.message : "Purchase failed. Please try again.",
      );
    }
  };

  return (
    <div className="space-y-10 px-10 py-12">
      <PageHeader
        title="Interstellar Salvage Corps"
        subtitle="Dispatch drones to the abandoned ringworld, reclaim construct shards, and keep the relay stocked with fresh discoveries."
        actions={
          <Link
            to="/draw"
            className="rounded-xl bg-neonPrimary px-6 py-3 text-[11px] uppercase tracking-[0.32em] text-white shadow-neon transition hover:bg-neonSecondary"
          >
            Launch Mission
          </Link>
        }
      />

      <section className="grid grid-cols-1 gap-6 md:grid-cols-4">
        <StatCard
          title="Mission cost"
          value={`${formatGtk(ticketPrice)} GTK`}
          hint="GTK required per salvage dispatch"
        />
        <StatCard
          title="Dispatch tickets"
          value={ticketBalance}
          hint="Stored in BlindBox.sol"
        />
        <StatCard
          title="Recovered constructs"
          value={cards.length}
          hint="Inventory pulled from NFTCollection.sol"
        />
        <StatCard
          title="Fuel reserves"
          value={`${formatGtk(gtkBalance)} GTK`}
          hint="GTK balance held by this wallet"
        />
      </section>

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-3xl border border-white/10 bg-[#131028]/80 p-8">
          <h3 className="text-sm uppercase tracking-[0.28em] text-white">Fund the war chest</h3>
          <p className="mt-4 text-[11px] leading-relaxed text-textSecondary">
            Swap ETH for GTK through the TokenVendor relay. Proceeds arrive instantly in your wallet,
            ready to power salvage missions and reassembly experiments.
          </p>

          <div className="mt-6 space-y-4">
            <label className="flex flex-col gap-2 text-[11px] uppercase tracking-[0.28em] text-textSecondary">
              ETH amount
              <input
                type="number"
                min="0"
                step="0.001"
                value={ethAmount}
                onChange={(event) => setEthAmount(event.target.value)}
                className="rounded-xl border border-white/15 bg-[#0F0C1E] px-4 py-3 text-[11px] uppercase tracking-[0.24em] text-white outline-none transition focus:border-neonSecondary"
                placeholder="0.05"
              />
            </label>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-[11px] uppercase tracking-[0.24em] text-textSecondary">
              <div className="flex justify-between">
                <span>Rate</span>
                <span>{formatGtk(tokensPerEth)} GTK · ETH⁻¹</span>
              </div>
              <div className="mt-2 flex justify-between text-white">
                <span>Projected yield</span>
                <span>{formatGtk(expectedTokens)} GTK</span>
              </div>
            </div>

            {purchaseError ? (
              <div className="rounded-xl border border-red-400/50 bg-red-500/10 px-4 py-2 text-[10px] uppercase tracking-[0.24em] text-red-200">
                {purchaseError}
              </div>
            ) : null}

            {lastPurchaseTx ? (
              <a
                href={`https://sepolia.etherscan.io/tx/${lastPurchaseTx}`}
                target="_blank"
                rel="noreferrer"
                className="block rounded-xl border border-neonSecondary px-4 py-2 text-center text-[10px] uppercase tracking-[0.28em] text-neonSecondary hover:bg-neonSecondary/10"
              >
                View transaction #{lastPurchaseTx.slice(0, 10)}…
              </a>
            ) : null}

            <button
              type="button"
              onClick={() => void handlePurchase()}
              disabled={isBuying}
              className="w-full rounded-xl bg-neonPrimary px-5 py-3 text-[11px] uppercase tracking-[0.3em] text-white shadow-neon transition hover:bg-neonSecondary disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isBuying ? "Processing..." : "Top up GTK"}
            </button>
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-[#131028]/80 p-8">
          <h3 className="text-sm uppercase tracking-[0.28em] text-white">Mission protocol</h3>
          <ul className="mt-4 space-y-3 text-[11px] leading-relaxed text-textSecondary">
            <li>1. Queue a top-up above so your reserves cover the next deployment.</li>
            <li>2. Confirm the mission cost and ticket balance before launching drones.</li>
            <li>3. Travel to Salvage Missions, authorize GTK, and recover construct shards.</li>
            <li>4. If refueling fails, verify the TokenVendor vault still holds liquidity.</li>
          </ul>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="rounded-3xl border border-white/10 bg-[#131028]/80 p-8">
          <h3 className="text-sm uppercase tracking-[0.28em] text-white">1. Dispatch</h3>
          <p className="mt-4 text-[11px] leading-relaxed text-textSecondary">
            Call <code className="rounded bg-black/40 px-1">BlindBox.buyTicket()</code> to fund a sortie,
            then dispatch <code className="rounded bg-black/40 px-1">drawCard()</code> for a random shard.
            Animated telemetry keeps you company while Sepolia finalises.
          </p>
          <Link
            to="/draw"
            className="mt-6 inline-flex items-center gap-2 rounded-xl border border-neonSecondary px-4 py-2 text-[11px] uppercase tracking-[0.28em] text-neonSecondary hover:bg-neonSecondary/10"
          >
            Enter Salvage Missions →
          </Link>
        </div>

        <div className="rounded-3xl border border-white/10 bg-[#131028]/80 p-8">
          <h3 className="text-sm uppercase tracking-[0.28em] text-white">2. Trade</h3>
          <p className="mt-4 text-[11px] leading-relaxed text-textSecondary">
            Signal listings on <code className="rounded bg-black/40 px-1">Marketplace.sol</code> to circulate
            surplus modules. Filter by fragment tier, stage direct swaps, and track GTK settlements.
          </p>
          <Link
            to="/market"
            className="mt-6 inline-flex items-center gap-2 rounded-xl border border-neonSecondary px-4 py-2 text-[11px] uppercase tracking-[0.28em] text-neonSecondary hover:bg-neonSecondary/10"
          >
            Visit Relay Bazaar →
          </Link>
        </div>

        <div className="rounded-3xl border border-white/10 bg-[#131028]/80 p-8">
          <h3 className="text-sm uppercase tracking-[0.28em] text-white">3. Reassemble</h3>
          <p className="mt-4 text-[11px] leading-relaxed text-textSecondary">
            Feed five matching shards into <code className="rounded bg-black/40 px-1">CardSynthesis.synthesize()</code>
            and attempt an upgrade. Success yields advanced constructs—failure still returns a fresh fallback unit.
          </p>
          <Link
            to="/synthesis"
            className="mt-6 inline-flex items-center gap-2 rounded-xl border border-neonSecondary px-4 py-2 text-[11px] uppercase tracking-[0.28em] text-neonSecondary hover:bg-neonSecondary/10"
          >
            Open Reassembly Lab →
          </Link>
        </div>
      </section>

      <section className="rounded-3xl border border-white/10 bg-[#131028]/80 p-8">
        <h3 className="text-sm uppercase tracking-[0.28em] text-white">Recent recoveries</h3>
        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
          {history.map((entry) => (
            <div
              key={`${entry.txHash}-${entry.tokenId.toString()}`}
              className="rounded-2xl border border-white/10 bg-white/5 p-4 text-[11px] uppercase tracking-[0.24em] text-textSecondary"
            >
              <div className="flex justify-between text-white">
                <span>Construct</span>
                <span>#{entry.tokenId.toString()}</span>
              </div>
              <div className="mt-2 text-neonSecondary">{entry.metadata.name}</div>
              <div className="mt-2 text-[10px] text-textSecondary/70">Rarity: {entry.rarity}</div>
            </div>
          ))}
          {history.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/10 p-6 text-center text-[11px] uppercase tracking-[0.3em] text-textSecondary">
              No recoveries logged yet. Dispatch a salvage drone from the missions console.
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}

