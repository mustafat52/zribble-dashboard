"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn, SALESPERSON_COLORS } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";
import { useContracts } from "@/lib/api";
import {
  LayoutDashboard, CalendarDays, CreditCard, Users, UserCircle,
  PlusCircle, TrendingUp, ChevronRight, Settings, LogOut, BarChart2,
} from "lucide-react";

// "New Entry" is intentionally excluded here — it's rendered conditionally below
const NAV_ITEMS = [
  { group: "Overview", items: [
    { label: "Dashboard",   href: "/dashboard",   icon: LayoutDashboard },
    { label: "Renewals",    href: "/renewals",    icon: CalendarDays    },
    { label: "Payments",    href: "/payments",    icon: CreditCard      },
  ]},
  { group: "Management", items: [
    { label: "Clients",     href: "/clients",     icon: Users           },
    { label: "Salesperson", href: "/salesperson", icon: UserCircle      },
  ]},
];

// Fixed display order for the quick-links list — kept stable so the nav
// doesn't reshuffle as people's account counts change, and so a salesperson
// with 0 current accounts still has a clickable entry (e.g. a brand-new
// hire with no contracts assigned yet). The *count* shown next to each
// name is now computed live from useContracts() below, matching the same
// distinct-clientName logic the Salesperson page already uses correctly —
// previously this list also stored a frozen `accounts` number per name
// that silently drifted from the real database count over time.
const SALESPEOPLE_ORDER = ["Aftab", "Sarvesh", "Firoz", "Idris", "Prajay", "Vinay"];

