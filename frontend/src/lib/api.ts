/**
 * src/lib/api.ts
 *
 * Central API layer. All fetch calls go through here.
 * Uses React Query for caching — contracts are fetched once
 * and shared across all components via the cache key ['contracts'].
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Contract, ClientNote, OnboardingPayment } from "@/types";
import { PaymentPromise } from "@/components/renewals/PaymentModal";

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "";

// ─── Generic fetch wrapper ────────────────────────────────────────────────────
async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Request failed" }));
    throw new Error(err.error ?? "Request failed");
  }
  return res.json();
}

// ─── Contracts ────────────────────────────────────────────────────────────────
export function useContracts() {
  return useQuery<Contract[]>({
    queryKey: ["contracts"],
    queryFn:  () => apiFetch<Contract[]>("/contracts"),
    staleTime: 30_000, // 30s — don't refetch on every mount
  });
}

export function useCreateContract() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Contract> & { renewalSchedule?: { year: number; month: number; amount: number }[] }) =>
      apiFetch<Contract>("/contracts", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["contracts"] }),
  });
}

export function usePatchContract() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, changes }: { id: string; changes: Record<string, unknown> }) =>
      apiFetch<Contract>(`/contracts/${id}`, { method: "PATCH", body: JSON.stringify(changes) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["contracts"] }),
  });
}

export function usePatchContractStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, contractStatus }: { id: string; contractStatus: "active" | "stopped" }) =>
      apiFetch<Contract>(`/contracts/${id}/status`, { method: "PATCH", body: JSON.stringify({ contractStatus }) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["contracts"] }),
  });
}

// ─── Payments ─────────────────────────────────────────────────────────────────
export function useRecordPayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      contractId: string;
      renewalYear: number;
      renewalMonth: number;
      amount: number;
      paidOn: string;
      notes?: string;
      type?: "renewal" | "onboarding";
    }) => apiFetch("/payments", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["contracts"] }),
  });
}

// ─── Promises ─────────────────────────────────────────────────────────────────
export function useCreatePromise() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Omit<PaymentPromise, "id" | "createdAt">) =>
      apiFetch("/promises", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["promises"] }),
  });
}

export function usePromises() {
  return useQuery<PaymentPromise[]>({
    queryKey: ["promises"],
    queryFn:  () => apiFetch<PaymentPromise[]>("/promises").catch(() => []),
    staleTime: 30_000,
  });
}

// ─── Notes ────────────────────────────────────────────────────────────────────
export function useNotes(clientName: string) {
  return useQuery<ClientNote[]>({
    queryKey: ["notes", clientName],
    queryFn:  () => apiFetch<ClientNote[]>(`/notes/${encodeURIComponent(clientName)}`),
    enabled:  !!clientName,
    staleTime: 30_000,
  });
}

export function useCreateNote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { clientName: string; text: string }) =>
      apiFetch<ClientNote>("/notes", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: (_data, vars) => qc.invalidateQueries({ queryKey: ["notes", vars.clientName] }),
  });
}

// ─── Onboarding ───────────────────────────────────────────────────────────────
export function useOnboarding(clientName: string) {
  return useQuery<OnboardingPayment | null>({
    queryKey: ["onboarding", clientName],
    queryFn:  () => apiFetch<OnboardingPayment>(`/onboarding/${encodeURIComponent(clientName)}`).catch(() => null),
    enabled:  !!clientName,
    staleTime: 60_000,
  });
}

export function useUpsertOnboarding() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Omit<OnboardingPayment, "id">) =>
      apiFetch<OnboardingPayment>("/onboarding", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: (_data, vars) => qc.invalidateQueries({ queryKey: ["onboarding", vars.clientName] }),
  });
}

// ─── Price overrides ──────────────────────────────────────────────────────────
export function useCreatePriceOverride() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { contractId: string; fromYear: number; fromMonth: number; newAmount: number }) =>
      apiFetch("/price-overrides", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["contracts"] }),
  });
}

// ─── Dashboard stats ──────────────────────────────────────────────────────────
export interface DashboardStats {
  totalContracts: number;
  activeContracts: number;
  stoppedContracts: number;
  totalDealValue: number;
  totalCollected: number;
  renewalsByStatus: Record<string, { count: number; amount: number }>;
  upcomingRenewals: Array<{
    id: string;
    year: number;
    month: number;
    amount: number;
    status: string;
    contract: { id: string; clientName: string; salesperson: string; product: string };
  }>;
  salesBreakdown: Array<{
    salesperson: string;
    activeContracts: number;
    totalDealValue: number;
  }> | null;
}

export function useDashboardStats() {
  return useQuery<DashboardStats>({
    queryKey: ["dashboard"],
    queryFn:  () => apiFetch<DashboardStats>("/dashboard/stats"),
    staleTime: 30_000,
  });
}