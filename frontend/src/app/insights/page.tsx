"use client";
import { useState, useMemo } from "react";
import { PageWrapper } from "@/components/layout/PageWrapper";
import { useActiveContracts, useServices } from "@/lib/api";
import { MONTH_COLS, parseMonthCol } from "@/lib/utils";
import { formatCurrency, SALESPERSON_COLORS, dedupeCaseInsensitive } from "@/lib/utils";
import { ClientLink } from "@/components/clients/ClientLink";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";
import * as XLSX from "xlsx";
import {
  Filter, X, Users, Package, IndianRupee, Layers,
  TrendingUp, Award, GitBranch, BarChart2, ChevronDown, ChevronUp,
  Download, Loader2, CalendarDays,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  Cell, PieChart, Pie,
} from "recharts";

// ─── Constants ────────────────────────────────────────────────────────────────
// ALL_SALESPERSONS and ALL_AMS are derived live from loaded contract data
// inside the component (see useMemo below) — this way a new exec or AM hire
// automatically appears in these filters as soon as they have contracts
// assigned, with no code change needed.
//
// ALL_SERVICE_TOKENS is derived live inside the component too — merging
// active atomic services (from the Service table, managed in Settings) with
// any atomic token found on a real contract's product field. The company
// only offers 4 atomic services (DM/GMB/SMM/SEO); a client with multiple
// services has one contract row per service. Some historical rows still
// carry legacy combo strings (e.g. "GMB + SMM + SEO") from before this
// model — tokenizeProduct() splits on " + " so both shapes (atomic rows
// going forward, legacy combo rows in the past) resolve to the same atomic
// tokens for filtering purposes, with no data migration needed.
function tokenizeProduct(product: string): string[] {
  return product.split("+").map((s) => s.trim()).filter(Boolean);
}

// Number of distinct atomic services a client's contracts represent,
// tokenized — so a single combo contract (one row whose product string is
// e.g. "DM + SMM") correctly counts as 2 services, not 1. Using the raw
// number of contract ROWS (cs.length) here — which this file used to do —
// makes any combo-priced client (one contract, multiple bundled services)
// invisible to "multi-service" detection, even though they obviously have
// multiple services. This is what actually drives the "Multi-Service" KPI,
// the multiOnly filter toggle, and the "X services" badge in the client list.
function clientServiceCount(cs: { product: string }[]): number {
  return new Set(cs.flatMap((c) => tokenizeProduct(c.product))).size;
}

const PRODUCT_COLORS = [
  "#4F46E5","#0891B2","#7C3AED","#059669","#D97706","#DC2626",
  "#8B5CF6","#0D9488","#F59E0B","#EF4444",
];

const MONTH_OPTIONS = MONTH_COLS.map((col) => {
  const { year, month } = parseMonthCol(col);
  const label = `${["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][month-1]} ${year}`;
  return { col, label, year, month };
});

// ─── Helpers ──────────────────────────────────────────────────────────────────
function Toggle({ label, active, color, onClick }: { label: string; active: boolean; color?: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className={cn(
      "flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border transition-all",
      active ? "text-white border-transparent shadow-sm" : "bg-white text-slate-500 border-slate-200 hover:border-slate-300 hover:text-slate-700"
    )} style={active && color ? { backgroundColor: color, borderColor: color } : {}}>
      {active && color && <span className="w-1.5 h-1.5 rounded-full bg-white/70" />}
      {label}
      {active && <X className="w-3 h-3 opacity-70" />}
    </button>
  );
}

