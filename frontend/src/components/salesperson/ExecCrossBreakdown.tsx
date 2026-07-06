"use client";
import { useMemo } from "react";
import Link from "next/link";
import { useActiveContracts } from "@/lib/api";
import { SALESPERSON_COLORS } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { GitBranch } from "lucide-react";

// Flat accent used for every Account Manager chip/dot across the app
// (Settings, Sidebar) since AMs don't have individual per-name colors
// the way execs do via SALESPERSON_COLORS. Swap this for your real
// --accent-purple CSS var/hex if it differs from this value.
const AM_COLOR = "#7C3AED";

interface ExecCrossBreakdownProps {
  /** The exec or AM name currently being viewed */
  exec: string;
  /** Which dimension `exec` refers to */
  dimension: "exec" | "am";
}

/**
 * Shows the cross-dimension composition of whoever is currently being
 * viewed — e.g. viewing Executive "Idris" shows the Account Managers who
 * work on his 14 accounts and how many each handles; viewing Account
 * Manager "Chetan" shows the Executives whose accounts make up his 15.
 * Each chip links straight to that person's own Salesperson View page.
 */
export function ExecCrossBreakdown({ exec, dimension }: ExecCrossBreakdownProps) {
  const { data: allContracts = [] } = useActiveContracts();

  // When viewing an exec, we break down by AM (and vice versa) — this is
  // the *other* dimension from the one currently selected.
  const otherDimension: "exec" | "am" = dimension === "am" ? "exec" : "am";

  const breakdown = useMemo(() => {
    const mine = allContracts.filter((c) =>
      dimension === "am" ? c.accountManager === exec : c.salesperson === exec
    );
    const groups: Record<string, Set<string>> = {};
    mine.forEach((c) => {
      const otherName = dimension === "am" ? c.salesperson : c.accountManager;
      if (!otherName) return;
      if (!groups[otherName]) groups[otherName] = new Set();
      groups[otherName].add(c.clientName);
    });
    return Object.entries(groups)
      .map(([name, clients]) => ({ name, count: clients.size }))
      .sort((a, b) => b.count - a.count);
  }, [allContracts, exec, dimension]);

  const totalAccounts = useMemo(
    () => new Set(
      allContracts
        .filter((c) => (dimension === "am" ? c.accountManager === exec : c.salesperson === exec))
        .map((c) => c.clientName)
    ).size,
    [allContracts, exec, dimension]
  );

  if (breakdown.length === 0) return null;

  const label = otherDimension === "am" ? "Account Managers" : "Executives";

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-card">
      <div className="flex items-center gap-2 mb-3">
        <GitBranch className="w-3.5 h-3.5 text-slate-400" />
        <p className="text-xs font-semibold text-slate-600">
          {label} on {exec}&apos;s accounts
        </p>
        <span className="text-[11px] text-slate-400 ml-auto">
          {totalAccounts} account{totalAccounts !== 1 ? "s" : ""} total
        </span>
      </div>
      <div className="flex flex-wrap gap-2">
        {breakdown.map(({ name, count }) => {
          const color = otherDimension === "am" ? AM_COLOR : SALESPERSON_COLORS[name] ?? "#3B82F6";
          const href = otherDimension === "am"
            ? `/salesperson?exec=${encodeURIComponent(name)}&dimension=am`
            : `/salesperson?exec=${encodeURIComponent(name)}`;
          return (
            <Link
              key={name}
              href={href}
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all",
                "bg-white border-slate-200 text-slate-600 hover:border-slate-300 hover:shadow-sm"
              )}
            >
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
              {name}
              <span className="text-[10px] text-slate-400">{count}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}