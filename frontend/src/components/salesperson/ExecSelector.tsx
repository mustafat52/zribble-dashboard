"use client";
import { useMemo } from "react";
import { useContracts } from "@/lib/api";
import { SALESPERSON_COLORS } from "@/lib/utils";
import { cn } from "@/lib/utils";

const EXECS = ["Aftab", "Sarvesh", "Firoz", "Idris", "Prajay", "Vinay"];

interface ExecSelectorProps { selected: string; onChange: (exec: string) => void; }

export function ExecSelector({ selected, onChange }: ExecSelectorProps) {
  const { data: allContracts = [] } = useContracts();

  const accountCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    const seen: Record<string, Set<string>> = {};
    allContracts.forEach((c) => {
      if (!seen[c.salesperson]) seen[c.salesperson] = new Set();
      seen[c.salesperson].add(c.clientName);
    });
    Object.entries(seen).forEach(([sp, clients]) => { counts[sp] = clients.size; });
    return counts;
  }, [allContracts]);

  return (
    <div className="flex flex-wrap gap-2">
      {EXECS.map((exec) => {
        const color    = SALESPERSON_COLORS[exec];
        const isActive = selected === exec;
        const count    = accountCounts[exec] ?? 0;
        return (
          <button key={exec} onClick={() => onChange(exec)}
            className={cn(
              "flex items-center gap-2.5 px-4 py-2.5 rounded-xl border text-sm font-medium transition-all duration-150",
              isActive ? "shadow-sm" : "bg-white border-slate-200 text-slate-500 hover:text-slate-700 hover:bg-slate-50 shadow-card"
            )}
            style={isActive ? { backgroundColor: color + "15", borderColor: color + "50", color, boxShadow: `0 2px 8px ${color}20` } : {}}
          >
            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
            <span>{exec}</span>
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