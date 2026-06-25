"use client";
import { UPCOMING_RENEWALS, CONTRACTS } from "@/lib/mock-data";
import { formatCurrency, SALESPERSON_COLORS } from "@/lib/utils";
import { Card, CardHeader, CardTitle, CardFooter } from "@/components/ui/Card";
import { StatusBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/Misc";
import { CalendarDays, ArrowRight } from "lucide-react";
import { ClientLink } from "@/components/clients/ClientLink";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";

export function UpcomingRenewals() {
  const { user, canPerform } = useAuth();
  const execFilter = canPerform("view_all") ? null : user?.salesperson ?? null;
  const items = (execFilter
    ? UPCOMING_RENEWALS.filter((r) => r.salesperson === execFilter)
    : UPCOMING_RENEWALS
  ).slice(0, 8);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle>Upcoming Renewals</CardTitle>
          <p className="text-xs text-slate-400 mt-0.5">Due in July 2026</p>
        </div>
        <span className="text-xs font-semibold text-accent bg-accent-light px-2 py-0.5 rounded-full border border-accent-border">
          {items.length} total
        </span>
      </CardHeader>
      <div className="divide-y divide-slate-100">
        {items.length === 0 ? (
          <EmptyState icon={CalendarDays} title="No upcoming renewals" />
        ) : items.map((r) => {
          const color = SALESPERSON_COLORS[r.salesperson];
          return (
            <div key={`${r.contractId}-${r.dueDate}`} className="px-5 py-3 flex items-center gap-3 hover:bg-slate-50/80 transition-colors">
              <div className="w-0.5 h-8 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-700 truncate">{r.clientName}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[11px] text-slate-400">{r.salesperson}</span>
                  <span className="text-slate-300">·</span>
                  <span className="text-[11px] text-slate-400 truncate">{r.product}</span>
                  <span className="text-slate-300">·</span>
                  <span className="text-[11px] text-slate-400">{r.accountManager}</span>
                </div>
              </div>
              <div className="flex flex-col items-end gap-1 flex-shrink-0">
                <span className="text-sm font-semibold text-slate-700">{formatCurrency(r.amount)}</span>
                <StatusBadge status={r.status} size="sm" />
              </div>
            </div>
          );
        })}
      </div>
      <CardFooter className="flex justify-end">
        <Link href="/renewals">
          <Button variant="ghost" size="sm">View all renewals <ArrowRight className="w-3 h-3" /></Button>
        </Link>
      </CardFooter>
    </Card>
  );
}