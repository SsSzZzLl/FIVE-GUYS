import { ConnectButton } from "@rainbow-me/rainbowkit";
import PageHeader from "@/components/common/PageHeader";

export default function ConnectPage() {
  return (
    <div className="space-y-10 px-10 py-12">
      <PageHeader
        title="Relay Access"
        subtitle="Link a wallet to tap into mission consoles, the relay bazaar, and the reassembly lab. RainbowKit handles the jump sequence."
      />

      <section className="rounded-3xl border border-white/10 bg-[#131028]/80 p-10 text-center">
        <p className="text-[11px] uppercase tracking-[0.32em] text-textSecondary">
          Select a wallet channel to begin
        </p>
        <div className="mt-6 flex justify-center">
          <ConnectButton />
        </div>
      </section>
    </div>
  );
}

