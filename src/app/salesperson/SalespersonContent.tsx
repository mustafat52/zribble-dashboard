"use client";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { PageWrapper } from "@/components/layout/PageWrapper";
import { ExecSelector } from "@/components/salesperson/ExecSelector";
import { ExecStats } from "@/components/salesperson/ExecStats";
import { ExecChart } from "@/components/salesperson/ExecChart";
import { ExecContractTable } from "@/components/salesperson/ExecContractTable";
import { PaymentModal } from "@/components/renewals/PaymentModal";
import { SALESPERSON_COLORS } from "@/lib/utils";
import { getContractsForSalesperson } from "@/lib/mock-data";
import { exportSalespersonExcel } from "@/lib/export";
import { useAuth } from "@/lib/auth-context";
import { Download, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface PaymentTarget { contractId: string; year: number; month: number; }

export default function SalespersonContent() {
  const searchParams = useSearchParams();
  const { user, canPerform } = useAuth();
  const [exec,          setExec]          = useState("Aftab");
  const [paymentTarget, setPaymentTarget] = useState<PaymentTarget | null>(null);
  const [exporting,     setExporting]     = useState(false);

  useEffect(() => {
    const qExec = searchParams.get("exec");
    // Employees can only see their own exec
    if (qExec && (canPerform("view_all") || user?.salesperson === qExec)) {
      setExec(qExec);
    } else if (!canPerform("view_all") && user?.salesperson) {
      setExec(user.salesperson);
    }
  }, [searchParams, user, canPerform]);

  const color = SALESPERSON_COLORS[exec];

  function openPayment(contractId: string, year: number, month: number) {
    setPaymentTarget({ contractId, year, month });
  }

  async function handleExport() {
    setExporting(true);
    await new Promise((r) => setTimeout(r, 80));
    try {
      exportSalespersonExcel(exec, getContractsForSalesperson(exec));
    } finally {
      setExporting(false);
    }
  }

  return (
    <PageWrapper wide>
      <div className="mb-5 flex items-start justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-800">
            Salesperson View — <span style={{ color }}>{exec}</span>
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

      {/* Only show exec selector if can view all */}
      {canPerform("view_all") && (
        <div className="mb-6">
          <ExecSelector selected={exec} onChange={setExec} />
        </div>
      )}

      <div className="flex flex-col gap-5">
        <ExecStats exec={exec} />
        <ExecChart exec={exec} />
        <ExecContractTable exec={exec} onMarkPayment={openPayment} />
      </div>

      {paymentTarget && (
        <PaymentModal
          open={!!paymentTarget}
          onClose={() => setPaymentTarget(null)}
          contractId={paymentTarget.contractId}
          renewalYear={paymentTarget.year}
          renewalMonth={paymentTarget.month}
          onSave={(data) => console.log("Payment saved:", data)}
        />
      )}
    </PageWrapper>
  );
}