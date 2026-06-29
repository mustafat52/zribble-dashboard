"use client";
import { createContext, useContext, useState, useCallback, ReactNode } from "react";
import { Contract, ClientNote, OnboardingPayment, ContractEdit } from "@/types";
import { useQueryClient } from "@tanstack/react-query";
import { ClientDetailModal } from "@/components/clients/ClientDetailModal";
import { PaymentPromise } from "@/components/renewals/PaymentModal";
import {
  useRecordPayment,
  useCreatePromise,
  useCreateNote,
  useUpsertOnboarding,
  useCreatePriceOverride,
  usePatchContract,
  usePatchContractStatus,
  useCreateContract,
} from "@/lib/api";

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
  contractEdits: Record<string, ContractEdit[]>;
  stoppedContracts: Set<string>;
  additionalContracts: Contract[];
  editContract: (contractId: string, changes: Partial<Contract>, previous: Partial<Contract>) => void;
  stopContract: (contractId: string) => void;
  reactivateContract: (contractId: string) => void;
  isContractStopped: (contractId: string) => boolean;
  addContract: (contract: Contract) => void;
  getContractEdits: (contractId: string) => ContractEdit[];
  getEffectiveContract: (contract: Contract) => Contract;
}

const ClientContext = createContext<ClientContextValue | null>(null);

