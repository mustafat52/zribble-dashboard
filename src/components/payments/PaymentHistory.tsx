"use client";
import { useState, useMemo } from "react";
import { CONTRACTS } from "@/lib/mock-data";
import { formatCurrency, formatDate, SALESPERSON_COLORS, getMonthShort } from "@/lib/utils";
import { StatusBadge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { Table, THead, Th, TBody, Tr, Td } from "@/components/ui/Table";
import { EmptyState } from "@/components/ui/Misc";
import { Search, ChevronDown, ChevronUp, Receipt, IndianRupee, TrendingUp, AlertTriangle, Clock } from "lucide-react";
import { ClientLink } from "@/components/clients/ClientLink";
import { cn } from "@/lib/utils";

type SortKey = "client"|"salesperson"|"month"|"expected"|"collected"|"outstanding"|"status";
type SortDir  = "asc"|"desc";
const SALESPERSONS = ["All","Aftab","Sarvesh","Firoz","Idris","Prajay","Vinay"];
const YEARS = ["All","2026","2027","2028"];

function buildLedger() {
  return CONTRACTS.flatMap((c) =>
    c.renewalSchedule.map((r) => {
      const paid = r.payments.reduce((a, p) => a + p.amount, 0);
      return {
        contractId: c.id, clientName: c.clientName, salesperson: c.salesperson,
        accountManager: c.accountManager, product: c.product,
        year: r.year, month: r.month, expected: r.amount,
        collected: r.status === "collected" ? r.amount : paid,
        outstanding: Math.max(r.status === "collected" ? 0 : r.amount - paid, 0),
        status: r.status, payments: r.payments,
      };
    })
  );
}

export function PaymentHistory() {
  const [search,     setSearch]     = useState("");
  const [execFilter, setExecFilter] = useState("All");
  const [yearFilter, setYearFilter] = useState("All");
  const [sortKey,    setSortKey]    = useState<SortKey>("month");
  const [sortDir,    setSortDir]    = useState<SortDir>("asc");
  const [expanded,   setExpanded]   = useState<string|null>(null);

  const ledger = useMemo(() => buildLedger(), []);
  const rows = useMemo(() => {
    let data = ledger;
    if (execFilter !== "All") data = data.filter((r) => r.salesperson === execFilter);
    if (yearFilter !== "All") data = data.filter((r) => r.year === Number(yearFilter));
    if (search.trim()) data = data.filter((r) =>
      r.clientName.toLowerCase().includes(search.toLowerCase()) ||
      r.accountManager.toLowerCase().includes(search.toLowerCase()) ||
      r.product.toLowerCase().includes(search.toLowerCase())
    );
    return [...data].sort((a, b) => {
      const map: Record<SortKey, any[]> = {
        client: [a.clientName, b.clientName], salesperson: [a.salesperson, b.salesperson],
        month: [a.year*100+a.month, b.year*100+b.month], expected: [a.expected, b.expected],
        collected: [a.collected, b.collected], outstanding: [a.outstanding, b.outstanding], status: [a.status, b.status],
      };
      const [av, bv] = map[sortKey];
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
  }, [ledger, execFilter, yearFilter, search, sortKey, sortDir]);

  const totals = useMemo(() => ({
    expected:         rows.reduce((a,r)=>a+r.expected,0),
    collected:        rows.reduce((a,r)=>a+r.collected,0),
    outstanding:      rows.reduce((a,r)=>a+r.outstanding,0),
    partial:          rows.filter((r)=>r.status==="partial").length,
    overdue:          rows.filter((r)=>r.status==="overdue").length,
    collectedClients: new Set(
      rows
        .filter((r)=>r.status==="collected"||r.status==="partial")
        .map((r)=>r.clientName)
    ).size,
    outstandingClients: new Set(
      rows
        .filter((r)=>r.status==="pending"||r.status==="partial"||r.status==="overdue")
        .map((r)=>r.clientName)
    ).size,
  }), [rows]);

  const collectionRate = totals.expected > 0 ? Math.round((totals.collected/totals.expected)*100) : 0;

  function toggleSort(key: SortKey) {
    if (sortKey===key) setSortDir((d)=>d==="asc"?"desc":"asc");
    else { setSortKey(key); setSortDir("asc"); }
  }
  function SortIcon({ k }: { k: SortKey }) {
    if (sortKey!==k) return <ChevronDown className="w-3 h-3 text-slate-300"/>;
    return sortDir==="asc" ? <ChevronUp className="w-3 h-3 text-accent"/> : <ChevronDown className="w-3 h-3 text-accent"/>;
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label:"Total Expected",    value:formatCurrency(totals.expected),            icon:IndianRupee,   color:"text-slate-700",    bg:"bg-slate-100"            },
          { label:"Total Collected",   value:formatCurrency(totals.collected),           icon:TrendingUp,    color:"text-accent-green",  bg:"bg-accent-greenLight",   sub: `${totals.collectedClients} client${totals.collectedClients!==1?"s":""}` },
          { label:"Total Outstanding", value:formatCurrency(totals.outstanding),         icon:Clock,         color:"text-accent-amber",  bg:"bg-accent-amberLight",   sub: `${totals.outstandingClients} client${totals.outstandingClients!==1?"s":""}` },
          { label:"Partial Payments",  value:totals.partial+" renewals",                 icon:Receipt,       color:"text-accent-purple", bg:"bg-purple-50"            },
          { label:"Overdue",           value:totals.overdue+" renewals",                 icon:AlertTriangle, color:"text-accent-red",    bg:"bg-accent-redLight"      },
        ].map(({label,value,icon:Icon,color,bg,...rest})=>(
          <div key={label} className="bg-white border border-slate-200 rounded-xl p-4 flex items-start gap-3 shadow-card">
            <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0",bg)}>
              <Icon className={cn("w-4 h-4",color)}/>
            </div>
            <div>
              <p className="text-[10px] text-slate-400 uppercase tracking-wide">{label}</p>
              <p className={cn("text-sm font-bold mt-0.5",color)}>{value}</p>
              {(rest as any).sub && (
                <p className="text-[10px] text-slate-400 mt-0.5">{(rest as any).sub}</p>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Collection rate */}
      <div className="bg-white border border-slate-200 rounded-xl px-5 py-4 shadow-card">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-semibold text-slate-600">Overall Collection Rate</p>
          <p className={cn("text-sm font-bold", collectionRate>=80?"text-accent-green":collectionRate>=50?"text-accent-amber":"text-accent-red")}>{collectionRate}%</p>
        </div>
        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
          <div className={cn("h-full rounded-full transition-all duration-700", collectionRate>=80?"bg-accent-green":collectionRate>=50?"bg-accent-amber":"bg-accent-red")}
            style={{width:`${collectionRate}%`}} />
        </div>
        <div className="flex justify-between text-[10px] text-slate-400 mt-1.5">
          <span>{formatCurrency(totals.collected)} collected</span>
          <span>{formatCurrency(totals.outstanding)} outstanding</span>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-48 max-w-xs">
          <Input placeholder="Search client, AM, product…" value={search} onChange={(e)=>setSearch(e.target.value)} leftIcon={<Search className="w-3.5 h-3.5"/>}/>
        </div>
        <div className="flex gap-1 flex-wrap">
          {SALESPERSONS.map((sp)=>(
            <button key={sp} onClick={()=>setExecFilter(sp)} className={cn(
              "px-2.5 py-1 rounded-lg text-xs font-medium transition-all border flex items-center gap-1.5",
              execFilter===sp?"bg-accent-light text-accent border-accent-border":"text-slate-500 hover:text-slate-700 hover:bg-slate-50 border-transparent"
            )}>
              {sp!=="All"&&<span className="w-1.5 h-1.5 rounded-full" style={{backgroundColor:SALESPERSON_COLORS[sp]}}/>}
              {sp}
            </button>
          ))}
        </div>
        <div className="flex gap-1 ml-auto">
          {YEARS.map((y)=>(
            <button key={y} onClick={()=>setYearFilter(y)} className={cn(
              "px-2.5 py-1 rounded-lg text-xs font-medium transition-all border",
              yearFilter===y?"bg-slate-100 text-slate-700 border-slate-200":"text-slate-400 hover:text-slate-600 border-transparent"
            )}>{y}</button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-card">
        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <p className="text-xs font-semibold text-slate-500">{rows.length} renewal entries</p>
          <p className="text-xs text-slate-400">Click a row to see payment breakdown</p>
        </div>
        {rows.length===0 ? (
          <EmptyState icon={Receipt} title="No payments found" description="Try adjusting your filters."/>
        ) : (
          <>
            <Table>
              <THead>
                <Th><button onClick={()=>toggleSort("client")} className="flex items-center gap-1 hover:text-slate-700">Client <SortIcon k="client"/></button></Th>
                <Th><button onClick={()=>toggleSort("salesperson")} className="flex items-center gap-1 hover:text-slate-700">Exec <SortIcon k="salesperson"/></button></Th>
                <Th>AM</Th>
                <Th><button onClick={()=>toggleSort("month")} className="flex items-center gap-1 hover:text-slate-700">Month <SortIcon k="month"/></button></Th>
                <Th><button onClick={()=>toggleSort("expected")} className="flex items-center gap-1 hover:text-slate-700">Expected <SortIcon k="expected"/></button></Th>
                <Th><button onClick={()=>toggleSort("collected")} className="flex items-center gap-1 hover:text-slate-700">Collected <SortIcon k="collected"/></button></Th>
                <Th><button onClick={()=>toggleSort("outstanding")} className="flex items-center gap-1 hover:text-slate-700">Outstanding <SortIcon k="outstanding"/></button></Th>
                <Th><button onClick={()=>toggleSort("status")} className="flex items-center gap-1 hover:text-slate-700">Status <SortIcon k="status"/></button></Th>
              </THead>
              <TBody>
                {rows.map((r)=>{
                  const rowKey=`${r.contractId}-${r.year}-${r.month}`;
                  const isExp=expanded===rowKey;
                  const pct=r.expected>0?Math.round((r.collected/r.expected)*100):0;
                  return(
                    <>
                      <Tr key={rowKey} onClick={()=>setExpanded(isExp?null:rowKey)} className={cn(isExp&&"bg-slate-50")}>
                        <Td>
                          <ClientLink clientName={r.clientName} salesperson={r.salesperson} showDot />
                        </Td>
                        <Td><span className="text-slate-500">{r.salesperson}</span></Td>
                        <Td><span className="text-slate-400 text-xs">{r.accountManager}</span></Td>
                        <Td><span className="text-slate-500">{getMonthShort(r.month)} {r.year}</span></Td>
                        <Td><span className="font-medium text-slate-600">{formatCurrency(r.expected)}</span></Td>
                        <Td>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-accent-green">{formatCurrency(r.collected)}</span>
                            <div className="w-12 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                              <div className={cn("h-full rounded-full",pct>=100?"bg-accent-green":pct>0?"bg-accent-amber":"bg-slate-200")} style={{width:`${pct}%`}}/>
                            </div>
                          </div>
                        </Td>
                        <Td><span className={cn("font-semibold",r.outstanding>0?"text-accent-amber":"text-slate-300")}>{r.outstanding>0?formatCurrency(r.outstanding):"—"}</span></Td>
                        <Td><StatusBadge status={r.status}/></Td>
                      </Tr>
                      {isExp&&(
                        <tr key={`${rowKey}-exp`} className="bg-slate-50/80">
                          <td colSpan={8} className="px-8 py-3">
                            {r.payments.length===0?(
                              <p className="text-xs text-slate-400 py-1">No individual payments recorded yet.</p>
                            ):(
                              <div className="space-y-1.5">
                                <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mb-2">Payment History</p>
                                {r.payments.map((p,i)=>(
                                  <div key={i} className="flex items-center justify-between text-xs bg-white px-3 py-2 rounded-lg border border-slate-200">
                                    <span className="text-slate-400">{formatDate(p.paidOn)}</span>
                                    <span className="text-slate-500">{p.recordedBy}</span>
                                    {p.notes&&<span className="text-slate-400 italic truncate max-w-[180px]">{p.notes}</span>}
                                    <span className="font-semibold text-accent-green">{formatCurrency(p.amount)}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })}
              </TBody>
            </Table>
            <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-between bg-slate-50/50">
              <span className="text-xs text-slate-400">{rows.length} entries</span>
              <div className="flex items-center gap-6 text-xs text-slate-400">
                <span>Expected: <span className="font-semibold text-slate-600 ml-1">{formatCurrency(totals.expected)}</span></span>
                <span>Collected: <span className="font-semibold text-accent-green ml-1">{formatCurrency(totals.collected)}</span></span>
                <span>Outstanding: <span className="font-semibold text-accent-amber ml-1">{formatCurrency(totals.outstanding)}</span></span>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}