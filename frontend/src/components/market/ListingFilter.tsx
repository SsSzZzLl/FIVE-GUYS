import type { MarketFilters } from "@/types/market";
import { RARITY_OPTIONS } from "@/utils/rarity";

interface ListingFilterProps {
  filters: MarketFilters;
  onChange: (filters: MarketFilters) => void;
}

export default function ListingFilter({ filters, onChange }: ListingFilterProps) {
  return (
    <section className="mt-10 grid grid-cols-1 gap-4 rounded-3xl border border-white/10 bg-white/5 p-6 md:grid-cols-4">
      <div className="space-y-2">
        <label className="text-[9px] uppercase tracking-[0.32em] text-textSecondary">Rarity</label>
        <select
          value={filters.rarity ?? "ALL"}
          onChange={(event) =>
            onChange({
              ...filters,
              rarity: event.target.value === "ALL" ? "ALL" : (event.target.value as MarketFilters["rarity"]),
            })
          }
          className="w-full rounded-xl border border-white/20 bg-[#121026] px-3 py-2 text-[11px] uppercase tracking-[0.2em]"
        >
          <option value="ALL">All</option>
          {RARITY_OPTIONS.map((rarity) => (
            <option key={rarity.value} value={rarity.value}>
              {rarity.label}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <label className="text-[9px] uppercase tracking-[0.32em] text-textSecondary">Min Price</label>
        <input
          type="number"
          min={0}
          value={filters.minPrice ?? ""}
          onChange={(event) =>
            onChange({
              ...filters,
              minPrice: event.target.value ? Number(event.target.value) : undefined,
            })
          }
          className="w-full rounded-xl border border-white/20 bg-[#121026] px-3 py-2 text-[11px] uppercase tracking-[0.2em]"
          placeholder="GTK"
        />
      </div>

      <div className="space-y-2">
        <label className="text-[9px] uppercase tracking-[0.32em] text-textSecondary">Max Price</label>
        <input
          type="number"
          min={0}
          value={filters.maxPrice ?? ""}
          onChange={(event) =>
            onChange({
              ...filters,
              maxPrice: event.target.value ? Number(event.target.value) : undefined,
            })
          }
          className="w-full rounded-xl border border-white/20 bg-[#121026] px-3 py-2 text-[11px] uppercase tracking-[0.2em]"
          placeholder="GTK"
        />
      </div>

      <div className="space-y-2">
        <label className="text-[9px] uppercase tracking-[0.32em] text-textSecondary">Sort</label>
        <select
          value={filters.sortBy}
          onChange={(event) =>
            onChange({
              ...filters,
              sortBy: event.target.value as MarketFilters["sortBy"],
            })
          }
          className="w-full rounded-xl border border-white/20 bg-[#121026] px-3 py-2 text-[11px] uppercase tracking-[0.2em]"
        >
          <option value="recent">Most recent</option>
          <option value="priceAsc">Price ↑</option>
          <option value="priceDesc">Price ↓</option>
          <option value="rarity">Rarity</option>
        </select>
      </div>
    </section>
  );
}

