"use client";
import { cn, formatCurrency } from "@/lib/utils";
import { useContracts } from "@/lib/api";
import { TrendingUp, Users, CalendarClock, CheckCircle2, AlertTriangle, Clock, IndianRupee, ArrowUpRight, UserPlus, RefreshCw } from "lucide-react";
import { DateRange } from "@/lib/range-utils";
import { useAuth } from "@/lib/auth-context";
import { Contract } from "@/types";

interface StatCardsProps { range: DateRange; }
interface StatCardProps {
  label: string; value: string; sub?: string; icon: React.ReactNode;
  trend?: string; trendUp?: boolean;
  accent?: "indigo"|"green"|"amber"|"red"|"purple"|"cyan";
}

const ACCENT_STYLES = {
  indigo: { icon:"bg-accent-light text-accent",            border:"border-accent-border",  top:"bg-accent"        },
  green:  { icon:"bg-accent-greenLight text-accent-green", border:"border-emerald-200",    top:"bg-accent-green"  },
  amber:  { icon:"bg-accent-amberLight text-accent-amber", border:"border-amber-200",      top:"bg-accent-amber"  },
  red:    { icon:"bg-accent-redLight text-accent-red",     border:"border-red-200",        top:"bg-accent-red"    },
  purple: { icon:"bg-purple-50 text-accent-purple",        border:"border-purple-200",     top:"bg-accent-purple" },
  cyan:   { icon:"bg-accent-cyanLight text-accent-cyan",   border:"border-cyan-200",       top:"bg-accent-cyan"   },
};

