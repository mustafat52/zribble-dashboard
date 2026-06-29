"use client";
import { useMemo } from "react";
import { useContracts } from "@/lib/api";
import { formatCurrency, SALESPERSON_COLORS } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { Users, IndianRupee, CalendarDays, TrendingUp } from "lucide-react";

export function ExecStats({ exec }: { exec: string }) {
  const { data: allContracts = [], isLoading } = useContracts();
  const color = SALESPERSON_COLORS[exec];

  const stats = useMemo(() => {
    const contracts = allContracts.filter((c) => c.salesperson === exec);
    const totalAccounts      = new Set(contracts.map((c) => c.clientName)).size;
    const totalContractValue = contracts.reduce((a, c) => a + c.dealValue, 0);
    const renewals2026 = contracts.reduce((a, c) =>
      a + (c.renewalSchedule ?? []).filter((r) => r.year === 2026).reduce((b, r) => b + r.amount, 0), 0);
    const renewals2027 = contracts.reduce((a, c) =>
      a + (c.renewalSchedule ?? []).filter((r) => r.year === 2027).reduce((b, r) => b + r.amount, 0), 0);
    const renewals2028 = contracts.reduce((a, c) =>
      a + (c.renewalSchedule ?? []).filter((r) => r.year === 2028).reduce((b, r) => b + r.amount, 0), 0);
    const totalPipeline = renewals2026 + renewals2027 + renewals2028;
    return { totalAccounts, totalContractValue, renewals2026, renewals2027, renewals2028, totalPipeline };
  }, [allContracts, exec]);

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="bg-white border border-slate-200 rounded-xl p-4 shadow-card animate-pulse h-24" />
        ))}
      </div>
    );
  }

  const cards = [
    { label:"Active Accounts", value:stats.totalAccounts.toString(),          icon:Users,        sub:"Total managed"      },
    { label:"Contract Value",  value:formatCurrency(stats.totalContractValue), icon:IndianRupee,  sub:"Current portfolio"  },
    { label:"2026 Renewals",   value:formatCurrency(stats.renewals2026),       icon:CalendarDays, sub:"Jul – Dec 2026"     },
    { label:"2027 Renewals",   value:formatCurrency(stats.renewals2027),       icon:CalendarDays, sub:"Full year 2027"     },
    { label:"2028 Renewals",   value:formatCurrency(stats.renewals2028),       icon:CalendarDays, sub:"Full year 2028"     },
    { label:"Total Pipeline",  value:formatCurrency(stats.totalPipeline),      icon:TrendingUp,   sub:"3-year forecast"    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
      {cards.map(({ label, value, icon: Icon, sub }) => (
        <div key={label} className="bg-white border rounded-xl p-4 shadow-card relative overflow-hidden" style={{ borderColor: color + "30" }}>
          <div className="absolute top-0 left-0 right-0 h-0.5" style={{ backgroundColor: color }} />
          <div className="w-8 h-8 rounded-lg flex items-center justify-center mb-3" style={{ backgroundColor: color + "15" }}>
            <Icon className="w-4 h-4" style={{ color }} />
          </div>
          <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wide">{label}</p>
          <p className="text-lg font-bold text-slate-800 mt-0.5 leading-tight">{value}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">{sub}</p>
        </div>
      ))}
    </div>
  );
}