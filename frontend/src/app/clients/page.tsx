"use client";
import { useState } from "react";
import { PageWrapper } from "@/components/layout/PageWrapper";
import { ClientList } from "@/components/clients/ClientList";
import { PaymentModal, PaymentPromise } from "@/components/renewals/PaymentModal";
import { Contract } from "@/types";
import { useClient } from "@/lib/client-context";
import { useAuth } from "@/lib/auth-context";

interface PaymentTarget { contractId: string; year: number; month: number; }

export default function ClientsPage() {
  const { isClientStopped, recordPayment, openClient } = useClient();
  const { user, canPerform } = useAuth();
  const salespersonFilter = canPerform("view_all") ? null : user?.salesperson ?? null;

  const [paymentTarget, setPaymentTarget] = useState<PaymentTarget | null>(null);

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
      <div className="mb-5">
        <h2 className="text-lg font-semibold text-slate-800">Clients</h2>
        <p className="text-xs text-slate-400 mt-0.5">
          {salespersonFilter
            ? `${salespersonFilter}'s accounts — click any client to see full contract and renewal details.`
            : "All accounts across 6 executives — click any client to see full contract and renewal details."}
        </p>
      </div>

      <ClientList
        onSelectClient={(contracts) => openClient(contracts[0]?.clientName ?? "")}
        stoppedClients={isClientStopped}
        salespersonFilter={salespersonFilter}
      />

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