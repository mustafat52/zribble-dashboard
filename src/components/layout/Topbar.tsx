"use client";
import { usePathname } from "next/navigation";
import { Search, Bell, RefreshCw } from "lucide-react";
import { useState, useEffect } from "react";
import { cn, formatCurrency } from "@/lib/utils";
import { DASHBOARD_STATS } from "@/lib/mock-data";

const PAGE_TITLES: Record<string, { title: string; subtitle: string }> = {
  "/dashboard":   { title: "Dashboard",        subtitle: "Command center — portfolio overview"          },
  "/renewals":    { title: "Renewal Calendar",  subtitle: "Monthly renewal schedule & status tracking"  },
  "/payments":    { title: "Payment Tracker",   subtitle: "Collections, partials & outstanding balances"},
  "/clients":     { title: "Clients",           subtitle: "All accounts and contract details"           },
  "/salesperson": { title: "Salesperson View",  subtitle: "Per-executive portfolio breakdown"           },
  "/new-entry":   { title: "New Entry",         subtitle: "Add a new client contract"                  },
};

export function Topbar() {
  const pathname    = usePathname();
  const [searchOpen, setSearchOpen] = useState(false);
  const [mounted,    setMounted]    = useState(false);

  // Only render dynamic stats on client to avoid hydration mismatch
  useEffect(() => { setMounted(true); }, []);

  const page    = PAGE_TITLES[pathname] ?? { title: "RenewalOS", subtitle: "" };
  const overdue = DASHBOARD_STATS.overdueCount;

  return (
    <header className="fixed top-0 left-60 right-0 h-14 bg-white/95 backdrop-blur-md border-b border-slate-200 z-30 flex items-center px-6 gap-4 shadow-sm">
      {/* Page title */}
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2">
          <h1 className="text-sm font-semibold text-slate-800 truncate">{page.title}</h1>
          {page.subtitle && (
            <span className="text-xs text-slate-400 hidden md:block truncate">— {page.subtitle}</span>
          )}
        </div>
      </div>

      {/* Month chip */}
      <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-500">
        <div className="w-1.5 h-1.5 rounded-full bg-accent-green animate-pulse-slow" />
        June 2026
      </div>

      {/* Search */}
      <div className={cn("relative transition-all duration-200", searchOpen ? "w-56" : "w-8")}>
        {searchOpen && (
          <input autoFocus onBlur={() => setSearchOpen(false)} placeholder="Search clients..."
            className="w-full bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 placeholder:text-slate-400 px-3 py-1.5 pl-7 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/20" />
        )}
        <button onClick={() => setSearchOpen(true)}
          className={cn("absolute top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors", searchOpen ? "left-2" : "left-0")}>
          <Search className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Stats pill — client only to prevent hydration mismatch */}
      {mounted && (
        <div className="hidden lg:flex items-center gap-3 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200">
          <div className="text-center">
            <p className="text-[10px] text-slate-400 leading-none">Expected Jul</p>
            <p className="text-xs font-semibold text-slate-700 mt-0.5">{formatCurrency(DASHBOARD_STATS.thisMonthExpected)}</p>
          </div>
          <div className="w-px h-6 bg-slate-200" />
          <div className="text-center">
            <p className="text-[10px] text-slate-400 leading-none">Collected</p>
            <p className="text-xs font-semibold text-accent-green mt-0.5">{formatCurrency(DASHBOARD_STATS.thisMonthCollected)}</p>
          </div>
          <div className="w-px h-6 bg-slate-200" />
          <div className="text-center">
            <p className="text-[10px] text-slate-400 leading-none">Pending</p>
            <p className="text-xs font-semibold text-accent-amber mt-0.5">{formatCurrency(DASHBOARD_STATS.thisMonthPending)}</p>
          </div>
        </div>
      )}

      <button className="text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-lg hover:bg-slate-100">
        <RefreshCw className="w-3.5 h-3.5" />
      </button>

      <button className="relative text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-lg hover:bg-slate-100">
        <Bell className="w-4 h-4" />
        {mounted && overdue > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-accent-red text-[8px] font-bold text-white flex items-center justify-center">
            {overdue > 9 ? "9+" : overdue}
          </span>
        )}
      </button>
    </header>
  );
}