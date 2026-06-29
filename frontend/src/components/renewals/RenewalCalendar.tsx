"use client";
import { useMemo, useState } from "react";
import { useContracts } from "@/lib/api";
import { formatCurrency, SALESPERSON_COLORS, getMonthShort } from "@/lib/utils";
import { StatusBadge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";
import { X, CalendarDays, Clock } from "lucide-react";
import { ClientLink } from "@/components/clients/ClientLink";
import { PaymentPromise } from "./PaymentModal";

interface DayData {
  day: number;
  renewals: { clientName: string; salesperson: string; amount: number; status: string; product: string; contractId: string }[];
  promises: PaymentPromise[];
}

function DayDetail({ day, year, month, data, onClose }: { day: number; year: number; month: number; data: DayData; onClose: () => void }) {
  const totalRenewals = data.renewals.reduce((a, r) => a + r.amount, 0);
  const totalPromises = data.promises.reduce((a, p) => a + p.remainingAmount, 0);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white border border-slate-200 rounded-2xl shadow-xl w-full max-w-lg max-h-[80vh] overflow-hidden animate-slide-up">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-bold text-slate-800">{day} {getMonthShort(month)} {year}</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              {data.renewals.length} renewal{data.renewals.length !== 1 ? "s" : ""}
              {data.promises.length > 0 ? ` · ${data.promises.length} payment promise${data.promises.length !== 1 ? "s" : ""}` : ""}
            </p>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="overflow-y-auto max-h-[calc(80vh-80px)] p-5 space-y-5">
          {data.renewals.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <CalendarDays className="w-3.5 h-3.5 text-accent" />
                <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Renewals Due</p>
                <span className="ml-auto text-xs font-semibold text-slate-700">{formatCurrency(totalRenewals)}</span>
              </div>
              <div className="space-y-2">
                {data.renewals.map((r, i) => (
                  <div key={i} className="flex items-center gap-3 px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl">
                    <span className="w-1.5 h-8 rounded-full flex-shrink-0" style={{ backgroundColor: SALESPERSON_COLORS[r.salesperson] }} />
                    <div className="flex-1 min-w-0">
                      <ClientLink clientName={r.clientName} salesperson={r.salesperson} />
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[11px] text-slate-400">{r.salesperson}</span>
                        <span className="text-slate-300">·</span>
                        <span className="text-[11px] text-slate-400">{r.product}</span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className="text-sm font-bold text-slate-700">{formatCurrency(r.amount)}</span>
                      <StatusBadge status={r.status as any} size="sm" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {data.promises.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Clock className="w-3.5 h-3.5 text-accent-amber" />
                <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Payment Promises</p>
                <span className="ml-auto text-xs font-semibold text-accent-amber">{formatCurrency(totalPromises)} promised</span>
              </div>
              <div className="space-y-2">
                {data.promises.map((p, i) => (
                  <div key={i} className="flex items-center gap-3 px-3 py-2.5 bg-accent-amberLight border border-amber-200 rounded-xl">
                    <span className="w-1.5 h-10 rounded-full flex-shrink-0 bg-accent-amber" />
                    <div className="flex-1 min-w-0">
                      <ClientLink clientName={p.clientName} salesperson={p.salesperson} className="text-amber-800" />
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[11px] text-amber-600">{p.salesperson}</span>
                        {p.notes && (<><span className="text-amber-300">·</span><span className="text-[11px] text-amber-600 italic truncate">{p.notes}</span></>)}
                      </div>
                      <p className="text-[11px] text-amber-500 mt-0.5">Already paid: {formatCurrency(p.paidAmount)} · Remaining: {formatCurrency(p.remainingAmount)}</p>
                    </div>
                    <span className="text-sm font-bold text-accent-amber flex-shrink-0">{formatCurrency(p.remainingAmount)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface RenewalCalendarProps {
  year: number;
  month: number;
  promises: PaymentPromise[];
  salesperson?: string;
}

export function RenewalCalendar({ year, month, promises, salesperson }: RenewalCalendarProps) {
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const { data: allContracts = [] } = useContracts();

  const contracts = salesperson
    ? allContracts.filter((c) => c.salesperson === salesperson)
    : allContracts;

  // Group renewals by day using firstRenewalDate
  const renewalsByDay = useMemo(() => {
    const map: Record<number, DayData["renewals"]> = {};
    contracts.forEach((c) => {
      (c.renewalSchedule ?? [])
        .filter((r) => r.year === year && r.month === month)
        .forEach((r) => {
          const date = new Date(c.firstRenewalDate);
          let day = date.getDate();
          // If the firstRenewalDate is not in this month, distribute by contract id
          if (date.getFullYear() !== year || date.getMonth() + 1 !== month) {
            day = (parseInt(c.id.replace(/\D/g, "").slice(-4) || "1") % 28) + 1;
          }
          if (!map[day]) map[day] = [];
          map[day].push({
            clientName:  c.clientName,
            salesperson: c.salesperson,
            amount:      r.amount,
            status:      r.status,
            product:     c.product,
            contractId:  c.id,
          });
        });
    });
    return map;
  }, [contracts, year, month]);

  // Group promises by day
  const promisesByDay = useMemo(() => {
    const map: Record<number, PaymentPromise[]> = {};
    promises.forEach((p) => {
      const d = new Date(p.promisedDate);
      if (d.getFullYear() === year && d.getMonth() + 1 === month) {
        const day = d.getDate();
        if (!map[day]) map[day] = [];
        map[day].push(p);
      }
    });
    return map;
  }, [promises, year, month]);

  const firstDay  = new Date(year, month - 1, 1).getDay();
  const daysCount = new Date(year, month, 0).getDate();
  const today     = new Date();

  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysCount }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const selectedData: DayData | null = selectedDay
    ? { day: selectedDay, renewals: renewalsByDay[selectedDay] ?? [], promises: promisesByDay[selectedDay] ?? [] }
    : null;

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-card overflow-hidden">
      <div className="grid grid-cols-7 border-b border-slate-100 bg-slate-50">
        {DAY_LABELS.map((d) => (
          <div key={d} className="py-2.5 text-center text-[11px] font-semibold text-slate-400 uppercase tracking-wide">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 divide-x divide-slate-100">
        {cells.map((day, idx) => {
          if (!day) return <div key={`empty-${idx}`} className="min-h-[130px] bg-slate-50/40 border-b border-slate-100" />;
          const dayRenewals  = renewalsByDay[day]  ?? [];
          const dayPromises  = promisesByDay[day]  ?? [];
          const hasContent   = dayRenewals.length > 0 || dayPromises.length > 0;
          const isToday      = today.getDate() === day && today.getMonth() + 1 === month && today.getFullYear() === year;
          const totalAmount  = dayRenewals.reduce((a, r) => a + r.amount, 0);
          const totalPromise = dayPromises.reduce((a, p) => a + p.remainingAmount, 0);
          return (
            <div key={day} onClick={() => hasContent && setSelectedDay(day)}
              className={cn("min-h-[130px] border-b border-slate-100 p-2 flex flex-col gap-1 transition-colors",
                hasContent && "cursor-pointer hover:bg-slate-50",
                isToday && "bg-accent-light/20 ring-1 ring-inset ring-accent/20")}>
              <div className="flex items-center justify-between mb-0.5">
                <span className={cn("w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold",
                  isToday ? "bg-accent text-white shadow-sm" : "text-slate-500")}>
                  {day}
                </span>
                {totalAmount > 0 && (
                  <span className="text-[9px] font-bold text-accent bg-accent-light border border-accent-border px-1 py-0.5 rounded">
                    {formatCurrency(totalAmount)}
                  </span>
                )}
              </div>
              {dayRenewals.slice(0, 3).map((r, i) => (
                <div key={i} className={cn("flex items-center gap-1 px-1.5 py-0.5 rounded border overflow-hidden",
                  r.status === "collected" ? "bg-accent-greenLight border-emerald-200" :
                  r.status === "overdue"   ? "bg-accent-redLight border-red-200" :
                  r.status === "partial"   ? "bg-accent-amberLight border-amber-200" :
                  "bg-slate-100 border-slate-200")}>
                  <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: SALESPERSON_COLORS[r.salesperson] }} />
                  <span className="text-[10px] text-slate-600 truncate flex-1 leading-tight">{r.clientName}</span>
                  <span className={cn("text-[9px] font-semibold flex-shrink-0",
                    r.status === "collected" ? "text-accent-green" :
                    r.status === "overdue"   ? "text-accent-red" :
                    r.status === "partial"   ? "text-accent-amber" : "text-slate-500")}>
                    {formatCurrency(r.amount)}
                  </span>
                </div>
              ))}
              {dayRenewals.length > 3 && <span className="text-[10px] text-slate-400 pl-1">+{dayRenewals.length - 3} more</span>}
              {dayPromises.slice(0, 2).map((p, i) => (
                <div key={i} className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-50 border border-amber-300 overflow-hidden">
                  <Clock className="w-2 h-2 text-accent-amber flex-shrink-0" />
                  <span className="text-[10px] text-amber-700 truncate flex-1 leading-tight">{p.clientName}</span>
                  <span className="text-[9px] font-bold text-accent-amber flex-shrink-0">{formatCurrency(p.remainingAmount)}</span>
                </div>
              ))}
              {dayPromises.length > 2 && <span className="text-[10px] text-accent-amber pl-1">+{dayPromises.length - 2} more</span>}
              {totalPromise > 0 && (
                <div className="mt-auto">
                  <div className="flex items-center gap-0.5">
                    <Clock className="w-2 h-2 text-accent-amber" />
                    <span className="text-[9px] font-semibold text-accent-amber">{formatCurrency(totalPromise)}</span>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div className="px-4 py-3 border-t border-slate-100 bg-slate-50 flex flex-wrap items-center gap-4">
        {[
          { color: "bg-slate-100 border-slate-200",           label: "Pending renewal"   },
          { color: "bg-accent-greenLight border-emerald-200", label: "Collected"         },
          { color: "bg-accent-amberLight border-amber-200",   label: "Partial"           },
          { color: "bg-accent-redLight border-red-200",       label: "Overdue"           },
          { color: "bg-amber-50 border-amber-300",            label: "Payment promise"   },
        ].map(({ color, label }) => (
          <div key={label} className="flex items-center gap-1.5">
            <span className={cn("w-3 h-3 rounded border", color)} />
            <span className="text-[11px] text-slate-500">{label}</span>
          </div>
        ))}
        <span className="ml-auto text-[11px] text-slate-400">Click any day for details</span>
      </div>
      {selectedDay && selectedData && (
        <DayDetail day={selectedDay} year={year} month={month} data={selectedData} onClose={() => setSelectedDay(null)} />
      )}
    </div>
  );
}