"use client";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { PageWrapper } from "@/components/layout/PageWrapper";
import { ExecSelector } from "@/components/salesperson/ExecSelector";
import { ExecStats } from "@/components/salesperson/ExecStats";
import { ExecChart } from "@/components/salesperson/ExecChart";
import { ExecContractTable } from "@/components/salesperson/ExecContractTable";
import { ExecCrossBreakdown } from "@/components/salesperson/ExecCrossBreakdown";
import { PaymentModal, PaymentPromise } from "@/components/renewals/PaymentModal";
import { SALESPERSON_COLORS } from "@/lib/utils";
import { useContracts } from "@/lib/api";
import { exportSalespersonExcel } from "@/lib/export";
import { useAuth } from "@/lib/auth-context";
import { useClient } from "@/lib/client-context";
import { Download, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

// Flat accent used for Account Manager views — AMs don't have individual
// per-name colors the way execs do via SALESPERSON_COLORS. Swap for your
// real --accent-purple CSS var/hex if it differs from this value.
const AM_COLOR = "#7C3AED";

interface PaymentTarget { contractId: string; year: number; month: number; }
type Dimension = "exec" | "am";

export default function SalespersonContent() {
  const searchParams = useSearchParams();
  const { user, canPerform } = useAuth();
  const { recordPayment } = useClient();
  const [exec,          setExec]          = useState("Aftab");
  const [dimension,     setDimension]     = useState<Dimension>("exec");
  const [paymentTarget, setPaymentTarget] = useState<PaymentTarget | null>(null);
  const [exporting,     setExporting]     = useState(false);

  useEffect(() => {
    const qExec = searchParams.get("exec");
    const qDim: Dimension = searchParams.get("dimension") === "am" ? "am" : "exec";

    // Admins/accounts team can view anything named in the URL.
    if (canPerform("view_all")) {
      setDimension(qDim);
      if (qExec) setExec(qExec);
      return;
    }

    // Everyone else is hard-locked to their own scope, regardless of what
    // the URL says — this is a UX/defense-in-depth guard; the backend
    // already scopes /contracts per role independently, so this can't
    // actually leak data, it just keeps the view sensible for the person
    // looking at it.
    if (user?.role === "account_manager" && user?.accountManager) {
      setDimension("am");
      setExec(user.accountManager);
    } else if (user?.salesperson) {
      setDimension("exec");
      setExec(user.salesperson);
    }
  }, [searchParams, user, canPerform]);

  const color = dimension === "am" ? AM_COLOR : (SALESPERSON_COLORS[exec] ?? "#3B82F6");

  function openPayment(contractId: string, year: number, month: number) {
    setPaymentTarget({ contractId, year, month });
  }

  const { data: allContracts = [] } = useContracts();

  async function handleExport() {
    setExporting(true);
    await new Promise((r) => setTimeout(r, 80));
    try {
      const contracts = allContracts.filter((c) =>
        dimension === "am" ? c.accountManager === exec : c.salesperson === exec
      );
      exportSalespersonExcel(exec, contracts, dimension);
    } finally {
      setExporting(false);
    }
  }

  function handlePaymentSave(data: {
    contractId: string; year: number; month: number;
    amount: number; status: string; notes: string; paidOn: string;
    promise?: Omit<PaymentPromise, "id" | "createdAt">;
  }) {
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

  return (
    <PageWrapper wide>
      <div className="mb-5 flex items-start justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-800">
            {dimension === "am" ? "Account Manager View" : "Salesperson View"} — <span style={{ color }}>{exec}</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">Per-executive portfolio, renewal schedule and contract breakdown.</p>
        </div>

        {/* Export — super_admin only */}
        {canPerform("export_excel") && (
          <button onClick={handleExport} disabled={exporting}
            className={cn("flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-medium transition-all shadow-card",
              exporting
                ? "bg-slate-50 text-slate-400 border-slate-200 cursor-not-allowed"
                : "bg-white text-slate-600 border-slate-200 hover:border-accent hover:text-accent hover:bg-accent-light/20")}>
            {exporting
              ? <><Loader2 className="w-4 h-4 animate-spin"/> Exporting...</>
              : <><Download className="w-4 h-4"/> Export Excel</>}
          </button>
        )}
      </div>

      {/* Only show the exec/AM selector if can view all */}
      {canPerform("view_all") && (
        <div className="mb-6">
          <ExecSelector selected={exec} onChange={setExec} dimension={dimension} />
        </div>
      )}

      <div className="flex flex-col gap-5">
        <ExecStats exec={exec} dimension={dimension} />
        <ExecCrossBreakdown exec={exec} dimension={dimension} />
        <ExecChart exec={exec} dimension={dimension} />
        <ExecContractTable exec={exec} dimension={dimension} onMarkPayment={openPayment} />
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