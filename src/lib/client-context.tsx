"use client";
import { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { Contract, ClientNote, OnboardingPayment, ContractEdit } from "@/types";
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
  // Contract editing
  contractEdits: Record<string, ContractEdit[]>;          // contractId → edits
  stoppedContracts: Set<string>;                          // contractIds stopped individually
  additionalContracts: Contract[];                        // new services added via modal
  editContract: (contractId: string, changes: Partial<Contract>, previous: Partial<Contract>) => void;
  stopContract: (contractId: string) => void;
  reactivateContract: (contractId: string) => void;
  isContractStopped: (contractId: string) => boolean;
  addContract: (contract: Contract) => void;
  getContractEdits: (contractId: string) => ContractEdit[];
  getEffectiveContract: (contract: Contract) => Contract;  // returns contract with edits applied
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
  // Contract editing state
  const [contractEdits,      setContractEdits]      = useState<Record<string, ContractEdit[]>>({});
  const [stoppedContracts,   setStoppedContracts]   = useState<Set<string>>(new Set());
  const [additionalContracts, setAdditionalContracts] = useState<Contract[]>([]);

  const openClient = useCallback((clientName: string) => {
    const base  = CONTRACTS.filter((c) => c.clientName === clientName);
    const extra = additionalContracts.filter((c) => c.clientName === clientName);
    const all   = [...base, ...extra];
    if (all.length) { setSelectedContracts(all); setOpen(true); }
  }, [additionalContracts]);

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
      if (exists >= 0) { const next = [...prev]; next[exists] = p; return next; }
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

  const recordPayment = useCallback((data: any) => {
    const contract = [...CONTRACTS, ...additionalContracts].find((c) => c.id === data.contractId);

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

      if (newPromises.length > 0) setPromises((prev) => [...prev, ...newPromises]);
    }

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
  }, [additionalContracts]);

  // ── Contract editing ──────────────────────────────────────────────────────
  const editContract = useCallback((contractId: string, changes: Partial<Contract>, previous: Partial<Contract>) => {
    const edit: ContractEdit = {
      id:             `edit-${Date.now()}`,
      contractId,
      editedAt:       new Date().toISOString(),
      editedBy:       "Management",
      changes:        changes as any,
      previousValues: previous as any,
    };
    setContractEdits((prev) => ({
      ...prev,
      [contractId]: [...(prev[contractId] ?? []), edit],
    }));
  }, []);

  const stopContract = useCallback((contractId: string) => {
    setStoppedContracts((prev) => new Set(Array.from(prev).concat(contractId)));
  }, []);

  const reactivateContract = useCallback((contractId: string) => {
    setStoppedContracts((prev) => { const next = new Set(prev); next.delete(contractId); return next; });
  }, []);

  const isContractStopped = useCallback(
    (contractId: string) => stoppedContracts.has(contractId),
    [stoppedContracts]
  );

  const addContract = useCallback((contract: Contract) => {
    setAdditionalContracts((prev) => [...prev, contract]);
    // Re-open the modal with the updated contract list
    setSelectedContracts((prev) => [...prev, contract]);
  }, []);

  const getContractEdits = useCallback(
    (contractId: string) => contractEdits[contractId] ?? [],
    [contractEdits]
  );

  // Returns a contract with all edits applied (latest edit wins per field)
  const getEffectiveContract = useCallback((contract: Contract): Contract => {
    const edits = contractEdits[contract.id] ?? [];
    if (!edits.length) return contract;
    const merged = edits.reduce((acc, edit) => ({ ...acc, ...edit.changes }), {} as Partial<Contract>);
    return { ...contract, ...merged };
  }, [contractEdits]);

  const clientName = selectedContracts[0]?.clientName ?? "";

  return (
    <ClientContext.Provider value={{
      openClient, stopClient, reactivateClient,
      isClientStopped, stoppedClients, promises, addPromise,
      notes, addNote, getNotesForClient,
      onboardingPayments, addOnboardingPayment, getOnboardingPayment,
      getEffectiveAmount, recordPayment,
      contractEdits, stoppedContracts, additionalContracts,
      editContract, stopContract, reactivateContract, isContractStopped,
      addContract, getContractEdits, getEffectiveContract,
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