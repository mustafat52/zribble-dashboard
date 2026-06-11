"use client";
import { Contract } from "@/types";
import { formatCurrency, SALESPERSON_COLORS, getMonthShort } from "@/lib/utils";
import { StatusBadge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";
import { User, Package, CalendarDays, ChevronRight } from "lucide-react";

interface ClientCardProps { contracts: Contract[]; onClick: () => void; stopped?: boolean; }

export function ClientCard({ contracts, onClick, stopped }: ClientCardProps) {
  const primary    = contracts[0];
  const totalValue = contracts.reduce((a,c)=>a+c.dealValue,0);
  const products   = Array.from(new Set(contracts.map((c)=>c.product)));
  const color      = SALESPERSON_COLORS[primary.salesperson];
  const now        = {year:2026,month:7};
  const nextRenewal = contracts.flatMap((c)=>c.renewalSchedule)
    .filter((r)=>r.year>now.year||(r.year===now.year&&r.month>=now.month))
    .sort((a,b)=>(a.year*100+a.month)-(b.year*100+b.month))[0];
  const allStatuses = contracts.flatMap((c)=>c.renewalSchedule.map((r)=>r.status));
  const overallStatus = allStatuses.includes("overdue")?"overdue":allStatuses.includes("partial")?"partial":allStatuses.includes("pending")?"pending":"collected";

  return (
    <button onClick={onClick} className={cn("w-full text-left bg-white border rounded-xl p-4 shadow-card hover:shadow-md transition-all duration-200 group", stopped ? "border-red-200 bg-accent-redLight/30 opacity-75" : "border-slate-200 hover:border-slate-300")}>
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-xs font-bold"
            style={{backgroundColor:color+"15",color}}>
            {primary.clientName.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <p className={cn("text-sm font-semibold truncate leading-tight", stopped ? "text-slate-400 line-through" : "text-slate-700")}>{primary.clientName}</p>
              {stopped && <span className="text-[9px] font-semibold px-1 py-0.5 rounded bg-accent-redLight text-accent-red border border-red-200 flex-shrink-0">Stopped</span>}
            </div>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{backgroundColor:color}}/>
              <span className="text-[11px] text-slate-400">{primary.salesperson}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <StatusBadge status={overallStatus} size="sm"/>
          <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-slate-400 transition-colors"/>
        </div>
      </div>
      <div className="space-y-1.5">
        <div className="flex items-center gap-2"><User className="w-3 h-3 text-slate-400 flex-shrink-0"/><span className="text-xs text-slate-400 truncate">{primary.accountManager}</span></div>
        <div className="flex items-center gap-2"><Package className="w-3 h-3 text-slate-400 flex-shrink-0"/><span className="text-xs text-slate-400 truncate">{contracts.length>1?`${contracts.length} services`:primary.product}</span></div>
        {nextRenewal&&<div className="flex items-center gap-2"><CalendarDays className="w-3 h-3 text-slate-400 flex-shrink-0"/><span className="text-xs text-slate-400">Next: {getMonthShort(nextRenewal.month)} {nextRenewal.year}</span></div>}
      </div>
      <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
        <div className="flex gap-1 flex-wrap">
          {products.slice(0,2).map((p)=>(
            <span key={p} className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-400 border border-slate-200">
              {p.length>12?p.slice(0,12)+"…":p}
            </span>
          ))}
          {products.length>2&&<span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-400 border border-slate-200">+{products.length-2}</span>}
        </div>
        <span className="text-sm font-bold text-slate-700">{formatCurrency(totalValue)}</span>
      </div>
    </button>
  );
}