"use client";
import { useState } from "react";
import { PageWrapper } from "@/components/layout/PageWrapper";
import { PaymentHistory } from "@/components/payments/PaymentHistory";
import { OutstandingLedger } from "@/components/payments/OutstandingLedger";
import { PaymentModal, PaymentPromise } from "@/components/renewals/PaymentModal";
import { cn } from "@/lib/utils";
import { Receipt, Clock } from "lucide-react";
import { useClient } from "@/lib/client-context";

type Tab = "ledger" | "outstanding";

interface PaymentTarget {
  contractId: string;
  year: number;
  month: number;
}

const TABS: { id: Tab; label: string; icon: React.ElementType; desc: string }[] = [
  {
    id:    "ledger",
    label: "Full Ledger",
    icon:  Receipt,
    desc:  "All renewals with collected / outstanding breakdown",
  },
  {
    id:    "outstanding",
    label: "Outstanding",
    icon:  Clock,
    desc:  "Unpaid & partial renewals grouped by executive",
  },
];

export default function PaymentsPage() {
  const [activeTab,     setActiveTab]     = useState<Tab>("ledger");
  const [paymentTarget, setPaymentTarget] = useState<PaymentTarget | null>(null);

  const { recordPayment } = useClient();

  function openPayment(contractId: string, year: number, month: number) {
    setPaymentTarget({ contractId, year, month });
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
      {/* Header */}
      <div className="mb-5 flex items-start justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-100">Payment Tracker</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Track collections, outstanding balances, and partial payments across all contracts.
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        {TABS.map(({ id, label, icon: Icon, desc }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={cn(
              "flex items-center gap-2.5 px-4 py-2.5 rounded-xl border text-sm font-medium transition-all duration-150",
              activeTab === id
                ? "bg-accent-blue/10 text-accent-blue border-accent-blue/20 shadow-sm"
                : "text-gray-500 border-surface-border hover:text-gray-300 hover:bg-surface-elevated"
            )}
          >
            <Icon className="w-4 h-4" />
            <span>{label}</span>
            <span className={cn(
              "hidden sm:block text-xs font-normal",
              activeTab === id ? "text-accent-blue/60" : "text-gray-700"
            )}>
              — {desc}
            </span>
          </button>
        ))}
      </div>

      {/* Content */}
      {activeTab === "ledger" && <PaymentHistory />}
      {activeTab === "outstanding" && (
        <OutstandingLedger onMarkPayment={openPayment} />
      )}

      {/* Payment modal */}
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