function AccentToggle({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} className={cn(
      "px-2.5 py-1 rounded-lg text-xs font-medium border transition-all",
      active ? "bg-accent text-white border-accent shadow-sm" : "bg-white text-slate-500 border-slate-200 hover:border-slate-300"
    )}>
      {label}
    </button>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function InsightsPage() {
  const { user, canPerform } = useAuth();
  const { data: allContracts = [], isLoading } = useActiveContracts();
  const { data: services = [] } = useServices();

  // ── Role-awareness ────────────────────────────────────────────────────────
  // For employees: pre-lock the salesperson filter to their own name.
  // For account managers: pre-lock the AM filter to their own name.
  // These are derived once on mount and cannot be changed by the user.
  const isEmployee = user?.role === "employee";
  const isAM       = user?.role === "account_manager";
  const isRestricted = isEmployee || isAM;

  const lockedSalesperson = isEmployee ? (user?.salesperson ?? null) : null;
  const lockedAM          = isAM ? (user?.accountManager ?? null) : null;

  // Derived live from actual contract data — stays accurate as the team
  // changes; a new exec or AM hire appears automatically, no code change.

  // Derived live from actual contract data — stays accurate as the team
  // changes; a new exec or AM hire appears automatically, no code change.
  const ALL_SALESPERSONS = useMemo(
    () => Array.from(new Set(allContracts.map((c) => c.salesperson).filter(Boolean))).sort() as string[],
    [allContracts]
  );

  const ALL_AMS = useMemo(
    () => dedupeCaseInsensitive(allContracts.map((c) => c.accountManager).filter(Boolean) as string[]).sort(),
    [allContracts]
  );
  

  const ALL_SERVICE_TOKENS = useMemo(() => {
    const activeNames = services.filter((s) => s.isActive).map((s) => s.name);
    const contractTokens = allContracts.flatMap((c) => tokenizeProduct(c.product));
    const allTokens = Array.from(new Set([...activeNames, ...contractTokens]));
    return allTokens.sort();
  }, [services, allContracts]);

  const [selExecs,    setSelExecs]    = useState<string[]>(lockedSalesperson ? [lockedSalesperson] : []);
  const [selServices, setSelServices] = useState<string[]>([]);
  const [matchMode,   setMatchMode]   = useState<"AND" | "OR">("AND");
  const [selAMs,      setSelAMs]      = useState<string[]>(lockedAM ? [lockedAM] : []);
  const [selGST,      setSelGST]      = useState<"all"|"Y"|"N">("all");
  const [multiOnly,   setMultiOnly]   = useState(false);
  const [showFilters, setShowFilters] = useState(true);
  const [exporting,   setExporting]   = useState(false);
  const [fromCol, setFromCol] = useState(MONTH_COLS[0]);
  const [toCol,   setToCol]   = useState(MONTH_COLS[MONTH_COLS.length - 1]);

  const fromIdx = MONTH_COLS.indexOf(fromCol);
  const toIdx   = MONTH_COLS.indexOf(toCol);
  const selectedMonthCols = MONTH_COLS.slice(fromIdx, toIdx + 1);

  function toggle<T>(arr: T[], val: T): T[] {
    return arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val];
  }

  // ── Filtered contracts ────────────────────────────────────────────────────
  // Service matching happens at the CLIENT level, not the contract level —
  // a client's full service set is the union of atomic tokens across all of
  // their (non-service-filtered) contract rows. This is what lets "DM + GMB"
  // work correctly even though a client with both services is two separate
  // Contract rows, not one combined record.
  //
  // Step 1: apply the non-service filters (exec/AM/GST) at the contract level.
  const preFiltered = useMemo(() =>
    allContracts.filter((c) => {
      if (selExecs.length  && !selExecs.includes(c.salesperson))   return false;
      if (selAMs.length    && !selAMs.includes(c.accountManager))  return false;
      if (selGST !== "all" && c.gstStatus !== selGST)              return false;
      return true;
    }), [allContracts, selExecs, selAMs, selGST]);

  // Step 2: group the pre-filtered contracts by client.
  const preClientMap = useMemo(() => {
    const map: Record<string, typeof preFiltered> = {};
    preFiltered.forEach((c) => { if (!map[c.clientName]) map[c.clientName] = []; map[c.clientName].push(c); });
    return map;
  }, [preFiltered]);

  // Step 3: decide which clients qualify under the selected services + match mode.
  //   AND ("exactly these services")  → client's service set EQUALS selServices exactly (S == C, no extras)
  //   OR  ("only one of these")       → client's ENTIRE service set is a single service,
  //                                     and that one service is among selServices (no extras of any kind)
  //   No services selected            → every client qualifies
  const qualifyingClientNames = useMemo(() => {
    if (selServices.length === 0) return new Set(Object.keys(preClientMap));
    const names = new Set<string>();
    for (const [name, cs] of Object.entries(preClientMap)) {
      const serviceSet = new Set(cs.flatMap((c) => tokenizeProduct(c.product)));
      if (matchMode === "AND") {
        const isExactMatch =
          selServices.length === serviceSet.size &&
          selServices.every((s) => serviceSet.has(s));
        if (isExactMatch) names.add(name);
      } else {
        const isSingleSelectedService =
          serviceSet.size === 1 &&
          selServices.some((s) => serviceSet.has(s));
        if (isSingleSelectedService) names.add(name);
      }
    }
    return names;
  }, [preClientMap, selServices, matchMode]);

  // Step 4: final contract list = pre-filtered contracts belonging to a qualifying client.
  const filtered = useMemo(() =>
    preFiltered.filter((c) => qualifyingClientNames.has(c.clientName)),
    [preFiltered, qualifyingClientNames]);

  const clientMap = useMemo(() => {
    const map: Record<string, typeof filtered> = {};
    filtered.forEach((c) => { if (!map[c.clientName]) map[c.clientName] = []; map[c.clientName].push(c); });
    return map;
  }, [filtered]);

  const visibleClients = useMemo(() =>
    Object.entries(clientMap).filter(([name, cs]) => {
      // FIX: was `cs.length <= 1` (contract row count) — now uses the
      // tokenized service count, so a combo contract with 2+ bundled
      // services correctly counts as multi-service even though it's a
      // single row.
      if (multiOnly && clientServiceCount(cs) <= 1) return false;
      // Hide clients with no renewals in the selected month range
      const rangePipeline = cs.reduce((a, c) =>
        a + (c.renewalSchedule ?? []).filter((r) => {
          const col = `${["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][r.month-1]}-${r.year}`;
          return selectedMonthCols.includes(col);
        }).reduce((b, r) => b + r.amount, 0), 0);
      return rangePipeline > 0;
    }),
    [clientMap, multiOnly, selectedMonthCols]);

  const filteredWithMonthRange = useMemo(() =>
    filtered.map((c) => ({
      ...c,
      renewalSchedule: (c.renewalSchedule ?? []).filter((r) => {
        const col = `${["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][r.month-1]}-${r.year}`;
        return selectedMonthCols.includes(col);
      }),
    })), [filtered, selectedMonthCols]);

  const productFrequency = useMemo(() => {
    const counts: Record<string, { count: number; pipeline: number }> = {};
    filtered.forEach((c) => {
      if (!counts[c.product]) counts[c.product] = { count: 0, pipeline: 0 };
      counts[c.product].count++;
      const rangeValue = (c.renewalSchedule ?? [])
        .filter((r) => {
          const col = `${["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][r.month-1]}-${r.year}`;
          return selectedMonthCols.includes(col);
        })
        .reduce((a, r) => a + r.amount, 0);
      counts[c.product].pipeline += rangeValue;
    });
    return Object.entries(counts).map(([name, d]) => ({ name, ...d })).sort((a, b) => b.count - a.count);
  }, [filtered, selectedMonthCols]);

  const amPipeline = useMemo(() => {
    const map: Record<string, number> = {};
    filteredWithMonthRange.forEach((c) => {
      const val = c.renewalSchedule.reduce((a, r) => a + r.amount, 0);
      map[c.accountManager] = (map[c.accountManager] ?? 0) + val;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 8);
  }, [filteredWithMonthRange]);

  // FIX: was `cs.length > 1` (contract row count) — now uses the tokenized
  // service count. A combo client (1 contract row, e.g. "DM + SMM") is a
  // multi-service client too, and was previously invisible here entirely.
  const multiServiceClients = useMemo(() =>
    Object.entries(clientMap).filter(([, cs]) => clientServiceCount(cs) > 1).sort((a, b) => clientServiceCount(b[1]) - clientServiceCount(a[1])),
    [clientMap]);

  const execPipeline = useMemo(() => {
    const map: Record<string, { pipeline: number; clients: number }> = {};
    filteredWithMonthRange.forEach((c) => {
      if (!map[c.salesperson]) map[c.salesperson] = { pipeline: 0, clients: 0 };
      map[c.salesperson].pipeline += c.renewalSchedule.reduce((a, r) => a + r.amount, 0);
    });
    Object.entries(clientMap).forEach(([, cs]) => {
      const exec = cs[0].salesperson;
      if (map[exec]) map[exec].clients++;
    });
    return Object.entries(map).map(([name, d]) => ({ name, ...d })).sort((a, b) => b.pipeline - a.pipeline);
  }, [filteredWithMonthRange, clientMap]);

  const totalPipeline  = filteredWithMonthRange.reduce((a, c) => a + c.renewalSchedule.reduce((b, r) => b + r.amount, 0), 0);

  // Only count clients/contracts that have at least one renewal in the selected range
  const clientsInRange = Object.entries(clientMap).filter(([, cs]) =>
    cs.some((c) => (c.renewalSchedule ?? []).some((r) => {
      const col = `${["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][r.month-1]}-${r.year}`;
      return selectedMonthCols.includes(col);
    }))
  );
  const totalContracts = clientsInRange.reduce((a, [, cs]) => a + cs.length, 0);
  const totalClients   = clientsInRange.length;
  // FIX: was based on the old cs.length>1 multiServiceClients list — now
  // inherits the tokenized-count fix automatically since multiServiceClients
  // itself is fixed above.
  const multiCount     = multiServiceClients.filter(([, cs]) =>
    cs.some((c) => (c.renewalSchedule ?? []).some((r) => {
      const col = `${["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][r.month-1]}-${r.year}`;
      return selectedMonthCols.includes(col);
    }))
  ).length;

  const activeFilterCount = (isEmployee ? 0 : selExecs.length) + selServices.length + (isAM ? 0 : selAMs.length)
    + (selGST !== "all" ? 1 : 0)
    + (multiOnly ? 1 : 0)
    + (fromCol !== MONTH_COLS[0] || toCol !== MONTH_COLS[MONTH_COLS.length-1] ? 1 : 0);

  function clearAll() {
    setSelExecs(lockedSalesperson ? [lockedSalesperson] : []);
    setSelAMs(lockedAM ? [lockedAM] : []);
    setSelServices([]);
    setMatchMode("AND");
    setSelGST("all"); setMultiOnly(false);
    setFromCol(MONTH_COLS[0]); setToCol(MONTH_COLS[MONTH_COLS.length-1]);
  }

  async function handleExport() {
    setExporting(true);
    await new Promise((r) => setTimeout(r, 80));
    try {
      const today   = new Date();
      const dateStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,"0")}-${String(today.getDate()).padStart(2,"0")}`;
      const filename = `ZribbleOS_Insights_${dateStr}.xlsx`;
      const headers = [
        "Client","Salesperson","Product","Account Manager",
        "Contract ID","Profiles","GST","Deal Value (₹)",
        "Term (months)","First Renewal",
        ...selectedMonthCols,"Range Pipeline (₹)",
      ];
      const rows = visibleClients.flatMap(([, cs]) =>
        cs.map((c) => {
          const monthMap: Record<string, number> = {};
          (c.renewalSchedule ?? []).forEach((r) => {
            const col = `${["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][r.month-1]}-${r.year}`;
            monthMap[col] = r.amount;
          });
          const monthValues   = selectedMonthCols.map((col) => monthMap[col] ?? 0);
          const rangePipeline = monthValues.reduce((a, v) => a + v, 0);
          return [
            c.clientName, c.salesperson, c.product, c.accountManager,
            c.contractId || "", c.profiles, c.gstStatus === "Y" ? "Yes" : "No",
            c.dealValue, c.contractTermMonths, c.firstRenewalDate,
            ...monthValues, rangePipeline,
          ];
        })
      );
      rows.sort((a, b) => String(a[0]).localeCompare(String(b[0])));
      const wsData = [headers, ...rows];
      const ws = XLSX.utils.aoa_to_sheet(wsData);
      ws["!cols"] = [
        { wch:30 },{ wch:12 },{ wch:22 },{ wch:14 },
        { wch:10 },{ wch:8 },{ wch:6 },{ wch:14 },
        { wch:8 },{ wch:14 },
        ...selectedMonthCols.map(() => ({ wch:10 })),
        { wch:16 },
      ];
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Filtered Data");
      XLSX.writeFile(wb, filename);
    } finally {
      setExporting(false);
    }
  }

  if (!canPerform("view_insights")) {
    return (
      <PageWrapper>
        <div className="flex flex-col items-center justify-center h-64 gap-3">
          <BarChart2 className="w-10 h-10 text-slate-300" />
          <p className="text-slate-500 font-medium">Access restricted</p>
          <p className="text-sm text-slate-400">Insights are not available for your role.</p>
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper wide>
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
            <BarChart2 className="w-5 h-5 text-accent" /> Insights & Filters
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            {isRestricted
              ? "Slice your own portfolio any way you need — by service, month range, or overlap."
              : "Slice the portfolio any way you need — by exec, service, AM, month range, or overlap."}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleExport} disabled={exporting || isLoading}
            className={cn("flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-medium transition-all shadow-card",
              exporting ? "bg-slate-50 text-slate-400 border-slate-200 cursor-not-allowed"
                        : "bg-white text-slate-600 border-slate-200 hover:border-accent hover:text-accent hover:bg-accent-light/20")}>
            {exporting ? <><Loader2 className="w-4 h-4 animate-spin"/> Exporting...</> : <><Download className="w-4 h-4"/> Export Excel</>}
          </button>
          <button onClick={() => setShowFilters((v) => !v)}
            className="flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-all shadow-card">
            <Filter className="w-4 h-4"/>
            Filters
            {activeFilterCount > 0 && (
              <span className="w-5 h-5 rounded-full bg-accent text-white text-[10px] font-bold flex items-center justify-center">{activeFilterCount}</span>
            )}
            {showFilters ? <ChevronUp className="w-3.5 h-3.5"/> : <ChevronDown className="w-3.5 h-3.5"/>}
          </button>
        </div>
      </div>

      {/* Filter Panel */}
      {showFilters && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 mb-6 shadow-card space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Active Filters</p>
            {activeFilterCount > 0 && (
              <button onClick={clearAll} className="text-xs text-accent-red hover:underline flex items-center gap-1">
                <X className="w-3 h-3"/> Clear all
              </button>
            )}
          </div>

          {/* Month range */}
          <div>
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-2 flex items-center gap-1.5">
              <CalendarDays className="w-3 h-3"/> Month Range
            </p>
            <div className="flex items-center gap-3 flex-wrap">
              <div>
                <label className="text-[10px] text-slate-400 block mb-1">From</label>
                <select value={fromCol} onChange={(e) => { setFromCol(e.target.value); if (MONTH_COLS.indexOf(e.target.value) > MONTH_COLS.indexOf(toCol)) setToCol(e.target.value); }}
                  className="px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg bg-white text-slate-700 focus:outline-none focus:border-accent">
                  {MONTH_OPTIONS.map((m) => <option key={m.col} value={m.col}>{m.label}</option>)}
                </select>
              </div>
              <span className="text-slate-400 text-xs mt-4">→</span>
              <div>
                <label className="text-[10px] text-slate-400 block mb-1">To</label>
                <select value={toCol} onChange={(e) => { setToCol(e.target.value); if (MONTH_COLS.indexOf(e.target.value) < MONTH_COLS.indexOf(fromCol)) setFromCol(e.target.value); }}
                  className="px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg bg-white text-slate-700 focus:outline-none focus:border-accent">
                  {MONTH_OPTIONS.map((m) => <option key={m.col} value={m.col}>{m.label}</option>)}
                </select>
              </div>
              <div className="mt-4 px-3 py-1.5 bg-accent-light border border-accent-border rounded-lg">
                <span className="text-xs font-semibold text-accent">{selectedMonthCols.length} month{selectedMonthCols.length !== 1 ? "s" : ""} selected</span>
              </div>
              <div className="flex gap-1 mt-4">
                {[{ label:"3m", from:0, to:2 },{ label:"6m", from:0, to:5 },{ label:"12m", from:0, to:11 },{ label:"All", from:0, to:29 }].map(({ label, from, to }) => (
                  <button key={label} onClick={() => { setFromCol(MONTH_COLS[from]); setToCol(MONTH_COLS[Math.min(to, MONTH_COLS.length-1)]); }}
                    className={cn("px-2 py-1 rounded-lg text-[11px] font-semibold border transition-all",
                      fromCol === MONTH_COLS[from] && toCol === MONTH_COLS[Math.min(to, MONTH_COLS.length-1)]
                        ? "bg-accent text-white border-accent" : "bg-white text-slate-500 border-slate-200 hover:border-slate-300")}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="border-t border-slate-100" />
          <div>
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-2">Salesperson</p>
            {isEmployee ? (
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border text-white border-transparent"
                  style={{ backgroundColor: SALESPERSON_COLORS[lockedSalesperson!] }}>
                  <span className="w-1.5 h-1.5 rounded-full bg-white/70" />
                  {lockedSalesperson}
                </span>
                <span className="text-[10px] text-slate-400 italic">locked to your account</span>
              </div>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {ALL_SALESPERSONS.map((sp) => (
                  <Toggle key={sp} label={sp} active={selExecs.includes(sp)} color={SALESPERSON_COLORS[sp]} onClick={() => setSelExecs((v) => toggle(v, sp))} />
                ))}
              </div>
            )}
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Service</p>
              {selServices.length > 1 && (
                <div className="flex items-center gap-1">
                  <button onClick={() => setMatchMode("AND")} className={cn(
                    "px-2 py-0.5 rounded-md text-[10px] font-semibold border transition-all",
                    matchMode === "AND" ? "bg-accent text-white border-accent" : "bg-white text-slate-500 border-slate-200 hover:border-slate-300"
                  )}>
                    AND
                  </button>
                  <button onClick={() => setMatchMode("OR")} className={cn(
                    "px-2 py-0.5 rounded-md text-[10px] font-semibold border transition-all",
                    matchMode === "OR" ? "bg-accent text-white border-accent" : "bg-white text-slate-500 border-slate-200 hover:border-slate-300"
                  )}>
                    OR
                  </button>
                </div>
              )}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {ALL_SERVICE_TOKENS.map((s, i) => (
                <Toggle key={s} label={s} active={selServices.includes(s)} color={PRODUCT_COLORS[i % PRODUCT_COLORS.length]} onClick={() => setSelServices((v) => toggle(v, s))} />
              ))}
            </div>
          </div>
          <div>
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-2">Account Manager</p>
            {isAM ? (
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium border bg-accent text-white border-accent">
                  {lockedAM}
                </span>
                <span className="text-[10px] text-slate-400 italic">locked to your account</span>
              </div>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {ALL_AMS.map((am) => (
                  <AccentToggle key={am} label={am} active={selAMs.includes(am)} onClick={() => setSelAMs((v) => toggle(v, am))} />
                ))}
              </div>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-6 pt-1 border-t border-slate-100">
            <div>
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-2">GST Status</p>
              <div className="flex gap-1.5">
                {(["all","Y","N"] as const).map((v) => (
                  <button key={v} onClick={() => setSelGST(v)} className={cn(
                    "px-3 py-1 rounded-lg text-xs font-medium border transition-all",
                    selGST === v ? "bg-accent-light text-accent border-accent-border" : "bg-white text-slate-500 border-slate-200 hover:border-slate-300"
                  )}>
                    {v === "all" ? "All" : v === "Y" ? "GST Registered" : "Not Registered"}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-2">Service Overlap</p>
              <button onClick={() => setMultiOnly((v) => !v)} className={cn(
                "flex items-center gap-2 px-3 py-1 rounded-lg text-xs font-medium border transition-all",
                multiOnly ? "bg-accent text-white border-accent shadow-sm" : "bg-white text-slate-500 border-slate-200 hover:border-slate-300"
              )}>
                <Layers className="w-3.5 h-3.5"/> Multi-service clients only
              </button>
            </div>
          </div>
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {[
          { label:"Clients",       value:isLoading?"…":totalClients,                  sub:"matched",                icon:Users,       color:"text-accent",       bg:"bg-accent-light"      },
          { label:"Contracts",     value:isLoading?"…":totalContracts,                sub:"services",               icon:Package,     color:"text-accent-cyan",   bg:"bg-accent-cyanLight"  },
          { label:"Pipeline",      value:isLoading?"…":formatCurrency(totalPipeline), sub:`${selectedMonthCols.length}m range`, icon:IndianRupee, color:"text-accent-green", bg:"bg-accent-greenLight" },
          { label:"Multi-Service", value:isLoading?"…":multiCount,                    sub:"clients w/ 2+ services", icon:Layers,      color:"text-accent-purple", bg:"bg-purple-50"         },
        ].map(({ label, value, sub, icon: Icon, color, bg }) => (
          <div key={label} className="bg-white border border-slate-200 rounded-xl p-4 shadow-card">
            <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center mb-3", bg)}>
              <Icon className={cn("w-4 h-4", color)} />
            </div>
            <p className="text-xl font-bold text-slate-800">{value}</p>
            <p className="text-[11px] text-slate-400 mt-0.5 uppercase tracking-wide">{label}</p>
            <p className="text-[10px] text-slate-300 mt-0.5">{sub}</p>
          </div>
        ))}
      </div>

      {/* Charts */}
      {!isLoading && (
        <>
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-5 mb-6">
            <div className="xl:col-span-2 bg-white border border-slate-200 rounded-2xl p-5 shadow-card">
              <div className="flex items-center gap-2 mb-4">
                <Award className="w-4 h-4 text-accent"/>
                <p className="text-sm font-semibold text-slate-700">Service Popularity</p>
                <span className="text-[11px] text-slate-400 ml-auto">by contract count</span>
              </div>
              {productFrequency.length === 0 ? (
                <div className="h-48 flex items-center justify-center text-slate-400 text-sm">No data for current filters</div>
              ) : (
                <div className="h-52">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={productFrequency} layout="vertical" barSize={14} margin={{ left:8, right:20, top:0, bottom:0 }}>
                      <XAxis type="number" tick={{ fontSize:10, fill:"#94A3B8" }} axisLine={false} tickLine={false}/>
                      <YAxis type="category" dataKey="name" tick={{ fontSize:10, fill:"#64748B" }} axisLine={false} tickLine={false} width={130}/>
                      <Tooltip content={({ active, payload }) => {
                        if (!active || !payload?.length) return null;
                        const d = payload[0].payload;
                        return (
                          <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-lg text-xs">
                            <p className="font-semibold text-slate-700 mb-1">{d.name}</p>
                            <p className="text-slate-500">{d.count} contract{d.count !== 1?"s":""}</p>
                            <p className="text-accent-green mt-0.5">{formatCurrency(d.pipeline)} pipeline</p>
                          </div>
                        );
                      }} cursor={{ fill:"rgba(79,70,229,0.04)" }}/>
                      <Bar dataKey="count" radius={[0,4,4,0]}>
                        {productFrequency.map((_, i) => <Cell key={i} fill={PRODUCT_COLORS[i % PRODUCT_COLORS.length]}/>)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-card">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="w-4 h-4 text-accent-cyan"/>
                <p className="text-sm font-semibold text-slate-700">Pipeline by AM</p>
                <span className="text-[10px] text-slate-400 ml-auto">{selectedMonthCols.length}m range</span>
              </div>
              {amPipeline.length === 0 ? (
                <div className="h-48 flex items-center justify-center text-slate-400 text-sm">No data</div>
              ) : (
                <>
                  <div className="h-36">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={amPipeline} cx="50%" cy="50%" innerRadius={38} outerRadius={58} paddingAngle={2} dataKey="value" strokeWidth={0}>
                          {amPipeline.map((_, i) => <Cell key={i} fill={PRODUCT_COLORS[i % PRODUCT_COLORS.length]}/>)}
                        </Pie>
                        <Tooltip content={({ active, payload }) => {
                          if (!active || !payload?.length) return null;
                          const d = payload[0].payload;
                          return (
                            <div className="bg-white border border-slate-200 rounded-xl p-2.5 shadow-lg text-xs">
                              <p className="font-semibold text-slate-700">{d.name}</p>
                              <p className="text-accent-green mt-0.5">{formatCurrency(d.value)}</p>
                            </div>
                          );
                        }}/>
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="space-y-1.5 mt-2">
                    {amPipeline.slice(0,5).map((am, i) => (
                      <div key={am.name} className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: PRODUCT_COLORS[i % PRODUCT_COLORS.length]}}/>
                        <span className="text-xs text-slate-600 flex-1 truncate">{am.name}</span>
                        <span className="text-xs font-semibold text-slate-500">{formatCurrency(am.value)}</span>
                      </div>
                    ))}
                    {amPipeline.length > 5 && <p className="text-[10px] text-slate-400 pl-4">+{amPipeline.length-5} more</p>}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Exec breakdown */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-card mb-6">
            <div className="flex items-center gap-2 mb-4">
              <GitBranch className="w-4 h-4 text-accent-purple"/>
              <p className="text-sm font-semibold text-slate-700">Exec Breakdown</p>
              <span className="text-[11px] text-slate-400 ml-auto">pipeline share · {selectedMonthCols.length}m range</span>
            </div>
            {execPipeline.length === 0 ? (
              <p className="text-slate-400 text-sm text-center py-6">No data for current filters</p>
            ) : (
              <div className="space-y-3">
                {execPipeline.map((e) => {
                  const pct   = totalPipeline > 0 ? Math.round((e.pipeline / totalPipeline) * 100) : 0;
                  const color = SALESPERSON_COLORS[e.name];
                  return (
                    <div key={e.name} className="flex items-center gap-3">
                      <div className="flex items-center gap-2 w-20 flex-shrink-0">
                        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: color}}/>
                        <span className="text-xs font-medium text-slate-600 truncate">{e.name}</span>
                      </div>
                      <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-500" style={{ width:`${pct}%`, backgroundColor:color}}/>
                      </div>
                      <span className="text-xs text-slate-500 w-12 text-right">{formatCurrency(e.pipeline)}</span>
                      <span className="text-[10px] text-slate-400 w-8 text-right">{pct}%</span>
                      <span className="text-[10px] text-slate-400 w-16 text-right">{e.clients} client{e.clients!==1?"s":""}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Multi-service overlap */}
          {multiServiceClients.length > 0 && (
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-card mb-6">
              <div className="flex items-center gap-2 mb-4">
                <Layers className="w-4 h-4 text-accent-amber"/>
                <p className="text-sm font-semibold text-slate-700">Service Overlap</p>
                <span className="text-[11px] bg-accent-amberLight text-accent-amber border border-amber-200 px-2 py-0.5 rounded-full ml-2">
                  {multiServiceClients.length} client{multiServiceClients.length!==1?"s":""} with 2+ services
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {multiServiceClients.map(([name, cs]) => {
                  const color = SALESPERSON_COLORS[cs[0].salesperson];
                  const total = cs.reduce((a, c) => a + c.dealValue, 0);
                  return (
                    <div key={name} className="border border-slate-200 rounded-xl p-3 hover:border-accent-border hover:bg-accent-light/10 transition-all">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-bold flex-shrink-0" style={{ backgroundColor:color+"20", color }}>
                          {name.charAt(0)}
                        </div>
                        <ClientLink clientName={name} salesperson={cs[0].salesperson}/>
                        <span className="ml-auto text-xs font-semibold text-slate-600">{formatCurrency(total)}</span>
                      </div>
                      <div className="space-y-1">
                        {cs.map((c, i) => (
                          <div key={i} className="flex items-center gap-1.5">
                            <span className="w-1 h-1 rounded-full bg-accent flex-shrink-0"/>
                            <span className="text-[10px] text-slate-500 truncate">{c.product}</span>
                            <span className="text-[10px] text-slate-400 ml-auto flex-shrink-0">{formatCurrency(c.dealValue)}</span>
                          </div>
                        ))}
                      </div>
                      <div className="mt-2 pt-2 border-t border-slate-100 flex items-center gap-2">
                        <span className="text-[10px] text-slate-400">{cs[0].salesperson}</span>
                        <span className="text-slate-300">·</span>
                        <span className="text-[10px] text-slate-400">{cs[0].accountManager}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Client results */}
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-card">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50/50">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-slate-500"/>
                <p className="text-sm font-semibold text-slate-700">{visibleClients.length} Client{visibleClients.length!==1?"s":""}</p>
                {activeFilterCount > 0 && <span className="text-[11px] text-accent bg-accent-light border border-accent-border px-2 py-0.5 rounded-full">filtered</span>}
              </div>
              <span className="text-xs text-slate-400">{totalContracts} contracts · {formatCurrency(totalPipeline)} pipeline</span>
            </div>
            {visibleClients.length === 0 ? (
              <div className="py-16 text-center">
                <Filter className="w-8 h-8 text-slate-300 mx-auto mb-3"/>
                <p className="text-slate-500 font-medium">No clients match these filters</p>
                <button onClick={clearAll} className="mt-2 text-xs text-accent hover:underline">Clear all filters</button>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {visibleClients.map(([name, cs]) => {
                  const color = SALESPERSON_COLORS[cs[0].salesperson];
                  const total = cs.reduce((a, c) => a + c.dealValue, 0);
                  const rangePipeline = cs.reduce((a, c) =>
                    a + (c.renewalSchedule ?? []).filter((r) => {
                      const col = `${["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][r.month-1]}-${r.year}`;
                      return selectedMonthCols.includes(col);
                    }).reduce((b, r) => b + r.amount, 0), 0);
                  const serviceCount = clientServiceCount(cs);
                  return (
                    <div key={name} className="flex items-center gap-4 px-5 py-3 hover:bg-slate-50/80 transition-colors">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold flex-shrink-0" style={{ backgroundColor:color+"15", color }}>
                        {name.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <ClientLink clientName={name} salesperson={cs[0].salesperson}/>
                          {serviceCount > 1 && (
                            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-accent-amberLight text-accent-amber border border-amber-200">
                              {serviceCount} services
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          <span className="text-[11px] text-slate-400">{cs[0].salesperson}</span>
                          <span className="text-slate-300">·</span>
                          <span className="text-[11px] text-slate-400">{cs[0].accountManager}</span>
                          <span className="text-slate-300">·</span>
                          <div className="flex gap-1 flex-wrap">
                            {cs.map((c, i) => (
                              <span key={i} className="text-[10px] text-slate-500 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded">{c.product}</span>
                            ))}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 flex-shrink-0">
                        <span className={cn("text-[10px] font-semibold px-1.5 py-0.5 rounded border",
                          cs[0].gstStatus === "Y" ? "text-accent-cyan bg-cyan-50 border-cyan-200" : "text-slate-400 bg-slate-50 border-slate-200")}>
                          {cs[0].gstStatus === "Y" ? "GST" : "No GST"}
                        </span>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-slate-700">{formatCurrency(rangePipeline)}</p>
                          {rangePipeline !== total && <p className="text-[10px] text-slate-400">Deal: {formatCurrency(total)}</p>}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}

      {isLoading && (
        <div className="py-20 text-center text-sm text-slate-400 animate-pulse">Loading insights...</div>
      )}
    </PageWrapper>
  );
}
