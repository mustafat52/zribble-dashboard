"use client";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { SALES_SUMMARY } from "@/lib/mock-data";
import { formatCurrency, SALESPERSON_COLORS } from "@/lib/utils";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";

const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const d = payload[0];
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-lg text-xs">
      <p className="font-semibold text-slate-700 mb-1">{d.name}</p>
      <p className="text-slate-500">{formatCurrency(d.value)}</p>
    </div>
  );
};

export function PipelineDonut() {
  const data = SALES_SUMMARY.map((s) => ({ name: s.salesperson, value: s.totalPipeline }));
  const total = data.reduce((a, d) => a + d.value, 0);
  return (
    <Card>
      <CardHeader>
        <CardTitle>Pipeline Share</CardTitle>
        <p className="text-xs text-slate-400 mt-0.5">{formatCurrency(total)} total</p>
      </CardHeader>
      <CardContent>
        <div className="h-44 relative">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={data} cx="50%" cy="50%" innerRadius={52} outerRadius={72} paddingAngle={3} dataKey="value" strokeWidth={0}>
                {data.map((entry) => <Cell key={entry.name} fill={SALESPERSON_COLORS[entry.name]} />)}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <p className="text-xs text-slate-400">Total</p>
            <p className="text-sm font-bold text-slate-700">{formatCurrency(total)}</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 mt-2">
          {data.map((d) => {
            const pct = Math.round((d.value / total) * 100);
            return (
              <div key={d.name} className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: SALESPERSON_COLORS[d.name] }} />
                <span className="text-xs text-slate-500 flex-1">{d.name}</span>
                <span className="text-xs text-slate-400">{pct}%</span>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}