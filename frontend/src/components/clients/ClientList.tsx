"use client";
import { useMemo, useState } from "react";
import { useContracts } from "@/lib/api";
import { Contract } from "@/types";
import { ClientCard } from "./ClientCard";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { EmptyState } from "@/components/ui/Misc";
import { formatCurrency, SALESPERSON_COLORS } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { Search, Users, LayoutGrid, List } from "lucide-react";

interface ClientListProps {
  onSelectClient: (contracts: Contract[]) => void;
  stoppedClients?: (name: string) => boolean;
  salespersonFilter?: string | null;
}

const SALESPERSONS = ["All","Aftab","Sarvesh","Firoz","Idris","Prajay","Vinay"];
const SORT_OPTS = [
  { value:"name",    label:"Name (A–Z)"   },
  { value:"value",   label:"Deal Value"   },
  { value:"exec",    label:"Salesperson"  },
  { value:"renewal", label:"Next Renewal" },
];
const STATUS_FILTERS = ["All", "Active", "Stopped"];

export function ClientList({ onSelectClient, stoppedClients, salespersonFilter }: ClientListProps) {
  const [search,       setSearch]       = useState("");
  const [execFilter,   setExecFilter]   = useState("All");
  const [sortBy,       setSortBy]       = useState("name");
  const [viewMode,     setViewMode]     = useState<"grid"|"list">("grid");
  const [statusFilter, setStatusFilter] = useState("All");

  const { data: allContracts = [], isLoading } = useContracts();

  const activeExecFilter = salespersonFilter ?? (execFilter === "All" ? null : execFilter);

  const clientMap = useMemo(() => {
    const map: Record<string, Contract[]> = {};
    allContracts.forEach((c) => {
      if (!map[c.clientName]) map[c.clientName] = [];
      map[c.clientName].push(c);
    });
    return map;
  }, [allContracts]);

  const clients = useMemo(() => {
    let entries = Object.entries(clientMap);
    if (activeExecFilter) entries = entries.filter(([, cs]) => cs.some((c) => c.salesperson === activeExecFilter));
    if (statusFilter === "Active")  entries = entries.filter(([name]) => !stoppedClients?.(name));
    if (statusFilter === "Stopped") entries = entries.filter(([name]) => stoppedClients?.(name));
    if (search.trim()) entries = entries.filter(([name, cs]) =>
      name.toLowerCase().includes(search.toLowerCase()) ||
      cs.some((c) =>
        c.accountManager.toLowerCase().includes(search.toLowerCase()) ||
        c.salesperson.toLowerCase().includes(search.toLowerCase()) ||
        (c.contractId ?? "").toLowerCase().includes(search.toLowerCase())
      )
    );
    entries.sort(([nameA, csA], [nameB, csB]) => {
      if (sortBy === "name")    return nameA.localeCompare(nameB);
      if (sortBy === "value")   return csB.reduce((a,c)=>a+c.dealValue,0) - csA.reduce((a,c)=>a+c.dealValue,0);
      if (sortBy === "exec")    return csA[0].salesperson.localeCompare(csB[0].salesperson);
      if (sortBy === "renewal") {
        const getNext = (cs: Contract[]) =>
          cs.flatMap((c) => (c.renewalSchedule ?? [])).map((r) => r.year*100+r.month).sort()[0] ?? 999999;
        return getNext(csA) - getNext(csB);
      }
      return 0;
    });
    return entries;
  }, [clientMap, activeExecFilter, statusFilter, search, sortBy, stoppedClients]);

  return (
    <div className="flex flex-col gap-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-48 max-w-sm">
          <Input placeholder="Search client, AM, executive, ID…" value={search} onChange={(e) => setSearch(e.target.value)} leftIcon={<Search className="w-3.5 h-3.5"/>}/>
        </div>

        {!salespersonFilter && (
          <div className="flex gap-1 flex-wrap">
            {SALESPERSONS.map((sp) => (
              <button key={sp} onClick={() => setExecFilter(sp)} className={cn(
                "px-2.5 py-1 rounded-lg text-xs font-medium transition-all border",
                execFilter === sp ? "bg-accent-light text-accent border-accent-border" : "text-slate-500 hover:text-slate-700 hover:bg-slate-50 border-transparent"
              )}>{sp}</button>
            ))}
          </div>
        )}

        <div className="flex gap-1">
          {STATUS_FILTERS.map((s) => (
            <button key={s} onClick={() => setStatusFilter(s)} className={cn(
              "px-2.5 py-1 rounded-lg text-xs font-medium transition-all border",
              statusFilter === s ? "bg-accent-light text-accent border-accent-border" : "text-slate-500 hover:text-slate-700 hover:bg-slate-50 border-transparent"
            )}>{s}</button>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-2">
          <Select options={SORT_OPTS} value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="w-40 h-8 text-xs"/>
          <div className="flex border border-slate-200 rounded-lg overflow-hidden">
            <button onClick={() => setViewMode("grid")} className={cn("px-2.5 py-1.5 transition-colors", viewMode==="grid"?"bg-slate-100 text-slate-700":"text-slate-400 hover:text-slate-600")}>
              <LayoutGrid className="w-3.5 h-3.5"/>
            </button>
            <button onClick={() => setViewMode("list")} className={cn("px-2.5 py-1.5 border-l border-slate-200 transition-colors", viewMode==="list"?"bg-slate-100 text-slate-700":"text-slate-400 hover:text-slate-600")}>
              <List className="w-3.5 h-3.5"/>
            </button>
          </div>
        </div>
      </div>

      {/* Count */}
      <div className="flex items-center gap-2">
        <Users className="w-3.5 h-3.5 text-slate-400"/>
        <span className="text-xs text-slate-400">
          {isLoading ? "Loading clients..." : `${clients.length} client${clients.length !== 1 ? "s" : ""}${salespersonFilter ? ` · ${salespersonFilter}'s accounts` : (activeExecFilter || search) ? " (filtered)" : ""}`}
        </span>
      </div>

      {/* Grid or List */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="bg-white border border-slate-200 rounded-xl p-4 shadow-card animate-pulse h-40" />
          ))}
        </div>
      ) : clients.length === 0 ? (
        <EmptyState icon={Users} title="No clients found" description="Try adjusting your search or filters."/>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {clients.map(([name, cs]) => (
            <ClientCard key={name} contracts={cs} onClick={() => onSelectClient(cs)} stopped={stoppedClients?.(name)}/>
          ))}
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-card">
          <div className="divide-y divide-slate-100">
            {clients.map(([name, cs]) => {
              const primary    = cs[0];
              const totalValue = cs.reduce((a, c) => a + c.dealValue, 0);
              const color      = SALESPERSON_COLORS[primary.salesperson];
              return (
                <button key={name} onClick={() => onSelectClient(cs)} className="w-full flex items-center gap-4 px-5 py-3 hover:bg-slate-50 transition-colors text-left">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0"
                    style={{backgroundColor:color+"15", color}}>
                    {name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-700 truncate">{name}</p>
                    <p className="text-xs text-slate-400">{primary.salesperson} · {primary.accountManager}</p>
                    {stoppedClients?.(name) && (
                      <span className="text-[10px] text-accent-red bg-accent-redLight border border-red-200 px-1 py-0.5 rounded">Stopped</span>
                    )}
                  </div>
                  <div className="flex items-center gap-4 flex-shrink-0">
                    <span className="text-xs text-slate-400 hidden sm:block">{cs.length} service{cs.length > 1 ? "s" : ""}</span>
                    <span className="text-sm font-semibold text-slate-600">{formatCurrency(totalValue)}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}