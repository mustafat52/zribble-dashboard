"use client";
import { usePathname } from "next/navigation";
import { Search, Bell, RefreshCw, Shield } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { cn, formatCurrency } from "@/lib/utils";
import { useContracts } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

const PAGE_TITLES: Record<string, { title: string; subtitle: string }> = {
  "/dashboard":   { title: "Dashboard",        subtitle: "Command center — portfolio overview"           },
  "/renewals":    { title: "Renewal Calendar",  subtitle: "Monthly renewal schedule & status tracking"   },
  "/payments":    { title: "Payment Tracker",   subtitle: "Collections, partials & outstanding balances" },
  "/clients":     { title: "Clients",           subtitle: "All accounts and contract details"            },
  "/salesperson": { title: "Salesperson View",  subtitle: "Per-executive portfolio breakdown"            },
  "/new-entry":   { title: "New Entry",         subtitle: "Add a new client contract"                   },
  "/settings":    { title: "Settings",          subtitle: "Users and application preferences"            },
  "/insights":    { title: "Insights",          subtitle: "Filter and analyse the full portfolio"        },
};

const ROLE_BADGE: Record<string, { label: string; cls: string }> = {
  super_admin:   { label: "Super Admin", cls: "bg-accent-light text-accent border-accent-border" },
  accounts_team: { label: "Accounts",   cls: "bg-cyan-50 text-accent-cyan border-cyan-200"      },
  employee:      { label: "Executive",  cls: "bg-slate-100 text-slate-600 border-slate-200"     },
};

export function Topbar() {
  const pathname = usePathname();
  const { user } = useAuth();
  const [searchOpen, setSearchOpen] = useState(false);
  const [mounted,    setMounted]    = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const { data: allContracts = [] } = useContracts();

  // Compute this month's stats from real contracts
  const stats = useMemo(() => {
    const now   = new Date();
    const year  = now.getFullYear();
    const month = now.getMonth() + 1;
    const execFilter = user?.role === "employee" ? user.salesperson : null;
    const contracts = execFilter
      ? allContracts.filter((c) => c.salesperson === execFilter)
      : allContracts;

    const expected = contracts.reduce((sum, c) =>
      sum + (c.renewalSchedule ?? []).filter((r) => r.year === year && r.month === month).reduce((a, r) => a + r.amount, 0), 0);
    const collected = contracts.reduce((sum, c) =>
      sum + (c.renewalSchedule ?? []).filter((r) => r.year === year && r.month === month && r.status === "collected").reduce((a, r) => a + r.amount, 0), 0);
    const overdue = contracts.reduce((sum, c) =>
      sum + (c.renewalSchedule ?? []).filter((r) => r.status === "overdue").length, 0);
    const monthLabel = now.toLocaleString("en-IN", { month: "long", year: "numeric" });

    return { expected, collected, pending: expected - collected, overdue, monthLabel };
  }, [allContracts, user]);

  const page  = PAGE_TITLES[pathname] ?? { title: "ZribbleOS", subtitle: "" };
  const badge = user ? ROLE_BADGE[user.role] : null;

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
        {mounted ? stats.monthLabel : "—"}
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

      {/* Stats pill */}
      {mounted && (
        <div className="hidden lg:flex items-center gap-3 px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200">
          <div className="text-center">
            <p className="text-[10px] text-slate-400 leading-none">Expected</p>
            <p className="text-xs font-semibold text-slate-700 mt-0.5">{formatCurrency(stats.expected)}</p>
          </div>
          <div className="w-px h-6 bg-slate-200" />
          <div className="text-center">
            <p className="text-[10px] text-slate-400 leading-none">Collected</p>
            <p className="text-xs font-semibold text-accent-green mt-0.5">{formatCurrency(stats.collected)}</p>
          </div>
          <div className="w-px h-6 bg-slate-200" />
          <div className="text-center">
            <p className="text-[10px] text-slate-400 leading-none">Pending</p>
            <p className="text-xs font-semibold text-accent-amber mt-0.5">{formatCurrency(stats.pending)}</p>
          </div>
        </div>
      )}

      {/* Role badge */}
      {mounted && badge && (
        <div className={cn("hidden sm:flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full border", badge.cls)}>
          <Shield className="w-3 h-3" />
          {badge.label}
          {user?.salesperson && <span className="text-current/70">· {user.salesperson}</span>}
        </div>
      )}

      <button className="text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-lg hover:bg-slate-100">
        <RefreshCw className="w-3.5 h-3.5" />
      </button>

      <button className="relative text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-lg hover:bg-slate-100">
        <Bell className="w-4 h-4" />
        {mounted && stats.overdue > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-accent-red text-[8px] font-bold text-white flex items-center justify-center">
            {stats.overdue > 9 ? "9+" : stats.overdue}
          </span>
        )}
      </button>
    </header>
  );
}