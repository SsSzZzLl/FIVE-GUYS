export default function LoadingState() {
  return (
    <div className="flex min-h-[320px] flex-col items-center justify-center gap-4 rounded-3xl border border-white/10 bg-white/5 text-xs uppercase tracking-[0.4em] text-textSecondary">
      <span className="animate-pulse text-neonSecondary">Loading</span>
      <span className="text-[10px]">Fetching data from chain...</span>
    </div>
  );
}