export function ClientProvider({ children }: { children: ReactNode }) {
  const qc = useQueryClient();

  // ── Modal state ─────────────────────────────────────────────────────────────
  const [selectedContracts, setSelectedContracts] = useState<Contract[]>([]);
  const [open,              setOpen]              = useState(false);

  // ── Local optimistic sets — used only for instant feedback before the query
  //    cache refetches after a mutation. The source of truth is contractStatus
  //    on the cached Contract objects (read in isClientStopped/isContractStopped).
  const [stoppedClients,   setStoppedClients]   = useState<Set<string>>(new Set());
  const [stoppedContracts, setStoppedContracts] = useState<Set<string>>(new Set());

  // In-memory fallback for promises/notes/onboarding (used until full swap)
  const [promises,          setPromises]          = useState<PaymentPromise[]>([]);
  const [notes,             setNotes]             = useState<ClientNote[]>([]);
  const [onboardingPayments, setOnboardingPayments] = useState<OnboardingPayment[]>([]);

  // Price overrides (local until price-overrides endpoint is called)
  const [priceOverrides, setPriceOverrides] = useState<Record<string, { fromYear: number; fromMonth: number; newAmount: number }[]>>({});

  // Contract edits (local optimistic)
  const [contractEdits,      setContractEdits]      = useState<Record<string, ContractEdit[]>>({});
  const [additionalContracts, setAdditionalContracts] = useState<Contract[]>([]);

  // ── API mutations ────────────────────────────────────────────────────────────
  const recordPaymentMutation    = useRecordPayment();
  const createPromiseMutation    = useCreatePromise();
  const createNoteMutation       = useCreateNote();
  const upsertOnboardingMutation = useUpsertOnboarding();
  const createOverrideMutation   = useCreatePriceOverride();
  const patchContractMutation    = usePatchContract();
  const patchStatusMutation      = usePatchContractStatus();
  const createContractMutation   = useCreateContract();

  // ── openClient ───────────────────────────────────────────────────────────────
  const openClient = useCallback((clientName: string) => {
    // Fetch latest contracts from cache
    const cached = qc.getQueryData<Contract[]>(["contracts"]) ?? [];
    const base   = cached.filter((c) => c.clientName === clientName);
    const extra  = additionalContracts.filter((c) => c.clientName === clientName);
    const all    = [...base, ...extra];
    if (all.length) { setSelectedContracts(all); setOpen(true); }
  }, [additionalContracts, qc]);

  // ── Stop / reactivate CLIENT (all contracts for that client name) ─────────────
  const stopClient = useCallback((clientName: string) => {
    setStoppedClients((prev) => new Set(Array.from(prev).concat(clientName)));
    // Hit backend for each contract
    const cached = qc.getQueryData<Contract[]>(["contracts"]) ?? [];
    cached.filter((c) => c.clientName === clientName).forEach((c) => {
      patchStatusMutation.mutate({ id: c.id, contractStatus: "stopped" });
    });
  }, [qc, patchStatusMutation]);

  const reactivateClient = useCallback((clientName: string) => {
    setStoppedClients((prev) => { const next = new Set(prev); next.delete(clientName); return next; });
    const cached = qc.getQueryData<Contract[]>(["contracts"]) ?? [];
    cached.filter((c) => c.clientName === clientName).forEach((c) => {
      patchStatusMutation.mutate({ id: c.id, contractStatus: "active" });
    });
  }, [qc, patchStatusMutation]);

  // isClientStopped: check the live query cache first (survives refresh),
  // fall back to the local optimistic Set (covers the instant after a click
  // before the mutation's onSuccess invalidation refetches).
  const isClientStopped = useCallback(
    (clientName: string) => {
      const cached = qc.getQueryData<Contract[]>(["contracts"]) ?? [];
      const clientContracts = cached.filter((c) => c.clientName === clientName);
      if (clientContracts.length > 0) {
        // Stopped if ALL of the client's contracts are stopped in the DB
        return clientContracts.every((c) => c.contractStatus === "stopped");
      }
      // Fallback: optimistic local set (e.g. new contract not yet in cache)
      return stoppedClients.has(clientName);
    },
    [qc, stoppedClients]
  );

  // ── Stop / reactivate individual CONTRACT ─────────────────────────────────────
  const stopContract = useCallback((contractId: string) => {
    setStoppedContracts((prev) => new Set(Array.from(prev).concat(contractId)));
    patchStatusMutation.mutate({ id: contractId, contractStatus: "stopped" });
  }, [patchStatusMutation]);

  const reactivateContract = useCallback((contractId: string) => {
    setStoppedContracts((prev) => { const next = new Set(prev); next.delete(contractId); return next; });
    patchStatusMutation.mutate({ id: contractId, contractStatus: "active" });
  }, [patchStatusMutation]);

  // isContractStopped: same pattern — cache first, local Set as fallback.
  const isContractStopped = useCallback(
    (contractId: string) => {
      const cached = qc.getQueryData<Contract[]>(["contracts"]) ?? [];
      const contract = cached.find((c) => c.id === contractId);
      if (contract) {
        return contract.contractStatus === "stopped";
      }
      // Fallback: optimistic local set
      return stoppedContracts.has(contractId);
    },
    [qc, stoppedContracts]
  );

  // ── Promises ──────────────────────────────────────────────────────────────────
  const addPromise = useCallback((p: PaymentPromise) => {
    // Optimistic local update
    setPromises((prev) => [...prev, p]);
    // Hit backend
    createPromiseMutation.mutate({
      contractId:     p.contractId,
      clientName:     p.clientName,
      salesperson:    p.salesperson,
      renewalYear:    p.renewalYear,
      renewalMonth:   p.renewalMonth,
      paidAmount:     p.paidAmount,
      remainingAmount: p.remainingAmount,
      promisedDate:   p.promisedDate,
      notes:          p.notes,
    });
  }, [createPromiseMutation]);

  // ── Notes ─────────────────────────────────────────────────────────────────────
  const addNote = useCallback((note: ClientNote) => {
    setNotes((prev) => [...prev, note]);
    createNoteMutation.mutate({ clientName: note.clientName, text: note.text });
  }, [createNoteMutation]);

  const getNotesForClient = useCallback(
    (clientName: string) => notes.filter((n) => n.clientName === clientName),
    [notes]
  );

  // ── Onboarding ────────────────────────────────────────────────────────────────
  const addOnboardingPayment = useCallback((p: OnboardingPayment) => {
    setOnboardingPayments((prev) => {
      const exists = prev.findIndex((x) => x.clientName === p.clientName);
      if (exists >= 0) { const next = [...prev]; next[exists] = p; return next; }
      return [...prev, p];
    });
    upsertOnboardingMutation.mutate(p);
  }, [upsertOnboardingMutation]);

  const getOnboardingPayment = useCallback(
    (clientName: string) => onboardingPayments.find((p) => p.clientName === clientName),
    [onboardingPayments]
  );

  // ── Price overrides ───────────────────────────────────────────────────────────
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

  // ── Record payment ────────────────────────────────────────────────────────────
  const recordPayment = useCallback((data: any) => {
    // Handle promises
    if (data.promises && Array.isArray(data.promises)) {
      const cached = qc.getQueryData<Contract[]>(["contracts"]) ?? [];
      const contract = [...cached, ...additionalContracts].find((c) => c.id === data.contractId);

      data.promises.filter((p: any) => p.date).forEach((p: any, idx: number) => {
        const newPromise: PaymentPromise = {
          id:             `p${Date.now()}-${idx}`,
          contractId:     data.contractId,
          clientName:     contract?.clientName ?? "",
          salesperson:    contract?.salesperson ?? "",
          renewalYear:    data.year,
          renewalMonth:   data.month,
          paidAmount:     data.amount,
          remainingAmount: p.amount > 0 ? p.amount : 0,
          promisedDate:   p.date,
          notes:          p.notes || undefined,
          createdAt:      new Date().toISOString(),
        };
        addPromise(newPromise);
      });
    }

    // Handle price override
    if (data.overrideAmount && data.cascadeFromYear && data.cascadeFromMonth) {
      setPriceOverrides((prev) => ({
        ...prev,
        [data.contractId]: [
          ...(prev[data.contractId] ?? []),
          { fromYear: data.cascadeFromYear, fromMonth: data.cascadeFromMonth, newAmount: data.overrideAmount },
        ],
      }));
      createOverrideMutation.mutate({
        contractId: data.contractId,
        fromYear:   data.cascadeFromYear,
        fromMonth:  data.cascadeFromMonth,
        newAmount:  data.overrideAmount,
      });
    }

    // Record the actual payment
    recordPaymentMutation.mutate({
      contractId:  data.contractId,
      renewalYear:  data.year,
      renewalMonth: data.month,
      amount:       data.amount,
      paidOn:       data.paidOn || new Date().toISOString().split("T")[0],
      notes:        data.notes,
      type:         "renewal",
    });
  }, [qc, additionalContracts, addPromise, createOverrideMutation, recordPaymentMutation]);

  // ── Contract editing ──────────────────────────────────────────────────────────
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
    patchContractMutation.mutate({ id: contractId, changes: changes as Record<string, unknown> });
  }, [patchContractMutation]);

  const addContract = useCallback((contract: Contract) => {
    setAdditionalContracts((prev) => [...prev, contract]);
    setSelectedContracts((prev) => [...prev, contract]);
    // Hit backend
    createContractMutation.mutate({
      ...contract,
      renewalSchedule: (contract.renewalSchedule ?? []) as any,
    });
  }, [createContractMutation]);

  const getContractEdits = useCallback(
    (contractId: string) => contractEdits[contractId] ?? [],
    [contractEdits]
  );

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