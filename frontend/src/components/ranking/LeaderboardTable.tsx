import type { RankingEntry } from "@/hooks/useRanking";
import { shortAddress } from "@/utils/formatters";

interface LeaderboardTableProps {
  title: string;
  entries: RankingEntry[];
}

export default function LeaderboardTable({ title, entries }: LeaderboardTableProps) {
  return (
    <section className="rounded-3xl border border-white/10 bg-[#121026]/80 p-6">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <span className="text-[9px] uppercase tracking-[0.28em] text-textSecondary/70">Ranking</span>
          <h3 className="mt-2 text-sm uppercase tracking-[0.24em]">{title}</h3>
        </div>
        <span className="text-[10px] text-textSecondary/70">{entries.length} players</span>
      </header>
      <div className="space-y-3">
        {entries.map((entry, index) => (
          <div
            key={`${entry.address}-${entry.value}-${index}`}
            className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-[11px] uppercase tracking-[0.24em]"
          >
            <span className="text-neonSecondary">{index + 1}</span>
            <span className="text-textSecondary">{shortAddress(entry.address)}</span>
            <span className="text-white">{entry.value}</span>
          </div>
        ))}
        {entries.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 px-4 py-6 text-center text-[10px] uppercase tracking-[0.28em] text-textSecondary/70">
            No data yet.
          </div>
        ) : null}
      </div>
    </section>
  );
}

