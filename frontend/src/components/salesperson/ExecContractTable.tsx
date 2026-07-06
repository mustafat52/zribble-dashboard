"use client";
import { useState, useMemo } from "react";
import { useActiveContracts } from "@/lib/api";
import { formatCurrency, SALESPERSON_COLORS, getMonthShort } from "@/lib/utils";
import { StatusBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Table, THead, Th, TBody, Tr, Td } from "@/components/ui/Table";
import { EmptyState } from "@/components/ui/Misc";
import { Card, CardHeader, CardTitle } from "@/components/ui/Card";
import { Search, CreditCard, ChevronDown, ChevronUp, FileText } from "lucide-react";
import { ClientLink } from "@/components/clients/ClientLink";
import { cn } from "@/lib/utils";

// Flat accent used for Account Manager views — AMs don't have individual
// per-name colors the way execs do via SALESPERSON_COLORS. Swap for your
// real --accent-purple CSS var/hex if it differs from this value.
const AM_COLOR = "#7C3AED";

interface ExecContractTableProps {
  exec: string;
  onMarkPayment: (contractId: string, year: number, month: number) => void;
  /** "exec" (default) scopes by salesperson; "am" scopes by accountManager */
  dimension?: "exec" | "am";
}

export function ExecContractTable({ exec, onMarkPayment, dimension = "exec" }: ExecContractTableProps) {
  const [search,   setSearch]   = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [sortDir,  setSortDir]  = useState<"asc" | "desc">("desc");

  const { data: allContracts = [], isLoading } = useActiveContracts();
  const color = dimension === "am" ? AM_COLOR : (SALESPERSON_COLORS[exec] ?? "#3B82F6");

  // When scoped to an exec, the AM column is the useful cross-info (varies
  // per row). When scoped to an AM, that AM value is constant/redundant on
  // every row — swap the column to show the Salesperson instead, which is
  // now the varying, useful field.
  const crossColumnLabel = dimension === "am" ? "Exec" : "AM";

  const now = useMemo(() => {
    const d = new Date();
    return { year: d.getFullYear(), month: d.getMonth() + 1 };
  }, []);

  const contracts = useMemo(
    () => allContracts.filter((c) =>
      dimension === "am" ? c.accountManager === exec : c.salesperson === exec
    ),
    [allContracts, exec, dimension]
  );

  const filtered = useMemo(() => {
    let data = contracts;
    if (search.trim()) data = data.filter((c) =>
      c.clientName.toLowerCase().includes(search.toLowerCase()) ||
      c.product.toLowerCase().includes(search.toLowerCase()) ||
      c.accountManager.toLowerCase().includes(search.toLowerCase()) ||
      c.salesperson.toLowerCase().includes(search.toLowerCase()) ||
      (c.contractId ?? "").toLowerCase().includes(search.toLowerCase())
    );
    return [...data].sort((a, b) => sortDir === "desc" ? b.dealValue - a.dealValue : a.dealValue - b.dealValue);
  }, [contracts, search, sortDir]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4">
        <div>
          <CardTitle>All Contracts</CardTitle>
          <p className="text-xs text-slate-400 mt-0.5">
            {isLoading ? "Loading..." : `${filtered.length} of ${contracts.length} contracts`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Input placeholder="Search…" value={search} onChange={(e) => setSearch(e.target.value)}
            leftIcon={<Search className="w-3.5 h-3.5" />} className="w-44" />
          <Button size="sm" variant="ghost" onClick={() => setSortDir((d) => d === "asc" ? "desc" : "asc")}>
            Value {sortDir === "desc" ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />}
          </Button>
        </div>
      </CardHeader>

      {isLoading ? (
        <div className="px-4 py-12 text-center text-sm text-slate-400 animate-pulse">Loading contracts...</div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={FileText} title="No contracts found" />
      ) : (
        <>
          <Table>
            <THead>
              <Th>Client</Th>
              <Th>Product</Th>
              <Th>{crossColumnLabel}</Th>
              <Th>GST</Th>
              <Th>Term</Th>
              <Th>Deal Value</Th>
              <Th>This Month</Th>
              <Th>Status</Th>
              <Th></Th>
            </THead>
            <TBody>
              {filtered.map((c) => {
                const thisMonthRenewal = (c.renewalSchedule ?? []).find(
                  (r) => r.year === now.year && r.month === now.month
                );
                const isExpanded = expanded === c.id;
                const nextRenewal = (c.renewalSchedule ?? [])
                  .filter((r) => r.year > now.year || (r.year === now.year && r.month >= now.month))
                  .sort((a, b) => (a.year * 100 + a.month) - (b.year * 100 + b.month))[0];

                return (
                  <>
                    <Tr key={c.id} onClick={() => setExpanded(isExpanded ? null : c.id)} className={cn(isExpanded && "bg-slate-50")}>
                      <Td><ClientLink clientName={c.clientName} salesperson={c.salesperson} showDot /></Td>
                      <Td><span className="text-xs px-2 py-0.5 rounded bg-slate-100 text-slate-500 border border-slate-200">{c.product}</span></Td>
                      <Td><span className="text-slate-400 text-xs">{dimension === "am" ? c.salesperson : c.accountManager}</span></Td>
                      <Td><span className={cn("text-xs font-medium", c.gstStatus === "Y" ? "text-accent-cyan" : "text-slate-300")}>{c.gstStatus === "Y" ? "GST" : "—"}</span></Td>
                      <Td><span className="text-slate-400">{c.contractTermMonths}m</span></Td>
                      <Td><span className="font-semibold text-slate-700">{formatCurrency(c.dealValue)}</span></Td>
                      <Td>
                        {thisMonthRenewal
                          ? <span className="font-medium text-slate-600">{formatCurrency(thisMonthRenewal.amount)}</span>
                          : <span className="text-slate-300">—</span>}
                      </Td>
                      <Td>
                        {thisMonthRenewal
                          ? <StatusBadge status={thisMonthRenewal.status} />
                          : nextRenewal
                          ? <span className="text-[11px] text-slate-400">{getMonthShort(nextRenewal.month)} {nextRenewal.year}</span>
                          : <span className="text-slate-300 text-xs">—</span>}
                      </Td>
                      <Td>
                        {thisMonthRenewal && thisMonthRenewal.status !== "collected" && (
                          <Button size="sm" variant="secondary"
                            onClick={(e) => { e.stopPropagation(); onMarkPayment(c.id, now.year, now.month); }}>
                            <CreditCard className="w-3 h-3" /> Pay
                          </Button>
                        )}
                      </Td>
                    </Tr>

                    {isExpanded && (
                      <tr key={`${c.id}-exp`} className="bg-slate-50/80">
                        <td colSpan={9} className="px-8 py-4">
                          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-3">
                            Full Renewal Schedule ({(c.renewalSchedule ?? []).length} months)
                          </p>
                          <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-8 gap-1.5">
                            {(c.renewalSchedule ?? []).map((r) => (
                              <div key={`${r.year}-${r.month}`}
                                className={cn("flex flex-col items-center gap-1 px-2 py-2 rounded-lg border text-center",
                                  r.year === now.year && r.month === now.month ? "shadow-sm" : "bg-white border-slate-200"
                                )}
                                style={r.year === now.year && r.month === now.month
                                  ? { backgroundColor: color + "10", borderColor: color + "40" }
                                  : {}}
                              >
                                <span className="text-[10px] text-slate-400">{getMonthShort(r.month)} {String(r.year).slice(2)}</span>
                                <span className="text-xs font-semibold text-slate-600">{formatCurrency(r.amount)}</span>
                                <StatusBadge status={r.status} size="sm" />
                              </div>
                            ))}
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </TBody>
          </Table>
          <div className="px-5 py-3 border-t border-slate-100 flex justify-between items-center bg-slate-50/50">
            <span className="text-xs text-slate-400">{filtered.length} contracts</span>
            <span className="text-xs text-slate-400">
              Total: <span className="font-semibold text-slate-600 ml-1">{formatCurrency(filtered.reduce((a, c) => a + c.dealValue, 0))}</span>
            </span>
          </div>
        </>
      )}
    </Card>
  );
}