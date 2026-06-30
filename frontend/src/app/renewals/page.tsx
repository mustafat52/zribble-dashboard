"use client";
import { useState } from "react";
import { PageWrapper } from "@/components/layout/PageWrapper";
import { MonthPicker } from "@/components/renewals/MonthPicker";
import { RenewalCalendar } from "@/components/renewals/RenewalCalendar";
import { RenewalTable } from "@/components/renewals/RenewalTable";
import { PaymentModal, PaymentPromise } from "@/components/renewals/PaymentModal";
import { formatCurrency, getMonthShort } from "@/lib/utils";
import { CalendarDays, List } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePromises } from "@/lib/api";
import { useClient } from "@/lib/client-context";
import { useAuth } from "@/lib/auth-context";

type ViewMode = "calendar" | "table";
interface PaymentTarget { contractId: string; year: number; month: number; }

export default function RenewalsPage() {
  const [year,          setYear]          = useState(2026);
  const [month,         setMonth]         = useState(7);
  const [view,          setView]          = useState<ViewMode>("calendar");
  const [paymentTarget, setPaymentTarget] = useState<PaymentTarget | null>(null);

  const { recordPayment } = useClient();
  const { data: contextPromises = [] } = usePromises();
  const { user, canPerform } = useAuth();

  // Filter by salesperson for employee logins
  const execFilter = canPerform("view_all") ? null : user?.salesperson ?? null;

  const allPromises = contextPromises.filter(
    (p) => !execFilter || p.salesperson === execFilter
  );

  function openPayment(contractId: string, y: number, m: number) {
    setPaymentTarget({ contractId, year: y, month: m });
  }

  function handlePaymentSave(data: {
    contractId: string; year: number; month: number;
    amount: number; status: string; notes: string; paidOn: string;
    promise?: Omit<PaymentPromise, "id" | "createdAt">;
  }) {
    // recordPayment handles both the payment POST and any promise creation.
    // Bridge singular `promise` → plural `promises` array that recordPayment expects.
    recordPayment({
      contractId: data.contractId,
      year:       data.year,
      month:      data.month,
      amount:     data.amount,
      notes:      data.notes,
      paidOn:     data.paidOn,
      promises:   data.promise ? [{ date: data.promise.promisedDate, amount: data.promise.remainingAmount, notes: data.promise.notes }] : [],
    });
    setPaymentTarget(null);
  }

  const monthPromises = allPromises.filter((p) => {
    const d = new Date(p.promisedDate);
    return d.getFullYear() === year && d.getMonth() + 1 === month;
  });

  return (
    <PageWrapper wide>
      <div className="mb-5 flex items-start justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-800">
            Renewals — <span className="text-accent">{getMonthShort(month)} {year}</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            {execFilter
              ? `${execFilter}'s renewals and payment promises.`
              : "Visual calendar of all renewals and payment promises. Click any day for details."}
          </p>
        </div>
        <div className="flex items-center border border-slate-200 rounded-xl overflow-hidden shadow-card">
          <button onClick={() => setView("calendar")} className={cn(
            "flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors",
            view==="calendar"?"bg-accent text-white":"text-slate-500 hover:text-slate-700 hover:bg-slate-50"
          )}>
            <CalendarDays className="w-4 h-4"/> Calendar
          </button>
          <button onClick={() => setView("table")} className={cn(
            "flex items-center gap-2 px-4 py-2 text-sm font-medium transition-colors border-l border-slate-200",
            view==="table"?"bg-accent text-white":"text-slate-500 hover:text-slate-700 hover:bg-slate-50"
          )}>
            <List className="w-4 h-4"/> Table
          </button>
        </div>
      </div>

      <div className="flex gap-5 items-start">
        <div className="w-52 flex-shrink-0">
          <MonthPicker year={year} month={month} onChange={(y, m) => { setYear(y); setMonth(m); }} />
          {monthPromises.length > 0 && (
            <div className="mt-3 px-3 py-2.5 bg-amber-50 border border-amber-200 rounded-xl">
              <p className="text-[10px] font-semibold text-amber-700 uppercase tracking-wide mb-1">Payment Promises</p>
              <p className="text-sm font-bold text-accent-amber">{monthPromises.length} promises</p>
              <p className="text-xs text-amber-600 mt-0.5">Total: {formatCurrency(monthPromises.reduce((a, p) => a + p.remainingAmount, 0))}</p>
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          {view === "calendar" ? (
            <RenewalCalendar year={year} month={month} promises={allPromises} salesperson={execFilter ?? undefined} />
          ) : (
            <RenewalTable year={year} month={month} onMarkPayment={openPayment} salesperson={execFilter ?? undefined} />
          )}
        </div>
      </div>

      {paymentTarget && (
        <PaymentModal
          open={!!paymentTarget}
          onClose={() => setPaymentTarget(null)}
          contractId={paymentTarget.contractId}
          renewalYear={paymentTarget.year}
          renewalMonth={paymentTarget.month}
          onSave={handlePaymentSave}
        />
      )}
    </PageWrapper>
  );
}