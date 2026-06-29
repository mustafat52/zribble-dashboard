"use client";
import { useState, useMemo } from "react";
import { useContracts } from "@/lib/api";
import { formatCurrency, SALESPERSON_COLORS } from "@/lib/utils";
import { Table, THead, Th, TBody, Tr, Td } from "@/components/ui/Table";
import { StatusBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { EmptyState } from "@/components/ui/Misc";
import { PaymentStatus } from "@/types";
import { Search, Filter, CreditCard, ChevronDown, ChevronUp, IndianRupee, CheckCircle2, Clock, AlertTriangle, CalendarDays } from "lucide-react";
import { ClientLink } from "@/components/clients/ClientLink";
import { cn } from "@/lib/utils";

interface RenewalTableProps {
  year: number;
  month: number;
  onMarkPayment: (contractId: string, renewalYear: number, renewalMonth: number) => void;
  salesperson?: string;
}

const SALESPERSONS = ["All", "Aftab", "Sarvesh", "Firoz", "Idris", "Prajay", "Vinay"];
const STATUSES: { label: string; value: PaymentStatus | "all" }[] = [
  { label: "All", value: "all" }, { label: "Pending", value: "pending" },
  { label: "Collected", value: "collected" }, { label: "Partial", value: "partial" },
  { label: "Overdue", value: "overdue" },
];
type SortKey = "clientName" | "salesperson" | "amount" | "status";
type SortDir  = "asc" | "desc";

export function RenewalTable({ year, month, onMarkPayment, salesperson }: RenewalTableProps) {
  const [search,       setSearch]       = useState("");
  const [execFilter,   setExecFilter]   = useState("All");
  const [statusFilter, setStatusFilter] = useState<PaymentStatus | "all">("all");
  const [sortKey,      setSortKey]      = useState<SortKey>("amount");
  const [sortDir,      setSortDir]      = useState<SortDir>("desc");

  // Pull live data from API cache — replaces getRenewalsForMonth() from mock-data
  const { data: contracts = [], isLoading } = useContracts();

  const raw = useMemo(() => {
    return contracts.flatMap((c) => {
      // If locked to a salesperson (employee login), filter here
      if (salesperson && c.salesperson !== salesperson) return [];
      return (c.renewalSchedule ?? [])
        .filter((r) => r.year === year && r.month === month)
        .map((r) => ({ contract: c, renewal: r }));
    });
  }, [contracts, year, month, salesperson]);

  const rows = useMemo(() => {
    let data = raw;
    if (!salesperson && execFilter !== "All") data = data.filter((r) => r.contract.salesperson === execFilter);
    if (statusFilter !== "all") data = data.filter((r) => r.renewal.status === statusFilter);
    if (search.trim()) data = data.filter((r) =>
      r.contract.clientName.toLowerCase().includes(search.toLowerCase()) ||
      r.contract.accountManager.toLowerCase().includes(search.toLowerCase()) ||
      r.contract.product.toLowerCase().includes(search.toLowerCase())
    );
    return [...data].sort((a, b) => {
      let av: any = "", bv: any = "";
      if (sortKey === "clientName")  { av = a.contract.clientName;  bv = b.contract.clientName;  }
      if (sortKey === "salesperson") { av = a.contract.salesperson; bv = b.contract.salesperson; }
      if (sortKey === "amount")      { av = a.renewal.amount;       bv = b.renewal.amount;       }
      if (sortKey === "status")      { av = a.renewal.status;       bv = b.renewal.status;       }
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
  }, [raw, salesperson, execFilter, statusFilter, search, sortKey, sortDir]);

  const totalExpected  = rows.reduce((a, r) => a + r.renewal.amount, 0);
  const totalCollected = rows.reduce((a, r) => {
    if (r.renewal.status === "collected") return a + r.renewal.amount;
    if (r.renewal.status === "partial") {
      return a + (r.renewal.payments ?? []).reduce((s, p) => s + p.amount, 0);
    }
    return a;
  }, 0);
  const countByStatus = {
    collected: rows.filter((r) => r.renewal.status === "collected").length,
    partial:   rows.filter((r) => r.renewal.status === "partial").length,
    pending:   rows.filter((r) => r.renewal.status === "pending").length,
    overdue:   rows.filter((r) => r.renewal.status === "overdue").length,
  };

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("desc"); }
  }
  function SortIcon({ k }: { k: SortKey }) {
    if (sortKey !== k) return <ChevronDown className="w-3 h-3 text-slate-300" />;
    return sortDir === "asc" ? <ChevronUp className="w-3 h-3 text-accent" /> : <ChevronDown className="w-3 h-3 text-accent" />;
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48 text-slate-400 text-sm">
        Loading renewals…
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 flex-1">
      {/* Summary strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label:"Expected",  value:formatCurrency(totalExpected),         icon:IndianRupee,   color:"text-slate-700"    },
          { label:"Collected", value:formatCurrency(totalCollected),         icon:CheckCircle2,  color:"text-accent-green" },
          { label:"Pending",   value:countByStatus.pending+" renewals",      icon:Clock,         color:"text-accent-amber" },
          { label:"Overdue",   value:countByStatus.overdue+" renewals",      icon:AlertTriangle, color:"text-accent-red"   },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white border border-slate-200 rounded-xl px-4 py-3 flex items-center gap-3 shadow-card">
            <Icon className={cn("w-4 h-4 flex-shrink-0", color)} />
            <div>
              <p className="text-[10px] text-slate-400 uppercase tracking-wide">{label}</p>
              <p className={cn("text-sm font-semibold mt-0.5", color)}>{value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex-1 min-w-48 max-w-xs">
          <Input placeholder="Search client, AM, product…" value={search} onChange={(e) => setSearch(e.target.value)} leftIcon={<Search className="w-3.5 h-3.5" />} />
        </div>

        {/* Exec filter — hidden when locked to a salesperson */}
        {!salesperson && (
          <div className="flex gap-1 flex-wrap">
            {SALESPERSONS.map((sp) => (
              <button key={sp} onClick={() => setExecFilter(sp)} className={cn(
                "px-2.5 py-1 rounded-lg text-xs font-medium transition-all border flex items-center gap-1.5",
                execFilter === sp ? "bg-accent-light text-accent border-accent-border" : "text-slate-500 hover:text-slate-700 hover:bg-slate-50 border-transparent"
              )}>
                {sp !== "All" && <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: SALESPERSON_COLORS[sp] }} />}
                {sp}
              </button>
            ))}
          </div>
        )}

        <div className="flex gap-1 ml-auto">
          {STATUSES.map((s) => (
            <button key={s.value} onClick={() => setStatusFilter(s.value)} className={cn(
              "px-2.5 py-1 rounded-lg text-xs font-medium transition-all border",
              statusFilter === s.value ? "bg-slate-100 text-slate-700 border-slate-200" : "text-slate-400 hover:text-slate-600 border-transparent"
            )}>
              {s.label}
              {s.value !== "all" && (
                <span className="ml-1 text-slate-400">
                  {s.value === "collected" ? countByStatus.collected : s.value === "partial" ? countByStatus.partial : s.value === "pending" ? countByStatus.pending : countByStatus.overdue}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-card flex-1">
        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <p className="text-xs font-semibold text-slate-500">{rows.length} renewal{rows.length !== 1 ? "s" : ""}</p>
          <div className="flex items-center gap-1 text-xs text-slate-400">
            <Filter className="w-3 h-3" />
            {(!salesperson && execFilter !== "All") || statusFilter !== "all" || search ? "Filtered" : "All records"}
          </div>
        </div>

        {rows.length === 0 ? (
          <EmptyState icon={CalendarDays} title="No renewals found" description="Try adjusting your filters or selecting a different month." />
        ) : (
          <Table>
            <THead>
              <Th><button onClick={() => toggleSort("clientName")} className="flex items-center gap-1 hover:text-slate-700">Client <SortIcon k="clientName" /></button></Th>
              <Th><button onClick={() => toggleSort("salesperson")} className="flex items-center gap-1 hover:text-slate-700">Exec <SortIcon k="salesperson" /></button></Th>
              <Th>Product</Th>
              <Th>Account Manager</Th>
              <Th>GST</Th>
              <Th>Term</Th>
              <Th><button onClick={() => toggleSort("amount")} className="flex items-center gap-1 hover:text-slate-700">Amount <SortIcon k="amount" /></button></Th>
              <Th><button onClick={() => toggleSort("status")} className="flex items-center gap-1 hover:text-slate-700">Status <SortIcon k="status" /></button></Th>
              <Th>Action</Th>
            </THead>
            <TBody>
              {rows.map(({ contract: c, renewal: r }) => (
                <Tr key={`${c.id}-${r.year}-${r.month}`}>
                  <Td><ClientLink clientName={c.clientName} salesperson={c.salesperson} showDot /></Td>
                  <Td><span className="text-slate-500">{c.salesperson}</span></Td>
                  <Td><span className="text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-500 border border-slate-200">{c.product}</span></Td>
                  <Td>{c.accountManager}</Td>
                  <Td><span className={cn("text-xs font-medium", c.gstStatus === "Y" ? "text-accent-cyan" : "text-slate-300")}>{c.gstStatus === "Y" ? "GST" : "—"}</span></Td>
                  <Td><span className="text-slate-400">{c.contractTermMonths}m</span></Td>
                  <Td><span className="font-semibold text-slate-700">{formatCurrency(r.amount)}</span></Td>
                  <Td><StatusBadge status={r.status} /></Td>
                  <Td>
                    {r.status !== "collected" && r.status !== "waived" && (
                      <Button size="sm" variant="secondary" onClick={() => onMarkPayment(c.id, r.year, r.month)}>
                        <CreditCard className="w-3 h-3" /> Pay
                      </Button>
                    )}
                    {r.status === "collected" && (
                      <span className="text-xs text-accent-green flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Done</span>
                    )}
                  </Td>
                </Tr>
              ))}
            </TBody>
          </Table>
        )}

        {rows.length > 0 && (
          <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-between bg-slate-50/50">
            <span className="text-xs text-slate-400">{rows.length} records</span>
            <div className="flex items-center gap-6 text-xs text-slate-400">
              <span>Total: <span className="font-semibold text-slate-700 ml-1">{formatCurrency(totalExpected)}</span></span>
              <span>Collected: <span className="font-semibold text-accent-green ml-1">{formatCurrency(totalCollected)}</span></span>
              <span>Outstanding: <span className="font-semibold text-accent-amber ml-1">{formatCurrency(totalExpected - totalCollected)}</span></span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}