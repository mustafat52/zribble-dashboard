"use client";
import { useState } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { MONTHLY_TOTALS } from "@/lib/mock-data";
import { formatCurrency, getMonthShort } from "@/lib/utils";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

type YearFilter = 2026 | 2027 | 2028 | "all";
const YEAR_OPTS: { label: string; value: YearFilter }[] = [
  { label: "All", value: "all" }, { label: "2026", value: 2026 },
  { label: "2027", value: 2027 }, { label: "2028", value: 2028 },
];

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
          <span className="font-semibold text-accent-amber">{formatCurrency((payload[0]?.value || 0) - (payload[1]?.value || 0))}</span>
        </div>
      )}
    </div>
  );
};

export function RevenueChart() {
  const [yearFilter, setYearFilter] = useState<YearFilter>("all");
  const data = MONTHLY_TOTALS
    .filter((m) => yearFilter === "all" || m.year === yearFilter)
    .map((m) => ({ name: `${getMonthShort(m.month)} '${String(m.year).slice(2)}`, Expected: m.expected, Collected: m.collected }));
  const totalExpected  = data.reduce((a, d) => a + d.Expected, 0);
  const totalCollected = data.reduce((a, d) => a + d.Collected, 0);
  return (
    <Card className="col-span-2">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Revenue Pipeline</CardTitle>
          <p className="text-xs text-slate-400 mt-0.5">{formatCurrency(totalExpected)} expected · {formatCurrency(totalCollected)} collected</p>
        </div>
        <div className="flex gap-1">
          {YEAR_OPTS.map((y) => (
            <Button key={y.value} variant={yearFilter === y.value ? "primary" : "ghost"} size="sm" onClick={() => setYearFilter(y.value)}>{y.label}</Button>
          ))}
        </div>
      </CardHeader>
      <div className="px-2 pt-4 pb-2 h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} barGap={2} barCategoryGap="30%">
            <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
            <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
            <YAxis tickFormatter={(v) => formatCurrency(v)} tick={{ fontSize: 10, fill: "#94A3B8" }} axisLine={false} tickLine={false} width={70} />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: "rgba(79,70,229,0.04)" }} />
            <Legend wrapperStyle={{ fontSize: 11, color: "#94A3B8", paddingTop: 12 }} iconType="circle" iconSize={6} />
            <Bar dataKey="Expected" fill="#E0E7FF" radius={[3, 3, 0, 0]} />
            <Bar dataKey="Collected" fill="#4F46E5" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}