interface StatCardProps {
  title: string;
  value: string | number | bigint;
  hint?: string;
}

export default function StatCard({ title, value, hint }: StatCardProps) {
  return (
    <div className="rounded-2xl border border-white/10 bg-[#121026]/70 p-6 shadow-[0_0_20px_rgba(10,10,35,0.25)]">
      <span className="text-[9px] uppercase tracking-[0.32em] text-textSecondary">{title}</span>
      <div className="mt-4 text-lg uppercase tracking-[0.28em] text-neonSecondary">
        {typeof value === "bigint" ? value.toString() : value}
      </div>
      {hint ? <p className="mt-2 text-[11px] text-textSecondary/70">{hint}</p> : null}
    </div>
  );
}

