"use client";
import { useRef } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { MONTHLY_TOTALS } from "@/lib/mock-data";
import { formatCurrency, getMonthShort } from "@/lib/utils";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { DateRange } from "@/app/dashboard/page";
import { cn } from "@/lib/utils";

interface RevenueChartProps {
  range: DateRange;
  months: number;
  onMonthsChange: (m: number) => void;
}

const QUICK = [3, 6, 12, 18, 30];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-lg text-xs space-y-1.5 min-w-[160px]">
      <p className="text-slate-600 font-medium mb-2">{label}</p>
      {payload.map((p: any) => (
        <div key={p.name} className="flex items-center justify-between gap-6">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.fill || p.color }} />
            <span className="text-slate-500">{p.name}</span>
          </span>
          <span className="font-semibold text-slate-700">{formatCurrency(p.value)}</span>
        </div>
      ))}
      {payload.length === 2 && (
        <div className="border-t border-slate-100 pt-1.5 mt-1.5 flex items-center justify-between">
          <span className="text-slate-400">Pending</span>
          <span className="font-semibold text-accent-amber">
            {formatCurrency((payload[0]?.value || 0) - (payload[1]?.value || 0))}
          </span>
        </div>
      )}
    </div>
  );
};

function inRange(year: number, month: number, range: DateRange) {
  const val = year * 100 + month;
  return val >= range.fromYear * 100 + range.fromMonth &&
         val <= range.toYear   * 100 + range.toMonth;
}

export function RevenueChart({ range, months, onMonthsChange }: RevenueChartProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const data = MONTHLY_TOTALS
    .filter((m) => inRange(m.year, m.month, range))
    .map((m) => ({
      name:      `${getMonthShort(m.month)} '${String(m.year).slice(2)}`,
      Expected:  m.expected,
      Collected: m.collected,
    }));

  const totalExpected  = data.reduce((a, d) => a + d.Expected,  0);
  const totalCollected = data.reduce((a, d) => a + d.Collected, 0);

  function handleInput(val: string) {
    const n = parseInt(val, 10);
    if (!isNaN(n) && n >= 1) onMonthsChange(Math.min(n, 30));
  }

  return (
    <Card className="col-span-2">
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div className="min-w-0">
          <CardTitle>Revenue Pipeline</CardTitle>
          <p className="text-xs text-slate-400 mt-0.5">
            {formatCurrency(totalExpected)} expected · {formatCurrency(totalCollected)} collected
          </p>
        </div>

        {/* Range selector */}
        <div className="flex flex-col items-end gap-2 flex-shrink-0">
          {/* Quick chips */}
          <div className="flex items-center gap-1">
            {QUICK.map((q) => (
              <button
                key={q}
                onClick={() => onMonthsChange(q)}
                className={cn(
                  "text-[11px] font-semibold px-2.5 py-1 rounded-lg border transition-all",
                  months === q
                    ? "bg-accent text-white border-accent shadow-sm"
                    : "bg-white text-slate-500 border-slate-200 hover:border-slate-300 hover:text-slate-700"
                )}
              >
                {q === 30 ? "All" : `${q}m`}
              </button>
            ))}
          </div>

          {/* Custom month input */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-slate-400">Custom:</span>
            <input
              ref={inputRef}
              type="number"
              min={1}
              max={30}
              value={QUICK.includes(months) ? "" : months}
              onChange={(e) => handleInput(e.target.value)}
              placeholder="e.g. 9"
              className={cn(
                "w-16 px-2 py-1 text-xs text-center border rounded-lg focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/20 text-slate-700",
                !QUICK.includes(months)
                  ? "border-accent bg-accent-light/30"
                  : "border-slate-200 bg-white"
              )}
            />
            <span className="text-[11px] text-slate-400">months</span>
          </div>
        </div>
      </CardHeader>

      {/* Range label */}
      <div className="px-5 pb-1">
        <span className="text-[11px] text-slate-400">
          Showing <span className="font-semibold text-slate-600">
            Jul 2026 → {getMonthShort(range.toMonth)} {range.toYear}
          </span> ({range.months} month{range.months !== 1 ? "s" : ""})
        </span>
      </div>

      <div className="px-2 pt-2 pb-2 h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} barGap={2} barCategoryGap="30%">
            <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
            <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
            <YAxis tickFormatter={(v) => formatCurrency(v)} tick={{ fontSize: 10, fill: "#94A3B8" }} axisLine={false} tickLine={false} width={70} />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(79,70,229,0.04)" }} />
            <Legend wrapperStyle={{ fontSize: 11, color: "#94A3B8", paddingTop: 12 }} iconType="circle" iconSize={6} />
            <Bar dataKey="Expected"  fill="#E0E7FF" radius={[3, 3, 0, 0]} />
            <Bar dataKey="Collected" fill="#4F46E5" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}