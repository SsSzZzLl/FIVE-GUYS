import { NavLink } from "react-router-dom";
import { ConnectButton } from "@rainbow-me/rainbowkit";

const NAV_LINKS = [
  { to: "/", label: "Command", icon: "🛰️" },
  { to: "/draw", label: "Missions", icon: "🚀" },
  { to: "/collection", label: "Hangar", icon: "🗄️" },
  { to: "/market", label: "Relay Bazaar", icon: "📡" },
  { to: "/ranking", label: "Mission Board", icon: "📊" },
  { to: "/synthesis", label: "Reassembly", icon: "🧪" },
  { to: "/connect", label: "Link Relay", icon: "🔌" },
] as const;

export default function SidebarNav() {
  return (
    <aside className="flex w-64 flex-col justify-between border-r border-white/10 bg-[#111024]">
      <div>
        <div className="space-y-2 px-6 pb-6 pt-10">
          <span className="block text-[10px] uppercase tracking-[0.4em] text-neonSecondary/80">
            Corps Relay
          </span>
          <h1 className="font-arcade text-[18px] leading-none text-neonSecondary drop-shadow-[0_0_12px_rgba(83,246,219,0.45)]">
            INTERSTELLAR OPS
          </h1>
          <p className="text-[10px] leading-relaxed text-textSecondary/80">
            Deploy drones, route shards through the bazaar, and rebuild constructs across Sepolia.
          </p>
        </div>

        <nav className="mt-4 space-y-1 px-2">
          {NAV_LINKS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                [
                  "flex items-center gap-3 rounded-xl px-4 py-3 text-[11px] uppercase tracking-[0.28em] transition",
                  isActive
                    ? "bg-white/10 text-neonSecondary shadow-neon"
                    : "text-textSecondary hover:bg-white/5 hover:text-neonSecondary",
                ].join(" ")
              }
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
      </div>

      <div className="border-t border-white/10 p-6">
        <ConnectButton
          chainStatus="icon"
          showBalance={{
            smallScreen: false,
            largeScreen: true,
          }}
        />
      </div>
    </aside>
  );
}

