"use client";
import { cn, formatCurrency } from "@/lib/utils";
import { DASHBOARD_STATS, CONTRACTS } from "@/lib/mock-data";
import { TrendingUp, Users, CalendarClock, CheckCircle2, AlertTriangle, Clock, IndianRupee, ArrowUpRight, UserPlus, RefreshCw } from "lucide-react";
import { DateRange } from "@/app/dashboard/page";

interface StatCardsProps {
  range: DateRange;
}

interface StatCardProps {
  label: string; value: string; sub?: string; icon: React.ReactNode;
  trend?: string; trendUp?: boolean;
  accent?: "indigo" | "green" | "amber" | "red" | "purple" | "cyan";
}

const ACCENT_STYLES = {
  indigo: { icon: "bg-accent-light text-accent",            border: "border-accent-border",  top: "bg-accent"        },
  green:  { icon: "bg-accent-greenLight text-accent-green", border: "border-emerald-200",    top: "bg-accent-green"  },
  amber:  { icon: "bg-accent-amberLight text-accent-amber", border: "border-amber-200",      top: "bg-accent-amber"  },
  red:    { icon: "bg-accent-redLight text-accent-red",     border: "border-red-200",        top: "bg-accent-red"    },
  purple: { icon: "bg-purple-50 text-accent-purple",        border: "border-purple-200",     top: "bg-accent-purple" },
  cyan:   { icon: "bg-accent-cyanLight text-accent-cyan",   border: "border-cyan-200",       top: "bg-accent-cyan"   },
};

function StatCard({ label, value, sub, icon, trend, trendUp, accent = "indigo" }: StatCardProps) {
  const styles = ACCENT_STYLES[accent];
  return (
    <div className={cn("bg-white border rounded-xl p-4 shadow-card transition-all duration-200 hover:shadow-md relative overflow-hidden", styles.border)}>
      <div className={cn("absolute top-0 left-0 right-0 h-0.5", styles.top)} />
      <div className="flex items-start justify-between gap-2">
        <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0", styles.icon)}>{icon}</div>
        {trend && (
          <div className={cn("flex items-center gap-0.5 text-[10px] font-medium px-1.5 py-0.5 rounded-full",
            trendUp ? "text-accent-green bg-accent-greenLight" : "text-accent-red bg-accent-redLight")}>
            <ArrowUpRight className={cn("w-2.5 h-2.5", !trendUp && "rotate-180")} />
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
  return val >= range.fromYear * 100 + range.fromMonth &&
         val <= range.toYear   * 100 + range.toMonth;
}

export function StatCards({ range }: StatCardsProps) {
  const s = DASHBOARD_STATS;
  const collectionRate = s.thisMonthExpected > 0
    ? Math.round((s.thisMonthCollected / s.thisMonthExpected) * 100)
    : 0;

  // Total pipeline filtered to selected range
  const rangePipeline = CONTRACTS.reduce((sum, c) => {
    return sum + c.renewalSchedule
      .filter((r) => inRange(r.year, r.month, range))
      .reduce((a, r) => a + r.amount, 0);
  }, 0);

  const NOW_YEAR  = 2026;
  const NOW_MONTH = 6;

  const newClientsThisMonth = new Set(
    CONTRACTS
      .filter((c) => {
        const d = new Date(c.createdAt);
        return d.getFullYear() === NOW_YEAR && d.getMonth() + 1 === NOW_MONTH;
      })
      .map((c) => c.clientName)
  ).size;

  const renewalsDueThisMonth = CONTRACTS.reduce((count, c) => {
    return count + c.renewalSchedule.filter(
      (r) => r.year === NOW_YEAR && r.month === NOW_MONTH + 1
    ).length;
  }, 0);

  const cards: StatCardProps[] = [
    { label: "Total Pipeline",  value: formatCurrency(rangePipeline),          sub: `Next ${range.months} months`,    icon: <IndianRupee className="w-4 h-4" />,  accent: "indigo", trend: "+12%", trendUp: true },
    { label: "Active Accounts", value: s.totalAccounts.toString(),             sub: "Across 6 executives",    icon: <Users className="w-4 h-4" />,        accent: "cyan"   },
    { label: "Jul Expected",    value: formatCurrency(s.thisMonthExpected),    sub: "This month's renewals",  icon: <CalendarClock className="w-4 h-4" />, accent: "purple" },
    { label: "Jul Collected",   value: formatCurrency(s.thisMonthCollected),   sub: `${collectionRate}% collection rate`, icon: <CheckCircle2 className="w-4 h-4" />, accent: "green", trend: `${collectionRate}%`, trendUp: collectionRate >= 70 },
    { label: "Jul Pending",     value: formatCurrency(s.thisMonthPending),     sub: "Outstanding balance",    icon: <Clock className="w-4 h-4" />,        accent: "amber"  },
    { label: "Overdue",         value: s.overdueCount.toString(),              sub: formatCurrency(s.overdueValue) + " at risk", icon: <AlertTriangle className="w-4 h-4" />, accent: "red" },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
      {cards.map((card) => <StatCard key={card.label} {...card} />)}

      {/* New Clients vs Renewals widget */}
      <div className="col-span-2 md:col-span-3 xl:col-span-6 bg-white border border-slate-200 rounded-xl px-5 py-4 shadow-card flex items-center gap-6">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-accent-light flex items-center justify-center flex-shrink-0">
            <UserPlus className="w-4 h-4 text-accent" />
          </div>
          <div>
            <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wide">New Clients — Jul 2026</p>
            <p className="text-2xl font-bold text-slate-800 leading-tight">{newClientsThisMonth}</p>
            <p className="text-xs text-slate-400 mt-0.5">Onboarded this month</p>
          </div>
        </div>

        <div className="w-px h-12 bg-slate-200 flex-shrink-0" />

        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-accent-greenLight flex items-center justify-center flex-shrink-0">
            <RefreshCw className="w-4 h-4 text-accent-green" />
          </div>
          <div>
            <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wide">Renewals Due — Jul 2026</p>
            <p className="text-2xl font-bold text-slate-800 leading-tight">{renewalsDueThisMonth}</p>
            <p className="text-xs text-slate-400 mt-0.5">Existing clients renewing</p>
          </div>
        </div>

        <div className="w-px h-12 bg-slate-200 flex-shrink-0" />

        <div className="flex-1">
          <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wide mb-2">Breakdown</p>
          <div className="flex items-center gap-2">
            <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden flex">
              {renewalsDueThisMonth + newClientsThisMonth > 0 && (
                <>
                  <div className="h-full bg-accent rounded-l-full transition-all duration-500"
                    style={{ width: `${Math.round((newClientsThisMonth / (renewalsDueThisMonth + newClientsThisMonth)) * 100)}%` }} />
                  <div className="h-full bg-accent-green rounded-r-full transition-all duration-500"
                    style={{ width: `${Math.round((renewalsDueThisMonth / (renewalsDueThisMonth + newClientsThisMonth)) * 100)}%` }} />
                </>
              )}
            </div>
            <span className="text-xs text-slate-500 flex-shrink-0">{renewalsDueThisMonth + newClientsThisMonth} total</span>
          </div>
          <div className="flex items-center gap-4 mt-1.5">
            <span className="flex items-center gap-1 text-[10px] text-slate-400">
              <span className="w-2 h-2 rounded-full bg-accent inline-block" /> New
            </span>
            <span className="flex items-center gap-1 text-[10px] text-slate-400">
              <span className="w-2 h-2 rounded-full bg-accent-green inline-block" /> Renewals
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}