"use client";
import { useState } from "react";
import { PageWrapper } from "@/components/layout/PageWrapper";
import { ClientList } from "@/components/clients/ClientList";
import { ClientDetailModal } from "@/components/clients/ClientDetailModal";
import { PaymentModal } from "@/components/renewals/PaymentModal";
import { Contract } from "@/types";
import { useClient } from "@/lib/client-context";

interface PaymentTarget {
  contractId: string;
  year: number;
  month: number;
}

export default function ClientsPage() {
  const { isClientStopped, stopClient, reactivateClient } = useClient();
  const [selectedClient,  setSelectedClient]  = useState<Contract[] | null>(null);
  const [paymentTarget,   setPaymentTarget]   = useState<PaymentTarget | null>(null);

  function openPayment(contractId: string, year: number, month: number) {
    setSelectedClient(null);
    setPaymentTarget({ contractId, year, month });
  }

  const clientName = selectedClient?.[0]?.clientName ?? "";

  return (
    <PageWrapper wide>
      <div className="mb-5">
        <h2 className="text-lg font-semibold text-slate-800">Clients</h2>
        <p className="text-xs text-slate-400 mt-0.5">
          All accounts across 6 executives — click any client to see full contract and renewal details.
        </p>
      </div>

      <ClientList
        onSelectClient={setSelectedClient}
        stoppedClients={isClientStopped}
      />

      {selectedClient && (
        <ClientDetailModal
          open={!!selectedClient}
          onClose={() => setSelectedClient(null)}
          contracts={selectedClient}
          onMarkPayment={openPayment}
          isStopped={isClientStopped(clientName)}
          onStop={(name) => { stopClient(name); setSelectedClient(null); }}
          onReactivate={reactivateClient}
        />
      )}

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