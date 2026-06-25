"use client";
import { SALESPERSON_COLORS } from "@/lib/utils";
import { SALES_SUMMARY } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

const EXECS = ["Aftab","Sarvesh","Firoz","Idris","Prajay","Vinay"];

interface ExecSelectorProps { selected: string; onChange: (exec: string) => void; }

export function ExecSelector({ selected, onChange }: ExecSelectorProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {EXECS.map((exec)=>{
        const summary  = SALES_SUMMARY.find((s)=>s.salesperson===exec);
        const color    = SALESPERSON_COLORS[exec];
        const isActive = selected===exec;
        return (
          <button key={exec} onClick={()=>onChange(exec)}
            className={cn(
              "flex items-center gap-2.5 px-4 py-2.5 rounded-xl border text-sm font-medium transition-all duration-150",
              isActive ? "shadow-sm" : "bg-white border-slate-200 text-slate-500 hover:text-slate-700 hover:bg-slate-50 shadow-card"
            )}
            style={isActive ? { backgroundColor: color+"15", borderColor: color+"50", color, boxShadow:`0 2px 8px ${color}20` } : {}}
          >
            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{backgroundColor:color}}/>
            <span>{exec}</span>
            {summary&&(
              <span className="text-[10px] font-normal ml-1 hidden sm:block" style={{color:isActive?color+"99":"#94A3B8"}}>
                {summary.totalAccounts} accounts
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}