export function Sidebar() {
  const pathname  = usePathname();
  const router    = useRouter();
  const { user, canPerform, logout } = useAuth();
  const { data: contracts = [] } = useContracts();

  // Live account count per salesperson — distinct client names (matches
  // ExecStats.tsx's "Active Accounts" calculation on the Salesperson page),
  // not raw contract count, so a client with 2 services counts once.
  const accountCounts: Record<string, number> = {};
  for (const name of SALESPEOPLE_ORDER) {
    accountCounts[name] = new Set(
      contracts.filter((c) => c.salesperson === name).map((c) => c.clientName)
    ).size;
  }

  // Account Managers quick-links: unlike SALESPEOPLE_ORDER above (a fixed,
  // hardcoded team of 6 kept stable so the nav doesn't reshuffle), the AM
  // team is larger (15+ names) and changes more frequently, so names are
  // derived live from contracts rather than hardcoded — a static order list
  // would drift from reality more easily here.
  const accountManagerNames = Array.from(
    new Set(contracts.map((c) => c.accountManager).filter(Boolean))
  ).sort() as string[];

  const amAccountCounts: Record<string, number> = {};
  for (const name of accountManagerNames) {
    amAccountCounts[name] = new Set(
      contracts.filter((c) => c.accountManager === name).map((c) => c.clientName)
    ).size;
  }

  function handleLogout() {
    logout();
    router.replace("/login");
  }

  function navLink(href: string, icon: React.ElementType, label: string) {
    const Icon   = icon;
    const active = pathname === href || pathname.startsWith(href + "/");
    return (
      <li key={href}>
        <Link href={href} className={cn(
          "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150 group",
          active
            ? "bg-accent-light text-accent border border-accent-border"
            : "text-slate-600 hover:text-slate-800 hover:bg-slate-50"
        )}>
          <Icon className={cn("w-4 h-4 flex-shrink-0", active ? "text-accent" : "text-slate-400 group-hover:text-slate-600")} />
          {label}
          {active && <ChevronRight className="w-3 h-3 ml-auto text-accent/50" />}
        </Link>
      </li>
    );
  }

  return (
    <aside className="fixed left-0 top-0 h-screen w-60 bg-white border-r border-slate-200 flex flex-col z-40 shadow-sm">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center shadow-sm">
            <LayoutDashboard className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-800 leading-none">ZribbleOS</p>
            <p className="text-[10px] text-slate-400 mt-0.5">Sales Pipeline</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5 scrollbar-hide">
        {NAV_ITEMS.map((group) => (
          <div key={group.group}>
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest px-2 mb-1.5">{group.group}</p>
            <ul className="space-y-0.5">
              {group.items.map(({ label, href, icon }) => navLink(href, icon, label))}
            </ul>
          </div>
        ))}

        {/* Actions — New Entry only shown to users who can add clients */}
        {canPerform("add_client") && (
          <div>
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest px-2 mb-1.5">Actions</p>
            <ul className="space-y-0.5">
              {navLink("/new-entry", PlusCircle, "New Entry")}
            </ul>
          </div>
        )}

        {/* Insights — all roles get access; the Insights page itself locks filters per role */}
        {canPerform("view_insights") && (
          <div>
            <ul className="space-y-0.5">
              {navLink("/insights", BarChart2, "Insights")}
            </ul>
          </div>
        )}

        {/* Settings — super_admin only */}
        {canPerform("view_settings") && (
          <div>
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest px-2 mb-1.5">Admin</p>
            <ul className="space-y-0.5">
              {navLink("/settings", Settings, "Settings")}
            </ul>
          </div>
        )}

        {/* Exec quick-links — only show for super_admin / accounts_team; employees see only their own */}
        <div>
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest px-2 mb-1.5">Executives</p>
          <ul className="space-y-0.5">
            {SALESPEOPLE_ORDER
              .filter((name) => canPerform("view_all") || user?.salesperson === name)
              .map((name) => (
                <li key={name}>
                  <Link href={`/salesperson?exec=${name}`} className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-sm transition-all duration-150 text-slate-500 hover:text-slate-700 hover:bg-slate-50 group">
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: SALESPERSON_COLORS[name] }} />
                    <span className="flex-1 text-xs">{name}</span>
                    {canPerform("view_all") && <span className="text-[10px] text-slate-400">{accountCounts[name]}</span>}
                  </Link>
                </li>
              ))}
          </ul>
        </div>

        {/* Account Managers quick-links — only show for super_admin / accounts_team; account managers see only their own */}
        {(canPerform("view_all") || user?.role === "account_manager") && (
          <div>
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest px-2 mb-1.5">
              Account Managers
            </p>
            <ul className="space-y-0.5">
              {accountManagerNames
                .filter((name) => canPerform("view_all") || user?.accountManager === name)
                .map((name) => (
                  <li key={name}>
                    <Link href={`/salesperson?exec=${encodeURIComponent(name)}&dimension=am`} className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-sm transition-all duration-150 text-slate-500 hover:text-slate-700 hover:bg-slate-50 group">
                      <span className="w-2 h-2 rounded-full flex-shrink-0 bg-accent-purple" />
                      <span className="flex-1 text-xs">{name}</span>
                      {canPerform("view_all") && <span className="text-[10px] text-slate-400">{amAccountCounts[name]}</span>}
                    </Link>
                  </li>
                ))}
            </ul>
          </div>
        )}
      </nav>

      {/* Footer — user info + logout */}
      <div className="px-4 py-4 border-t border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-full bg-accent-light flex items-center justify-center flex-shrink-0">
            <span className="text-xs font-bold text-accent">{user?.name[0] ?? "?"}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-slate-700 truncate">{user?.name ?? "—"}</p>
            <p className="text-[10px] text-slate-400 truncate">
              {user?.role === "super_admin" ? "Super Admin"
                : user?.role === "accounts_team" ? "Accounts"
                : user?.role === "account_manager" ? `Acct Manager · ${user?.mode === "view_edit" ? "Edit" : "View"}`
                : `Executive · ${user?.mode === "view_edit" ? "Edit" : "View"}`}
            </p>
          </div>
          <button onClick={handleLogout} title="Sign out"
            className="text-slate-400 hover:text-accent-red transition-colors p-1 rounded-lg hover:bg-accent-redLight flex-shrink-0">
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </aside>
  );
}