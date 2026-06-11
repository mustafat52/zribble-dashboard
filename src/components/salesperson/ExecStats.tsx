"use client";
import { SALES_SUMMARY } from "@/lib/mock-data";
import { formatCurrency, SALESPERSON_COLORS } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { Users, IndianRupee, CalendarDays, TrendingUp } from "lucide-react";

export function ExecStats({ exec }: { exec: string }) {
  const s     = SALES_SUMMARY.find((s)=>s.salesperson===exec);
  const color = SALESPERSON_COLORS[exec];
  if (!s) return null;
  const cards = [
    { label:"Active Accounts", value:s.totalAccounts.toString(), icon:Users,        sub:"Total managed"      },
    { label:"Contract Value",  value:formatCurrency(s.totalContractValue), icon:IndianRupee, sub:"Current portfolio" },
    { label:"2026 Renewals",   value:formatCurrency(s.renewals2026), icon:CalendarDays, sub:"Jul – Dec 2026"   },
    { label:"2027 Renewals",   value:formatCurrency(s.renewals2027), icon:CalendarDays, sub:"Full year 2027"   },
    { label:"2028 Renewals",   value:formatCurrency(s.renewals2028), icon:CalendarDays, sub:"Full year 2028"   },
    { label:"Total Pipeline",  value:formatCurrency(s.totalPipeline), icon:TrendingUp,  sub:"3-year forecast"  },
  ];
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
      {cards.map(({label,value,icon:Icon,sub})=>(
        <div key={label} className="bg-white border rounded-xl p-4 shadow-card relative overflow-hidden" style={{borderColor:color+"30"}}>
          <div className="absolute top-0 left-0 right-0 h-0.5" style={{backgroundColor:color}}/>
          <div className="w-8 h-8 rounded-lg flex items-center justify-center mb-3" style={{backgroundColor:color+"15"}}>
            <Icon className="w-4 h-4" style={{color}}/>
          </div>
          <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wide">{label}</p>
          <p className="text-lg font-bold text-slate-800 mt-0.5 leading-tight">{value}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">{sub}</p>
        </div>
      ))}
    </div>
  );
}