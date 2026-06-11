"use client";
import { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { Contract, ClientNote, OnboardingPayment } from "@/types";
import { CONTRACTS } from "./mock-data";
import { ClientDetailModal } from "@/components/clients/ClientDetailModal";
import { PaymentPromise } from "@/components/renewals/PaymentModal";

interface ClientContextValue {
  openClient: (clientName: string) => void;
  stopClient: (clientName: string) => void;
  reactivateClient: (clientName: string) => void;
  isClientStopped: (clientName: string) => boolean;
  stoppedClients: Set<string>;
  promises: PaymentPromise[];
  addPromise: (p: PaymentPromise) => void;
  notes: ClientNote[];
  addNote: (note: ClientNote) => void;
  getNotesForClient: (clientName: string) => ClientNote[];
  onboardingPayments: OnboardingPayment[];
  addOnboardingPayment: (p: OnboardingPayment) => void;
  getOnboardingPayment: (clientName: string) => OnboardingPayment | undefined;
  getEffectiveAmount: (contractId: string, year: number, month: number, baseAmount: number) => number;
  recordPayment: (data: any) => void;
}

const ClientContext = createContext<ClientContextValue | null>(null);

export function ClientProvider({ children }: { children: ReactNode }) {
  const [selectedContracts, setSelectedContracts] = useState<Contract[]>([]);
  const [open,              setOpen]              = useState(false);
  const [stoppedClients,    setStoppedClients]    = useState<Set<string>>(new Set());
  const [promises,          setPromises]          = useState<PaymentPromise[]>([]);
  const [notes,             setNotes]             = useState<ClientNote[]>([]);
  const [onboardingPayments, setOnboardingPayments] = useState<OnboardingPayment[]>([]);
  const [priceOverrides, setPriceOverrides] = useState<Record<string, { fromYear: number; fromMonth: number; newAmount: number }[]>>({});

  const openClient = useCallback((clientName: string) => {
    const contracts = CONTRACTS.filter((c) => c.clientName === clientName);
    if (contracts.length) { setSelectedContracts(contracts); setOpen(true); }
  }, []);

  const stopClient = useCallback((clientName: string) => {
    setStoppedClients((prev) => new Set(Array.from(prev).concat(clientName)));
  }, []);

  const reactivateClient = useCallback((clientName: string) => {
    setStoppedClients((prev) => { const next = new Set(prev); next.delete(clientName); return next; });
  }, []);

  const isClientStopped = useCallback(
    (clientName: string) => stoppedClients.has(clientName),
    [stoppedClients]
  );

  const addPromise = useCallback((p: PaymentPromise) => {
    setPromises((prev) => [...prev, p]);
  }, []);

  const addNote = useCallback((note: ClientNote) => {
    setNotes((prev) => [...prev, note]);
  }, []);

  const getNotesForClient = useCallback(
    (clientName: string) => notes.filter((n) => n.clientName === clientName),
    [notes]
  );

  const addOnboardingPayment = useCallback((p: OnboardingPayment) => {
    setOnboardingPayments((prev) => {
      const exists = prev.findIndex((x) => x.clientName === p.clientName);
      if (exists >= 0) {
        const next = [...prev];
        next[exists] = p;
        return next;
      }
      return [...prev, p];
    });
  }, []);

  const getOnboardingPayment = useCallback(
    (clientName: string) => onboardingPayments.find((p) => p.clientName === clientName),
    [onboardingPayments]
  );

  const getEffectiveAmount = useCallback(
    (contractId: string, year: number, month: number, baseAmount: number): number => {
      const overrides = priceOverrides[contractId] ?? [];
      const applicable = overrides
        .filter((o) => o.fromYear * 100 + o.fromMonth <= year * 100 + month)
        .sort((a, b) => (b.fromYear * 100 + b.fromMonth) - (a.fromYear * 100 + a.fromMonth));
      return applicable.length > 0 ? applicable[0].newAmount : baseAmount;
    },
    [priceOverrides]
  );

  // Exposed via context so ClientDetailModal can call it directly — avoids stale closure
  const recordPayment = useCallback((data: any) => {
    const contract = CONTRACTS.find((c) => c.id === data.contractId);

    // ── Multi-promise: loop over promises array ──
    if (data.promises && Array.isArray(data.promises) && data.promises.length > 0 && contract) {
      const renewalAmount = contract.renewalSchedule.find(
        (r) => r.year === data.year && r.month === data.month
      )?.amount ?? 0;
      const totalOutstanding = renewalAmount - data.amount;

      const newPromises: PaymentPromise[] = data.promises
        .filter((p: { date: string; amount: number; notes: string }) => p.date)
        .map((p: { date: string; amount: number; notes: string }, idx: number) => ({
          id:              `p${Date.now()}-${idx}`,
          contractId:      data.contractId,
          clientName:      contract.clientName,
          salesperson:     contract.salesperson,
          renewalYear:     data.year,
          renewalMonth:    data.month,
          paidAmount:      data.amount,
          remainingAmount: p.amount > 0 ? p.amount : totalOutstanding,
          promisedDate:    p.date,
          notes:           p.notes || undefined,
          createdAt:       new Date().toISOString(),
        }));

      if (newPromises.length > 0) {
        setPromises((prev) => [...prev, ...newPromises]);
      }
    }

    // ── Cascading price override ──
    if (data.overrideAmount && data.cascadeFromYear && data.cascadeFromMonth) {
      setPriceOverrides((prev) => {
        const existing = prev[data.contractId] ?? [];
        return {
          ...prev,
          [data.contractId]: [
            ...existing,
            { fromYear: data.cascadeFromYear, fromMonth: data.cascadeFromMonth, newAmount: data.overrideAmount },
          ],
        };
      });
    }
  }, []);

  const clientName = selectedContracts[0]?.clientName ?? "";

  return (
    <ClientContext.Provider value={{
      openClient, stopClient, reactivateClient,
      isClientStopped, stoppedClients, promises, addPromise,
      notes, addNote, getNotesForClient,
      onboardingPayments, addOnboardingPayment, getOnboardingPayment,
      getEffectiveAmount, recordPayment,
    }}>
      {children}
      <ClientDetailModal
        open={open}
        onClose={() => setOpen(false)}
        contracts={selectedContracts}
        isStopped={isClientStopped(clientName)}
        onStop={(name) => { stopClient(name); setOpen(false); }}
        onReactivate={reactivateClient}
      />
    </ClientContext.Provider>
  );
}

export function useClient() {
  const ctx = useContext(ClientContext);
  if (!ctx) throw new Error("useClient must be used within ClientProvider");
  return ctx;
}