"use client";
import { useState, useMemo } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { useContracts } from "@/lib/api";
import { formatCurrency, getMonthShort, SALESPERSON_COLORS } from "@/lib/utils";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

type YearFilter = 2026 | 2027 | 2028;
const YEARS: YearFilter[] = [2026, 2027, 2028];

const CustomTooltip = ({ active, payload, label, color }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-lg text-xs min-w-[140px]">
      <p className="text-slate-500 font-medium mb-1.5">{label}</p>
      <div className="flex items-center justify-between gap-4">
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
          <span className="text-slate-400">Expected</span>
        </span>
        <span className="font-semibold text-slate-700">{formatCurrency(payload[0]?.value ?? 0)}</span>
      </div>
    </div>
  );
};

export function ExecChart({ exec }: { exec: string }) {
  const [year, setYear] = useState<YearFilter>(2026);
  const color = SALESPERSON_COLORS[exec];
  const { data: allContracts = [], isLoading } = useContracts();

  const contracts = useMemo(
    () => allContracts.filter((c) => c.salesperson === exec),
    [allContracts, exec]
  );

  const data = useMemo(() =>
    Array.from({ length: 12 }, (_, i) => {
      const month = i + 1;
      const total = contracts.reduce((sum, c) => {
        const r = (c.renewalSchedule ?? []).find((r) => r.year === year && r.month === month);
        return sum + (r?.amount ?? 0);
      }, 0);
      return { name: getMonthShort(month), Expected: total };
    }), [contracts, year]);

  const yearTotal = data.reduce((a, d) => a + d.Expected, 0);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>{exec} — Monthly Renewals</CardTitle>
          <p className="text-xs text-slate-400 mt-0.5">
            {isLoading ? "Loading..." : `${year} total: `}
            {!isLoading && <span className="font-semibold text-slate-600">{formatCurrency(yearTotal)}</span>}
          </p>
        </div>
        <div className="flex gap-1">
          {YEARS.map((y) => (
            <Button key={y} size="sm" variant={year === y ? "primary" : "ghost"} onClick={() => setYear(y)}>{y}</Button>
          ))}
        </div>
      </CardHeader>
      <div className="px-2 pt-2 pb-4 h-60">
        {isLoading ? (
          <div className="h-full flex items-center justify-center text-sm text-slate-400 animate-pulse">Loading...</div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} barCategoryGap="35%">
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={(v) => formatCurrency(v)} tick={{ fontSize: 10, fill: "#94A3B8" }} axisLine={false} tickLine={false} width={68} />
              <Tooltip content={<CustomTooltip color={color} />} cursor={{ fill: color + "08" }} />
              <Bar dataKey="Expected" fill={color} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </Card>
  );
}