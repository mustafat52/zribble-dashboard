"use client";
import { useMemo } from "react";
import { useActiveContracts } from "@/lib/api";
import { SALESPERSON_COLORS } from "@/lib/utils";
import { cn } from "@/lib/utils";

const EXECS = ["Aftab", "Sarvesh", "Firoz", "Idris", "Prajay", "Vinay"];

// Flat accent used for every Account Manager chip — AMs don't have
// individual per-name colors the way execs do via SALESPERSON_COLORS.
// Swap for your real --accent-purple CSS var/hex if it differs.
const AM_COLOR = "#7C3AED";

interface ExecSelectorProps {
  selected: string;
  onChange: (exec: string) => void;
  /** "exec" (default) shows the fixed Executive list; "am" shows the live Account Manager list */
  dimension?: "exec" | "am";
}

export function ExecSelector({ selected, onChange, dimension = "exec" }: ExecSelectorProps) {
  const { data: allContracts = [] } = useActiveContracts();

  // Executives are a small, fixed team — kept as a stable hardcoded list so
  // the chip order never reshuffles. Account Managers are a larger team that
  // changes more frequently, so their list is derived live from contract
  // data instead — a new AM hire appears automatically once they have
  // contracts assigned, with no code change needed here.
  const names = useMemo(() => {
    if (dimension === "am") {
      return Array.from(new Set(allContracts.map((c) => c.accountManager).filter(Boolean))).sort() as string[];
    }
    return EXECS;
  }, [allContracts, dimension]);

  const accountCounts = useMemo(() => {
    const seen: Record<string, Set<string>> = {};
    allContracts.forEach((c) => {
      const key = dimension === "am" ? c.accountManager : c.salesperson;
      if (!key) return;
      if (!seen[key]) seen[key] = new Set();
      seen[key].add(c.clientName);
    });
    const counts: Record<string, number> = {};
    Object.entries(seen).forEach(([name, clients]) => { counts[name] = clients.size; });
    return counts;
  }, [allContracts, dimension]);

  return (
    <div className="flex flex-wrap gap-2">
      {names.map((name) => {
        const color    = dimension === "am" ? AM_COLOR : (SALESPERSON_COLORS[name] ?? "#3B82F6");
        const isActive = selected === name;
        const count    = accountCounts[name] ?? 0;
        return (
          <button key={name} onClick={() => onChange(name)}
            className={cn(
              "flex items-center gap-2.5 px-4 py-2.5 rounded-xl border text-sm font-medium transition-all duration-150",
              isActive ? "shadow-sm" : "bg-white border-slate-200 text-slate-500 hover:text-slate-700 hover:bg-slate-50 shadow-card"
            )}
            style={isActive ? { backgroundColor: color + "15", borderColor: color + "50", color, boxShadow: `0 2px 8px ${color}20` } : {}}
          >
            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
            <span>{name}</span>
            {count > 0 && (
              <span className="text-[10px] font-normal ml-1 hidden sm:block" style={{ color: isActive ? color + "99" : "#94A3B8" }}>
                {count} accounts
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}