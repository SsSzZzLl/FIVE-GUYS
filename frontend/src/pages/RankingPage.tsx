import PageHeader from "@/components/common/PageHeader";
import LoadingState from "@/components/common/LoadingState";
import LeaderboardTable from "@/components/ranking/LeaderboardTable";
import { useRanking } from "@/hooks/useRanking";

export default function RankingPage() {
  const ranking = useRanking();

  return (
    <div className="space-y-10 px-10 py-12">
      <PageHeader
        title="Mission Board"
        subtitle="Monitor Corps activity across the relay: sorties completed, GTK flow, and accumulated rarity resonance."
      />
      {ranking.isLoading ? (
        <LoadingState />
      ) : (
        <div className="space-y-8">
          <LeaderboardTable title="Salvage sorties completed" entries={ranking.draws} />
          <LeaderboardTable title="GTK earned via relay" entries={ranking.profits} />
          <LeaderboardTable title="Rarity resonance accrued" entries={ranking.rarity} />
        </div>
      )}
    </div>
  );
}

