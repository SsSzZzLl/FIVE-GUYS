import type { ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}

export default function PageHeader({ title, subtitle, actions }: PageHeaderProps) {
  return (
    <header className="flex flex-col gap-4 rounded-3xl border border-white/10 bg-white/5/70 p-8 backdrop-blur-xs md:flex-row md:items-center md:justify-between">
      <div className="space-y-3">
        <span className="text-[10px] uppercase tracking-[0.4em] text-neonSecondary">Onchain</span>
        <h2 className="text-lg uppercase tracking-[0.3em] text-white">{title}</h2>
        {subtitle ? (
          <p className="max-w-2xl text-[12px] leading-relaxed text-textSecondary">{subtitle}</p>
        ) : null}
      </div>
      {actions ? <div className="flex items-center gap-3">{actions}</div> : null}
    </header>
  );
}

