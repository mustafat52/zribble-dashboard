"use client";
import { usePathname, useRouter } from "next/navigation";
import { Search, Bell, RefreshCw, Shield, X } from "lucide-react";
import { useState, useEffect, useMemo, useRef } from "react";
import { cn, formatCurrency, SALESPERSON_COLORS } from "@/lib/utils";
import { useContracts, useActiveContracts } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { useClient } from "@/lib/client-context";

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

const MAX_RESULTS = 8;

export function Topbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuth();
  const { openClient } = useClient();
  const [searchOpen, setSearchOpen] = useState(false);
  const [query,      setQuery]      = useState("");
  const [mounted,    setMounted]    = useState(false);
  const searchWrapRef = useRef<HTMLDivElement>(null);
  useEffect(() => { setMounted(true); }, []);

  const { data: allContracts = [] } = useContracts();
  const { data: activeContracts = [] } = useActiveContracts();

  // Compute this month's stats from real contracts
  const stats = useMemo(() => {
    const now   = new Date();
    const year  = now.getFullYear();
    const month = now.getMonth() + 1;
    const execFilter = user?.role === "employee" ? user.salesperson : null;
    const contracts = execFilter
      ? activeContracts.filter((c) => c.salesperson === execFilter)
      : activeContracts;

    const expected = contracts.reduce((sum, c) =>
      sum + (c.renewalSchedule ?? []).filter((r) => r.year === year && r.month === month).reduce((a, r) => a + r.amount, 0), 0);
    const collected = contracts.reduce((sum, c) =>
      sum + (c.renewalSchedule ?? []).filter((r) => r.year === year && r.month === month && r.status === "collected").reduce((a, r) => a + r.amount, 0), 0);
    const overdue = contracts.reduce((sum, c) =>
      sum + (c.renewalSchedule ?? []).filter((r) => r.status === "overdue").length, 0);
    const monthLabel = now.toLocaleString("en-IN", { month: "long", year: "numeric" });

    return { expected, collected, pending: expected - collected, overdue, monthLabel };
  }, [allContracts, user]);

  // Search results — grouped by unique client, matched by name OR Contract ID.
  // Scoped to the same role-based visibility as everywhere else in the app:
  // employees only see their own book of business.
  const searchResults = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    const execFilter = user?.role === "employee" ? user.salesperson : null;
    const scoped = execFilter
      ? allContracts.filter((c) => c.salesperson === execFilter)
      : allContracts;

    const matches = scoped.filter((c) =>
      c.clientName.toLowerCase().includes(q) ||
      (c.contractId ?? "").toLowerCase().includes(q)
    );

    // Dedupe to one entry per client, keep the first matching contract as representative
    const seen = new Set<string>();
    const results: typeof matches = [];
    for (const c of matches) {
      if (seen.has(c.clientName)) continue;
      seen.add(c.clientName);
      results.push(c);
      if (results.length >= MAX_RESULTS) break;
    }
    return results;
  }, [query, allContracts, user]);

  function handleSelectResult(clientName: string) {
    openClient(clientName);
    setQuery("");
    setSearchOpen(false);
    if (pathname !== "/clients") router.push("/clients");
  }

  function handleClose() {
    setSearchOpen(false);
    setQuery("");
  }

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
      <div ref={searchWrapRef} className={cn("relative transition-all duration-200", searchOpen ? "w-72" : "w-8")}>
        {searchOpen && (
          <>
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Escape") handleClose(); }}
              placeholder="Search by client name or ID…"
              className="w-full bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 placeholder:text-slate-400 pl-7 pr-7 py-1.5 focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/20"
            />
            {query && (
              <button
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => setQuery("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3 h-3" />
              </button>
            )}

            {/* Results dropdown */}
            {query.trim() && (
              <div className="absolute top-full mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg z-40 max-h-72 overflow-y-auto">
                {searchResults.length === 0 ? (
                  <p className="px-3 py-2.5 text-xs text-slate-400">No clients match &quot;{query}&quot;</p>
                ) : (
                  searchResults.map((c) => (
                    <button
                      key={c.clientName}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => handleSelectResult(c.clientName)}
                      className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-accent-light/40 transition-colors text-left border-b border-slate-100 last:border-b-0"
                    >
                      <span
                        className="w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-bold flex-shrink-0"
                        style={{ backgroundColor: (SALESPERSON_COLORS[c.salesperson] ?? "#3B82F6") + "20", color: SALESPERSON_COLORS[c.salesperson] ?? "#3B82F6" }}
                      >
                        {c.clientName.charAt(0)}
                      </span>
                      <span className="flex-1 min-w-0">
                        <span className="block text-xs font-medium text-slate-700 truncate">{c.clientName}</span>
                        <span className="block text-[10px] text-slate-400 truncate">
                          {c.salesperson}
                          {c.contractId ? ` · ID: ${c.contractId}` : ""}
                        </span>
                      </span>
                    </button>
                  ))
                )}
              </div>
            )}
          </>
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