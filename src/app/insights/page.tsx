"use client";
import { useState, useMemo } from "react";
import { PageWrapper } from "@/components/layout/PageWrapper";
import { CONTRACTS } from "@/lib/mock-data";
import { formatCurrency, SALESPERSON_COLORS } from "@/lib/utils";
import { ClientLink } from "@/components/clients/ClientLink";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth-context";
import {
  Filter, X, Users, Package, IndianRupee, Layers,
  TrendingUp, Award, GitBranch, BarChart2, ChevronDown, ChevronUp,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  Cell, PieChart, Pie,
} from "recharts";

// ─── Constants ────────────────────────────────────────────────────────────────
const ALL_SALESPERSONS = ["Aftab","Sarvesh","Firoz","Idris","Prajay","Vinay"];
const ALL_PRODUCTS = [
  "DM Single","GMB Single","SMM Single",
  "DM + GMB","DM + SMM","GMB + SMM","GMB + SEO",
  "DM + GMB + SMM","GMB + SMM + SEO","DM + GMB + SMM + SEO",
];
const ALL_AMS = [
  "Khushi","Gunjan","Kshitiz","Gaurav","Hitesh","Jenil",
  "Hamza","Kritika","Rayyan","Danish","Danish S","Saanya","Latika","Chetan","Khasim",
];
const PRODUCT_COLORS = [
  "#4F46E5","#0891B2","#7C3AED","#059669","#D97706","#DC2626",
  "#8B5CF6","#0D9488","#F59E0B","#EF4444",
];

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
  const { canPerform } = useAuth();

  const [selExecs,    setSelExecs]    = useState<string[]>([]);
  const [selProducts, setSelProducts] = useState<string[]>([]);
  const [selAMs,      setSelAMs]      = useState<string[]>([]);
  const [selGST,      setSelGST]      = useState<"all"|"Y"|"N">("all");
  const [multiOnly,   setMultiOnly]   = useState(false);
  const [showFilters, setShowFilters] = useState(true);

  function toggle<T>(arr: T[], val: T): T[] {
    return arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val];
  }

  const filtered = useMemo(() =>
    CONTRACTS.filter((c) => {
      if (selExecs.length    && !selExecs.includes(c.salesperson))   return false;
      if (selProducts.length && !selProducts.includes(c.product))    return false;
      if (selAMs.length      && !selAMs.includes(c.accountManager))  return false;
      if (selGST !== "all"   && c.gstStatus !== selGST)             return false;
      return true;
    }), [selExecs, selProducts, selAMs, selGST]);

  const clientMap = useMemo(() => {
    const map: Record<string, typeof filtered> = {};
    filtered.forEach((c) => { if (!map[c.clientName]) map[c.clientName] = []; map[c.clientName].push(c); });
    return map;
  }, [filtered]);

  const visibleClients = useMemo(() =>
    Object.entries(clientMap).filter(([, cs]) => !multiOnly || cs.length > 1),
    [clientMap, multiOnly]);

  const productFrequency = useMemo(() => {
    const counts: Record<string, { count: number; pipeline: number }> = {};
    filtered.forEach((c) => {
      if (!counts[c.product]) counts[c.product] = { count: 0, pipeline: 0 };
      counts[c.product].count++;
      counts[c.product].pipeline += c.dealValue;
    });
    return Object.entries(counts).map(([name, d]) => ({ name, ...d })).sort((a, b) => b.count - a.count);
  }, [filtered]);

  const amPipeline = useMemo(() => {
    const map: Record<string, number> = {};
    filtered.forEach((c) => { map[c.accountManager] = (map[c.accountManager] ?? 0) + c.dealValue; });
    return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 8);
  }, [filtered]);

  const multiServiceClients = useMemo(() =>
    Object.entries(clientMap).filter(([, cs]) => cs.length > 1).sort((a, b) => b[1].length - a[1].length),
    [clientMap]);

  const execPipeline = useMemo(() => {
    const map: Record<string, { pipeline: number; clients: number }> = {};
    filtered.forEach((c) => {
      if (!map[c.salesperson]) map[c.salesperson] = { pipeline: 0, clients: 0 };
      map[c.salesperson].pipeline += c.dealValue;
    });
    Object.entries(clientMap).forEach(([, cs]) => {
      const exec = cs[0].salesperson;
      if (map[exec]) map[exec].clients++;
    });
    return Object.entries(map).map(([name, d]) => ({ name, ...d })).sort((a, b) => b.pipeline - a.pipeline);
  }, [filtered, clientMap]);

  const totalPipeline  = filtered.reduce((a, c) => a + c.dealValue, 0);
  const totalContracts = filtered.length;
  const totalClients   = Object.keys(clientMap).length;
  const multiCount     = multiServiceClients.length;
  const activeFilterCount = selExecs.length + selProducts.length + selAMs.length + (selGST !== "all" ? 1 : 0) + (multiOnly ? 1 : 0);

  function clearAll() { setSelExecs([]); setSelProducts([]); setSelAMs([]); setSelGST("all"); setMultiOnly(false); }

  // Auth guard — after all hooks
  if (!canPerform("view_all")) {
    return (
      <PageWrapper>
        <div className="flex flex-col items-center justify-center h-64 gap-3">
          <BarChart2 className="w-10 h-10 text-slate-300" />
          <p className="text-slate-500 font-medium">Access restricted</p>
          <p className="text-sm text-slate-400">Insights are only available to Super Admins and Accounts Team.</p>
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
          <p className="text-xs text-slate-400 mt-0.5">Slice the portfolio any way you need — by exec, service, AM, or overlap.</p>
        </div>
        <button onClick={() => setShowFilters((v) => !v)}
          className="flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-all shadow-card">
          <Filter className="w-4 h-4" />
          Filters
          {activeFilterCount > 0 && (
            <span className="w-5 h-5 rounded-full bg-accent text-white text-[10px] font-bold flex items-center justify-center">{activeFilterCount}</span>
          )}
          {showFilters ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Filter Panel */}
      {showFilters && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 mb-6 shadow-card space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Active Filters</p>
            {activeFilterCount > 0 && (
              <button onClick={clearAll} className="text-xs text-accent-red hover:underline flex items-center gap-1">
                <X className="w-3 h-3" /> Clear all
              </button>
            )}
          </div>
          <div>
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-2">Salesperson</p>
            <div className="flex flex-wrap gap-1.5">
              {ALL_SALESPERSONS.map((sp) => (
                <Toggle key={sp} label={sp} active={selExecs.includes(sp)} color={SALESPERSON_COLORS[sp]}
                  onClick={() => setSelExecs((v) => toggle(v, sp))} />
              ))}
            </div>
          </div>
          <div>
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-2">Service / Product</p>
            <div className="flex flex-wrap gap-1.5">
              {ALL_PRODUCTS.map((p, i) => (
                <Toggle key={p} label={p} active={selProducts.includes(p)} color={PRODUCT_COLORS[i % PRODUCT_COLORS.length]}
                  onClick={() => setSelProducts((v) => toggle(v, p))} />
              ))}
            </div>
          </div>
          <div>
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-2">Account Manager</p>
            <div className="flex flex-wrap gap-1.5">
              {ALL_AMS.map((am) => (
                <AccentToggle key={am} label={am} active={selAMs.includes(am)}
                  onClick={() => setSelAMs((v) => toggle(v, am))} />
              ))}
            </div>
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
                <Layers className="w-3.5 h-3.5" /> Multi-service clients only
              </button>
            </div>
          </div>
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        {[
          { label:"Clients",       value:totalClients,                  sub:"matched",                icon:Users,       color:"text-accent",       bg:"bg-accent-light"      },
          { label:"Contracts",     value:totalContracts,                sub:"services",               icon:Package,     color:"text-accent-cyan",   bg:"bg-accent-cyanLight"  },
          { label:"Pipeline",      value:formatCurrency(totalPipeline), sub:"deal value",             icon:IndianRupee, color:"text-accent-green",  bg:"bg-accent-greenLight" },
          { label:"Multi-Service", value:multiCount,                    sub:"clients w/ 2+ services", icon:Layers,      color:"text-accent-purple", bg:"bg-purple-50"         },
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
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5 mb-6">
        <div className="xl:col-span-2 bg-white border border-slate-200 rounded-2xl p-5 shadow-card">
          <div className="flex items-center gap-2 mb-4">
            <Award className="w-4 h-4 text-accent" />
            <p className="text-sm font-semibold text-slate-700">Service Popularity</p>
            <span className="text-[11px] text-slate-400 ml-auto">by contract count</span>
          </div>
          {productFrequency.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-slate-400 text-sm">No data for current filters</div>
          ) : (
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={productFrequency} layout="vertical" barSize={14} margin={{ left:8, right:20, top:0, bottom:0 }}>
                  <XAxis type="number" tick={{ fontSize:10, fill:"#94A3B8" }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize:10, fill:"#64748B" }} axisLine={false} tickLine={false} width={130} />
                  <Tooltip content={({ active, payload }) => {
                    if (!active || !payload?.length) return null;
                    const d = payload[0].payload;
                    return (
                      <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-lg text-xs">
                        <p className="font-semibold text-slate-700 mb-1">{d.name}</p>
                        <p className="text-slate-500">{d.count} contract{d.count !== 1 ? "s" : ""}</p>
                        <p className="text-accent-green mt-0.5">{formatCurrency(d.pipeline)} pipeline</p>
                      </div>
                    );
                  }} cursor={{ fill:"rgba(79,70,229,0.04)" }} />
                  <Bar dataKey="count" radius={[0,4,4,0]}>
                    {productFrequency.map((_, i) => <Cell key={i} fill={PRODUCT_COLORS[i % PRODUCT_COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-card">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-4 h-4 text-accent-cyan" />
            <p className="text-sm font-semibold text-slate-700">Pipeline by AM</p>
          </div>
          {amPipeline.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-slate-400 text-sm">No data</div>
          ) : (
            <>
              <div className="h-36">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={amPipeline} cx="50%" cy="50%" innerRadius={38} outerRadius={58} paddingAngle={2} dataKey="value" strokeWidth={0}>
                      {amPipeline.map((_, i) => <Cell key={i} fill={PRODUCT_COLORS[i % PRODUCT_COLORS.length]} />)}
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
                    }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-1.5 mt-2">
                {amPipeline.slice(0,5).map((am, i) => (
                  <div key={am.name} className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: PRODUCT_COLORS[i % PRODUCT_COLORS.length] }} />
                    <span className="text-xs text-slate-600 flex-1 truncate">{am.name}</span>
                    <span className="text-xs font-semibold text-slate-500">{formatCurrency(am.value)}</span>
                  </div>
                ))}
                {amPipeline.length > 5 && <p className="text-[10px] text-slate-400 pl-4">+{amPipeline.length - 5} more</p>}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Exec breakdown */}
      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-card mb-6">
        <div className="flex items-center gap-2 mb-4">
          <GitBranch className="w-4 h-4 text-accent-purple" />
          <p className="text-sm font-semibold text-slate-700">Exec Breakdown</p>
          <span className="text-[11px] text-slate-400 ml-auto">pipeline share within filter</span>
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
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                    <span className="text-xs font-medium text-slate-600 truncate">{e.name}</span>
                  </div>
                  <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-500" style={{ width:`${pct}%`, backgroundColor:color }} />
                  </div>
                  <span className="text-xs text-slate-500 w-12 text-right">{formatCurrency(e.pipeline)}</span>
                  <span className="text-[10px] text-slate-400 w-8 text-right">{pct}%</span>
                  <span className="text-[10px] text-slate-400 w-16 text-right">{e.clients} client{e.clients !== 1 ? "s" : ""}</span>
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
            <Layers className="w-4 h-4 text-accent-amber" />
            <p className="text-sm font-semibold text-slate-700">Service Overlap</p>
            <span className="text-[11px] bg-accent-amberLight text-accent-amber border border-amber-200 px-2 py-0.5 rounded-full ml-2">
              {multiServiceClients.length} client{multiServiceClients.length !== 1 ? "s" : ""} with 2+ services
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {multiServiceClients.map(([name, cs]) => {
              const color = SALESPERSON_COLORS[cs[0].salesperson];
              const total = cs.reduce((a, c) => a + c.dealValue, 0);
              return (
                <div key={name} className="border border-slate-200 rounded-xl p-3 hover:border-accent-border hover:bg-accent-light/10 transition-all">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-bold flex-shrink-0"
                      style={{ backgroundColor: color+"20", color }}>
                      {name.charAt(0)}
                    </div>
                    <ClientLink clientName={name} salesperson={cs[0].salesperson} />
                    <span className="ml-auto text-xs font-semibold text-slate-600">{formatCurrency(total)}</span>
                  </div>
                  <div className="space-y-1">
                    {cs.map((c, i) => (
                      <div key={i} className="flex items-center gap-1.5">
                        <span className="w-1 h-1 rounded-full bg-accent flex-shrink-0" />
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
            <Users className="w-4 h-4 text-slate-500" />
            <p className="text-sm font-semibold text-slate-700">{visibleClients.length} Client{visibleClients.length !== 1 ? "s" : ""}</p>
            {activeFilterCount > 0 && <span className="text-[11px] text-accent bg-accent-light border border-accent-border px-2 py-0.5 rounded-full">filtered</span>}
          </div>
          <span className="text-xs text-slate-400">{totalContracts} total contracts</span>
        </div>
        {visibleClients.length === 0 ? (
          <div className="py-16 text-center">
            <Filter className="w-8 h-8 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 font-medium">No clients match these filters</p>
            <button onClick={clearAll} className="mt-2 text-xs text-accent hover:underline">Clear all filters</button>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {visibleClients.map(([name, cs]) => {
              const color = SALESPERSON_COLORS[cs[0].salesperson];
              const total = cs.reduce((a, c) => a + c.dealValue, 0);
              return (
                <div key={name} className="flex items-center gap-4 px-5 py-3 hover:bg-slate-50/80 transition-colors">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold flex-shrink-0"
                    style={{ backgroundColor: color+"15", color }}>
                    {name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <ClientLink clientName={name} salesperson={cs[0].salesperson} />
                      {cs.length > 1 && (
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-accent-amberLight text-accent-amber border border-amber-200">
                          {cs.length} services
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
                          <span key={i} className="text-[10px] text-slate-500 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded">
                            {c.product}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 flex-shrink-0">
                    <span className={cn("text-[10px] font-semibold px-1.5 py-0.5 rounded border",
                      cs[0].gstStatus === "Y" ? "text-accent-cyan bg-cyan-50 border-cyan-200" : "text-slate-400 bg-slate-50 border-slate-200")}>
                      {cs[0].gstStatus === "Y" ? "GST" : "No GST"}
                    </span>
                    <span className="text-sm font-semibold text-slate-700">{formatCurrency(total)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </PageWrapper>
  );
}
