"use client";
import { useMemo, useState } from "react";
import { useActiveContracts } from "@/lib/api";
import { formatCurrency, SALESPERSON_COLORS, getMonthShort } from "@/lib/utils";
import { StatusBadge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import { ChevronDown, ChevronRight, AlertTriangle, Clock } from "lucide-react";
import { ClientLink } from "@/components/clients/ClientLink";
import { useAuth } from "@/lib/auth-context";

interface OutstandingItem {
  contractId: string; clientName: string; salesperson: string;
  accountManager: string; product: string; year: number; month: number;
  expected: number; outstanding: number; status: "pending"|"partial"|"overdue";
}

export function OutstandingLedger({ onMarkPayment }: { onMarkPayment: (id: string, y: number, m: number) => void }) {
  const { user, canPerform } = useAuth();
  const execFilter = canPerform("view_all") ? null : user?.salesperson ?? null;
  const { data: allContracts = [], isLoading } = useActiveContracts();
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const contracts = execFilter
    ? allContracts.filter((c) => c.salesperson === execFilter)
    : allContracts;

  const items: OutstandingItem[] = useMemo(() =>
    contracts.flatMap((c) =>
      (c.renewalSchedule ?? [])
        .filter((r) => r.status === "pending" || r.status === "partial" || r.status === "overdue")
        .map((r) => {
          const paid = (r as any).payments?.reduce((a: number, p: any) => a + p.amount, 0) ?? 0;
          return {
            contractId:     c.id,
            clientName:     c.clientName,
            salesperson:    c.salesperson,
            accountManager: c.accountManager,
            product:        c.product,
            year:           r.year,
            month:          r.month,
            expected:       r.amount,
            outstanding:    r.status === "partial" ? r.amount - paid : r.amount,
            status:         r.status as "pending"|"partial"|"overdue",
          };
        })
    ), [contracts]);

  const grouped = useMemo(() => {
    const map: Record<string, OutstandingItem[]> = {};
    items.forEach((item) => {
      if (!map[item.salesperson]) map[item.salesperson] = [];
      map[item.salesperson].push(item);
    });
    return Object.entries(map).sort((a, b) => b[1].length - a[1].length);
  }, [items]);

  const totalOutstanding = items.reduce((a, i) => a + i.outstanding, 0);
  const overdueItems     = items.filter((i) => i.status === "overdue");
  const distinctClients  = new Set(items.map((i) => i.clientName)).size;
  const overdueClients   = new Set(overdueItems.map((i) => i.clientName)).size;

  if (isLoading) {
    return <div className="py-12 text-center text-sm text-slate-400 animate-pulse">Loading outstanding payments...</div>;
  }

  return (
    <div className="flex flex-col gap-4">
      {overdueItems.length > 0 && (
        <div className="flex items-center gap-3 px-4 py-3 bg-accent-redLight border border-red-200 rounded-xl">
          <AlertTriangle className="w-4 h-4 text-accent-red flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-accent-red">
              {overdueItems.length} overdue renewal{overdueItems.length > 1 ? "s" : ""} across {overdueClients} client{overdueClients !== 1 ? "s" : ""} — {formatCurrency(overdueItems.reduce((a, i) => a + i.outstanding, 0))} at risk
            </p>
            <p className="text-xs text-red-400 mt-0.5">Immediate follow-up required</p>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between px-5 py-3 bg-white border border-slate-200 rounded-xl shadow-card">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-accent-amber" />
          <div>
            <span className="text-sm font-semibold text-slate-700">Total Outstanding</span>
            <p className="text-[11px] text-slate-400">{distinctClients} client{distinctClients !== 1 ? "s" : ""} with pending amounts</p>
          </div>
        </div>
        <span className="text-lg font-bold text-accent-amber">{formatCurrency(totalOutstanding)}</span>
      </div>

      {grouped.map(([exec, execItems]) => {
        const isCollapsed  = collapsed[exec];
        const execTotal    = execItems.reduce((a, i) => a + i.outstanding, 0);
        const overdueCount = execItems.filter((i) => i.status === "overdue").length;
        const color        = SALESPERSON_COLORS[exec];
        return (
          <Card key={exec}>
            <button
              onClick={() => setCollapsed((prev) => ({ ...prev, [exec]: !prev[exec] }))}
              className="w-full flex items-center gap-3 px-5 py-4 hover:bg-slate-50 transition-colors rounded-t-xl"
            >
              <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
              <span className="text-sm font-semibold text-slate-700 flex-1 text-left">{exec}</span>
              {overdueCount > 0 && (
                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-accent-redLight text-accent-red border border-red-200">
                  {overdueCount} overdue
                </span>
              )}
              <span className="text-xs text-slate-400 mr-1">{execItems.length} items</span>
              <span className="text-sm font-bold text-accent-amber mr-2">{formatCurrency(execTotal)}</span>
              {isCollapsed
                ? <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                : <ChevronDown className="w-3.5 h-3.5 text-slate-400" />}
            </button>
            {!isCollapsed && (
              <div className="border-t border-slate-100 divide-y divide-slate-100">
                {execItems.map((item) => (
                  <div key={`${item.contractId}-${item.year}-${item.month}`}
                    className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50 transition-colors">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <ClientLink clientName={item.clientName} salesperson={item.salesperson} />
                        <StatusBadge status={item.status} size="sm" />
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[11px] text-slate-400">{item.product}</span>
                        <span className="text-slate-300">·</span>
                        <span className="text-[11px] text-slate-400">{item.accountManager}</span>
                        <span className="text-slate-300">·</span>
                        <span className="text-[11px] text-slate-400">{getMonthShort(item.month)} {item.year}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 flex-shrink-0">
                      <div className="text-right">
                        <p className="text-[10px] text-slate-400">Expected</p>
                        <p className="text-xs text-slate-500">{formatCurrency(item.expected)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] text-slate-400">Outstanding</p>
                        <p className={cn("text-sm font-bold", item.status === "overdue" ? "text-accent-red" : "text-accent-amber")}>
                          {formatCurrency(item.outstanding)}
                        </p>
                      </div>
                      <Button size="sm" variant={item.status === "overdue" ? "danger" : "secondary"}
                        onClick={() => onMarkPayment(item.contractId, item.year, item.month)}>
                        Pay
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}