function StatCard({ label, value, sub, icon, trend, trendUp, accent="indigo" }: StatCardProps) {
  const styles = ACCENT_STYLES[accent];
  return (
    <div className={cn("bg-white border rounded-xl p-4 shadow-card transition-all duration-200 hover:shadow-md relative overflow-hidden", styles.border)}>
      <div className={cn("absolute top-0 left-0 right-0 h-0.5", styles.top)} />
      <div className="flex items-start justify-between gap-2">
        <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0", styles.icon)}>{icon}</div>
        {trend && (
          <div className={cn("flex items-center gap-0.5 text-[10px] font-medium px-1.5 py-0.5 rounded-full",
            trendUp?"text-accent-green bg-accent-greenLight":"text-accent-red bg-accent-redLight")}>
            <ArrowUpRight className={cn("w-2.5 h-2.5", !trendUp&&"rotate-180")} />
            {trend}
          </div>
        )}
      </div>
      <div className="mt-3">
        <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wide">{label}</p>
        <p className="text-xl font-bold text-slate-800 mt-0.5 leading-tight">{value}</p>
        {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

function inRange(year: number, month: number, range: DateRange) {
  const val = year * 100 + month;
  return val >= range.fromYear * 100 + range.fromMonth && val <= range.toYear * 100 + range.toMonth;
}

function computeStats(contracts: Contract[], range: DateRange) {
  const NOW_YEAR = new Date().getFullYear();
  const NOW_MONTH = new Date().getMonth() + 1;
  // Current month + 1 for "due next month"
  const NEXT_MONTH = NOW_MONTH === 12 ? 1 : NOW_MONTH + 1;
  const NEXT_YEAR  = NOW_MONTH === 12 ? NOW_YEAR + 1 : NOW_YEAR;

  const rangePipeline = contracts.reduce((sum, c) =>
    sum + (c.renewalSchedule ?? []).filter((r) => inRange(r.year, r.month, range)).reduce((a, r) => a + r.amount, 0), 0);

  // Use the current month for stats
  const thisMonthExpected  = contracts.reduce((sum, c) =>
    sum + (c.renewalSchedule ?? []).filter((r) => r.year === NOW_YEAR && r.month === NOW_MONTH).reduce((a, r) => a + r.amount, 0), 0);

  const thisMonthCollected = contracts.reduce((sum, c) =>
    sum + (c.renewalSchedule ?? [])
      .filter((r) => r.year === NOW_YEAR && r.month === NOW_MONTH && r.status === "collected")
      .reduce((a, r) => a + r.amount, 0), 0);

  const thisMonthPending = thisMonthExpected - thisMonthCollected;

  const overdueCount = contracts.reduce((a, c) =>
    a + (c.renewalSchedule ?? []).filter((r) => r.status === "overdue").length, 0);
  const overdueValue = contracts.reduce((a, c) =>
    a + (c.renewalSchedule ?? []).filter((r) => r.status === "overdue").reduce((b, r) => b + r.amount, 0), 0);

  const collectionRate = thisMonthExpected > 0 ? Math.round((thisMonthCollected / thisMonthExpected) * 100) : 0;
  const totalAccounts  = new Set(contracts.map((c) => c.clientName)).size;

  const newClientsThisMonth = new Set(
    contracts.filter((c) => {
      const d = new Date(c.createdAt);
      return d.getFullYear() === NOW_YEAR && d.getMonth() + 1 === NOW_MONTH;
    }).map((c) => c.clientName)
  ).size;

  const renewalsDueNextMonth = contracts.reduce((count, c) =>
    count + (c.renewalSchedule ?? []).filter((r) => r.year === NEXT_YEAR && r.month === NEXT_MONTH).length, 0);

  const monthLabel = new Date(NOW_YEAR, NOW_MONTH - 1).toLocaleString("en-IN", { month: "short", year: "numeric" });
  const nextLabel  = new Date(NEXT_YEAR, NEXT_MONTH - 1).toLocaleString("en-IN", { month: "short", year: "numeric" });

  return {
    rangePipeline, thisMonthExpected, thisMonthCollected, thisMonthPending,
    overdueCount, overdueValue, collectionRate, totalAccounts,
    newClientsThisMonth, renewalsDueNextMonth, monthLabel, nextLabel,
  };
}

export function StatCards({ range }: StatCardsProps) {
  const { user, canPerform } = useAuth();
  const execFilter = canPerform("view_all") ? null : user?.salesperson ?? null;
  const { data: allContracts = [], isLoading } = useContracts();

  const contracts = execFilter
    ? allContracts.filter((c) => c.salesperson === execFilter)
    : allContracts;

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="bg-white border border-slate-200 rounded-xl p-4 shadow-card animate-pulse h-24" />
        ))}
      </div>
    );
  }

  const {
    rangePipeline, thisMonthExpected, thisMonthCollected, thisMonthPending,
    overdueCount, overdueValue, collectionRate, totalAccounts,
    newClientsThisMonth, renewalsDueNextMonth, monthLabel, nextLabel,
  } = computeStats(contracts, range);

  const cards: StatCardProps[] = [
    { label:"Total Pipeline",        value:formatCurrency(rangePipeline),       sub:`Next ${range.months} months`,             icon:<IndianRupee className="w-4 h-4"/>,  accent:"indigo" },
    { label:"Active Accounts",       value:totalAccounts.toString(),            sub:execFilter?`${execFilter}'s clients`:"Across 6 executives", icon:<Users className="w-4 h-4"/>, accent:"cyan" },
    { label:`${monthLabel} Expected`, value:formatCurrency(thisMonthExpected),  sub:"This month's renewals",                   icon:<CalendarClock className="w-4 h-4"/>, accent:"purple" },
    { label:`${monthLabel} Collected`,value:formatCurrency(thisMonthCollected), sub:`${collectionRate}% collection rate`,      icon:<CheckCircle2 className="w-4 h-4"/>,  accent:"green", trend:`${collectionRate}%`, trendUp:collectionRate>=70 },
    { label:`${monthLabel} Pending`,  value:formatCurrency(thisMonthPending),   sub:"Outstanding balance",                     icon:<Clock className="w-4 h-4"/>,         accent:"amber" },
    { label:"Overdue",               value:overdueCount.toString(),             sub:formatCurrency(overdueValue)+" at risk",   icon:<AlertTriangle className="w-4 h-4"/>, accent:"red" },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
      {cards.map((card) => <StatCard key={card.label} {...card} />)}
      <div className="col-span-2 md:col-span-3 xl:col-span-6 bg-white border border-slate-200 rounded-xl px-5 py-4 shadow-card flex items-center gap-6">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-accent-light flex items-center justify-center flex-shrink-0"><UserPlus className="w-4 h-4 text-accent"/></div>
          <div>
            <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wide">New Clients — {monthLabel}</p>
            <p className="text-2xl font-bold text-slate-800 leading-tight">{newClientsThisMonth}</p>
            <p className="text-xs text-slate-400 mt-0.5">Onboarded this month</p>
          </div>
        </div>
        <div className="w-px h-12 bg-slate-200 flex-shrink-0" />
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-accent-greenLight flex items-center justify-center flex-shrink-0"><RefreshCw className="w-4 h-4 text-accent-green"/></div>
          <div>
            <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wide">Renewals Due — {nextLabel}</p>
            <p className="text-2xl font-bold text-slate-800 leading-tight">{renewalsDueNextMonth}</p>
            <p className="text-xs text-slate-400 mt-0.5">Upcoming next month</p>
          </div>
        </div>
        <div className="w-px h-12 bg-slate-200 flex-shrink-0" />
        <div className="flex-1">
          <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wide mb-2">Breakdown</p>
          <div className="flex items-center gap-2">
            <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden flex">
              {renewalsDueNextMonth + newClientsThisMonth > 0 && (
                <>
                  <div className="h-full bg-accent rounded-l-full transition-all duration-500"
                    style={{width:`${Math.round((newClientsThisMonth/(renewalsDueNextMonth+newClientsThisMonth))*100)}%`}}/>
                  <div className="h-full bg-accent-green rounded-r-full transition-all duration-500"
                    style={{width:`${Math.round((renewalsDueNextMonth/(renewalsDueNextMonth+newClientsThisMonth))*100)}%`}}/>
                </>
              )}
            </div>
            <span className="text-xs text-slate-500 flex-shrink-0">{renewalsDueNextMonth+newClientsThisMonth} total</span>
          </div>
          <div className="flex items-center gap-4 mt-1.5">
            <span className="flex items-center gap-1 text-[10px] text-slate-400"><span className="w-2 h-2 rounded-full bg-accent inline-block"/>New</span>
            <span className="flex items-center gap-1 text-[10px] text-slate-400"><span className="w-2 h-2 rounded-full bg-accent-green inline-block"/>Renewals</span>
          </div>
        </div>
      </div>
    </div>
  );
}