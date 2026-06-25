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
import { useClient } from "@/lib/client-context";
import { useAuth } from "@/lib/auth-context";

type ViewMode = "calendar" | "table";
interface PaymentTarget { contractId: string; year: number; month: number; }

const SEED_PROMISES: PaymentPromise[] = [
  { id:"p1", contractId:"c001", clientName:"Arohi Eye Clinic",        salesperson:"Aftab",   renewalYear:2026, renewalMonth:7, paidAmount:80000,  remainingAmount:79900,  promisedDate:"2026-07-05", notes:"Will pay rest by 5th",  createdAt:"2026-07-01" },
  { id:"p2", contractId:"c002", clientName:"Swiss Dental",            salesperson:"Aftab",   renewalYear:2026, renewalMonth:7, paidAmount:55000,  remainingAmount:55000,  promisedDate:"2026-07-12", notes:"Cheque on 12th",        createdAt:"2026-07-01" },
  { id:"p3", contractId:"c003", clientName:"Varun Attari (3 Salons)", salesperson:"Sarvesh", renewalYear:2026, renewalMonth:7, paidAmount:100000, remainingAmount:100000, promisedDate:"2026-07-08", notes:"NEFT transfer",         createdAt:"2026-07-01" },
  { id:"p4", contractId:"c004", clientName:"Glowniqs Clinic",         salesperson:"Sarvesh", renewalYear:2026, renewalMonth:7, paidAmount:106200, remainingAmount:106200, promisedDate:"2026-07-15", notes:"Second instalment",     createdAt:"2026-07-02" },
  { id:"p5", contractId:"c005", clientName:"Junoesque",               salesperson:"Firoz",   renewalYear:2026, renewalMonth:7, paidAmount:77000,  remainingAmount:77000,  promisedDate:"2026-07-10", notes:"Post-dated cheque",     createdAt:"2026-07-01" },
  { id:"p6", contractId:"c006", clientName:"Cherag Makeovers",        salesperson:"Prajay",  renewalYear:2026, renewalMonth:7, paidAmount:110050, remainingAmount:110050, promisedDate:"2026-07-03", notes:"Balance payment",       createdAt:"2026-07-01" },
  { id:"p7", contractId:"c007", clientName:"Asha Neuromodulation",    salesperson:"Idris",   renewalYear:2026, renewalMonth:7, paidAmount:177000, remainingAmount:177000, promisedDate:"2026-07-18", notes:"Second part",           createdAt:"2026-07-02" },
  { id:"p8", contractId:"c008", clientName:"Cosme Wellness",          salesperson:"Firoz",   renewalYear:2026, renewalMonth:7, paidAmount:70000,  remainingAmount:70000,  promisedDate:"2026-07-25", notes:"Balance",               createdAt:"2026-07-02" },
];

export default function RenewalsPage() {
  const [year,          setYear]          = useState(2026);
  const [month,         setMonth]         = useState(7);
  const [view,          setView]          = useState<ViewMode>("calendar");
  const [paymentTarget, setPaymentTarget] = useState<PaymentTarget | null>(null);

  const { promises: contextPromises, addPromise } = useClient();
  const { user, canPerform } = useAuth();

  // Filter by salesperson for employee logins
  const execFilter = canPerform("view_all") ? null : user?.salesperson ?? null;

  const allPromises = [...SEED_PROMISES, ...contextPromises].filter(
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
    if (data.promise) {
      addPromise({ ...data.promise, id: `p${Date.now()}`, createdAt: new Date().toISOString() });
    }
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
            // Pass salesperson to filter renewals on the calendar
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