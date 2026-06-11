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

interface PaymentTarget {
  contractId: string;
  year: number;
  month: number;
}

export default function SalespersonContent() {
  const searchParams = useSearchParams();
  const [exec,          setExec]          = useState("Aftab");
  const [paymentTarget, setPaymentTarget] = useState<PaymentTarget | null>(null);

  useEffect(() => {
    const qExec = searchParams.get("exec");
    if (qExec) setExec(qExec);
  }, [searchParams]);

  const color = SALESPERSON_COLORS[exec];

  function openPayment(contractId: string, year: number, month: number) {
    setPaymentTarget({ contractId, year, month });
  }

  return (
    <PageWrapper wide>
      <div className="mb-5 flex items-start justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-800">
            Salesperson View —{" "}
            <span style={{ color }}>{exec}</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Per-executive portfolio, renewal schedule and contract breakdown.
          </p>
        </div>
      </div>

      <div className="mb-6">
        <ExecSelector selected={exec} onChange={setExec} />
      </div>

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