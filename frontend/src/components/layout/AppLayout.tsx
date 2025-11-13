import { Suspense } from "react";
import { Outlet } from "react-router-dom";
import SidebarNav from "./SidebarNav";

export default function AppLayout() {
  return (
    <div className="flex min-h-screen bg-surface text-textPrimary">
      <SidebarNav />
      <main className="flex-1 overflow-y-auto">
        <Suspense
          fallback={
            <div className="flex h-full items-center justify-center text-xs uppercase tracking-[0.4em] text-textSecondary">
              Loading...
            </div>
          }
        >
          <Outlet />
        </Suspense>
      </main>
    </div>
  );
}

