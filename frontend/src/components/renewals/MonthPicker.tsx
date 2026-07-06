"use client";
import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";
import { cn, getMonthShort, formatCurrency } from "@/lib/utils";
import { useActiveContracts } from "@/lib/api";
import { useMemo } from "react";

interface MonthPickerProps {
  year: number;
  month: number;
  onChange: (year: number, month: number) => void;
}

const MIN_YEAR = 2026;
const MAX_YEAR = 2028;
const MIN_MONTH_2026 = 7;

export function MonthPicker({ year, month, onChange }: MonthPickerProps) {
  const { data: allContracts = [] } = useActiveContracts();
  const months = Array.from({ length: 12 }, (_, i) => i + 1);
  const canPrevYear = year > MIN_YEAR;
  const canNextYear = year < MAX_YEAR;

  function isDisabled(m: number) {
    return year === MIN_YEAR && m < MIN_MONTH_2026;
  }

  // Compute monthly expected totals from contracts
  const monthlyTotals = useMemo(() => {
    const map: Record<string, { expected: number; collected: number; pending: number }> = {};
    allContracts.forEach((c) => {
      (c.renewalSchedule ?? []).forEach((r) => {
        const key = `${r.year}-${r.month}`;
        if (!map[key]) map[key] = { expected: 0, collected: 0, pending: 0 };
        map[key].expected += r.amount;
        if (r.status === "collected") {
          map[key].collected += r.amount;
        } else if (r.status === "partial") {
          const paid = (r as any).payments?.reduce((a: number, p: any) => a + p.amount, 0) ?? 0;
          map[key].collected += paid;
          map[key].pending   += r.amount - paid;
        } else {
          map[key].pending += r.amount;
        }
      });
    });
    return map;
  }, [allContracts]);

  const monthValues = months.map((m) => monthlyTotals[`${year}-${m}`]?.expected ?? 0);
  const maxVal = Math.max(...monthValues, 1);

  const selectedTotals = monthlyTotals[`${year}-${month}`];
  const pct = selectedTotals && selectedTotals.expected > 0
    ? Math.round((selectedTotals.collected / selectedTotals.expected) * 100)
    : 0;

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-card select-none">
      {/* Year nav */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => canPrevYear && onChange(year - 1, month)}
          disabled={!canPrevYear}
          className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <div className="flex items-center gap-2">
          <CalendarDays className="w-3.5 h-3.5 text-accent" />
          <span className="text-sm font-semibold text-slate-700">{year}</span>
        </div>
        <button
          onClick={() => canNextYear && onChange(year + 1, month)}
          disabled={!canNextYear}
          className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* Month grid */}
      <div className="grid grid-cols-4 gap-1.5">
        {months.map((m) => {
          const disabled = isDisabled(m);
          const active   = m === month;
          const val      = monthValues[m - 1];
          const barH     = Math.round((val / maxVal) * 16);
          return (
            <button
              key={m}
              disabled={disabled}
              onClick={() => !disabled && onChange(year, m)}
              className={cn(
                "relative flex flex-col items-center gap-1 py-2 px-1 rounded-lg transition-all duration-150 text-xs font-medium",
                active
                  ? "bg-accent text-white shadow-sm"
                  : disabled
                  ? "text-slate-300 cursor-not-allowed"
                  : "text-slate-500 hover:text-slate-700 hover:bg-slate-50"
              )}
            >
              {!disabled && (
                <div className="w-full flex items-end justify-center h-4">
                  <div
                    className={cn("w-3 rounded-sm transition-all", active ? "bg-white/30" : "bg-slate-200")}
                    style={{ height: `${Math.max(barH, 2)}px` }}
                  />
                </div>
              )}
              {getMonthShort(m)}
            </button>
          );
        })}
      </div>

      {/* Selected month summary */}
      {selectedTotals && selectedTotals.expected > 0 && (
        <div className="mt-4 pt-3 border-t border-slate-100 space-y-2">
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest">
            {getMonthShort(month)} {year} Summary
          </p>
          <div className="flex justify-between text-xs">
            <span className="text-slate-400">Expected</span>
            <span className="font-semibold text-slate-700">{formatCurrency(selectedTotals.expected)}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-slate-400">Collected</span>
            <span className="font-semibold text-accent-green">{formatCurrency(selectedTotals.collected)}</span>
          </div>
          <div className="flex justify-between text-xs">
            <span className="text-slate-400">Pending</span>
            <span className="font-semibold text-accent-amber">{formatCurrency(selectedTotals.pending)}</span>
          </div>
          <div className="mt-1">
            <div className="flex justify-between text-[10px] text-slate-400 mb-1">
              <span>Collection rate</span>
              <span>{pct}%</span>
            </div>
            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className={cn("h-full rounded-full transition-all duration-500",
                  pct >= 80 ? "bg-accent-green" : pct >= 50 ? "bg-accent-amber" : "bg-accent-red"
                )}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}