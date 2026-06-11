"use client";
import { Contract, ClientNote } from "@/types";
import { Modal } from "@/components/ui/Modal";
import { useClient } from "@/lib/client-context";
import { StatusBadge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { formatCurrency, getMonthShort, SALESPERSON_COLORS } from "@/lib/utils";
import { cn } from "@/lib/utils";
import {
  User, Package, CalendarDays, IndianRupee, CreditCard,
  Ban, RefreshCw, AlertTriangle, CheckCircle2, Clock,
  FileText, ChevronUp, MessageSquare, Plus, Send, Trash2,
} from "lucide-react";
import { useState } from "react";
import { PaymentStatus } from "@/types";

// ─── Types ────────────────────────────────────────────────────────────────────
interface PromiseRow {
  date: string;
  amount: string;
  notes: string;
}

// ─── Inline payment form ──────────────────────────────────────────────────────
interface InlinePaymentFormProps {
  contractId: string;
  clientName: string;
  renewalYear: number;
  renewalMonth: number;
  fullAmount: number;
  paidSoFar: number;
  onSave: (data: {
    contractId: string; year: number; month: number;
    amount: number; status: PaymentStatus; notes: string;
    paidOn: string;
    promises?: { date: string; amount: number; notes: string }[];
    overrideAmount?: number;
    cascadeFromYear?: number;
    cascadeFromMonth?: number;
  }) => void;
  onCancel: () => void;
}

function InlinePaymentForm({
  contractId, clientName, renewalYear, renewalMonth,
  fullAmount, paidSoFar, onSave, onCancel,
}: InlinePaymentFormProps) {
  const outstanding      = fullAmount - paidSoFar;
  const [paymentType,    setPaymentType]    = useState<"full" | "partial">("full");
  const [amount,         setAmount]         = useState(String(outstanding));
  const [paidOn,         setPaidOn]         = useState(new Date().toISOString().split("T")[0]);
  const [notes,          setNotes]          = useState("");
  const [editingAmount,  setEditingAmount]  = useState(false);
  const [overrideAmount, setOverrideAmount] = useState(String(fullAmount));
  const [loading,        setLoading]        = useState(false);
  const [promiseRows,    setPromiseRows]    = useState<PromiseRow[]>([{ date: "", amount: "", notes: "" }]);

  function handleTypeChange(type: "full" | "partial") {
    setPaymentType(type);
    if (type === "full") setAmount(String(outstanding));
    else setAmount("");
  }

  const entered = Number(amount) || 0;
  const effectiveFullAmount = editingAmount && Number(overrideAmount) > 0 ? Number(overrideAmount) : fullAmount;
  const effectiveOutstanding = effectiveFullAmount - paidSoFar;
  const remaining = effectiveOutstanding - entered;

  function updatePromiseRow(idx: number, field: keyof PromiseRow, value: string) {
    setPromiseRows((prev) => prev.map((row, i) => i === idx ? { ...row, [field]: value } : row));
  }
  function addPromiseRow() {
    setPromiseRows((prev) => [...prev, { date: "", amount: "", notes: "" }]);
  }
  function removePromiseRow(idx: number) {
    setPromiseRows((prev) => prev.filter((_, i) => i !== idx));
  }

  const promisedTotal = promiseRows.reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
  const promiseSumDiff = remaining > 0 ? promisedTotal - remaining : 0;
  const hasAnyPromise = promiseRows.some((r) => r.date || r.amount);

  async function handleSave() {
    if (!entered || entered <= 0) return;
    setLoading(true);
    await new Promise((r) => setTimeout(r, 500));
    const isFull = paymentType === "full";
    const validPromises = isFull ? [] : promiseRows
      .filter((r) => r.date)
      .map((r) => ({ date: r.date, amount: Number(r.amount) || 0, notes: r.notes }));
    onSave({
      contractId, year: renewalYear, month: renewalMonth,
      amount:           isFull ? effectiveOutstanding : entered,
      status:           isFull ? "collected" : "partial",
      notes, paidOn,
      promises:         validPromises.length > 0 ? validPromises : undefined,
      overrideAmount:   editingAmount && Number(overrideAmount) !== fullAmount ? Number(overrideAmount) : undefined,
      cascadeFromYear:  editingAmount && Number(overrideAmount) !== fullAmount ? renewalYear  : undefined,
      cascadeFromMonth: editingAmount && Number(overrideAmount) !== fullAmount ? renewalMonth : undefined,
    });
    setLoading(false);
  }

  return (
    <div className="mt-2 border border-accent-border bg-accent-light/20 rounded-xl p-4 space-y-4">
      <p className="text-xs font-semibold text-accent uppercase tracking-wide">Record Payment</p>

      {/* STEP 1 */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Step 1 — Renewal Amount</p>
            <p className="text-xs text-slate-400 mt-0.5">
              Scheduled: <span className="font-semibold text-slate-600">{formatCurrency(fullAmount)}</span>
              {editingAmount && Number(overrideAmount) > 0 && Number(overrideAmount) !== fullAmount && (
                <span className="ml-2 font-semibold text-accent-amber">→ New: {formatCurrency(Number(overrideAmount))}</span>
              )}
            </p>
          </div>
          <button type="button" onClick={() => { setEditingAmount((v) => !v); if (!editingAmount) setOverrideAmount(String(fullAmount)); }}
            className="text-xs text-accent hover:text-accent-hover underline underline-offset-2 transition-colors flex-shrink-0">
            {editingAmount ? "Keep original" : "Amount changed? ↗"}
          </button>
        </div>
        {editingAmount && (
          <div className="bg-accent-amberLight border border-amber-200 rounded-xl p-3 space-y-2">
            <p className="text-xs font-semibold text-amber-800">New agreed amount for {getMonthShort(renewalMonth)} {renewalYear} onwards</p>
            <div className="relative">
              <IndianRupee className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input type="number" value={overrideAmount}
                onChange={(e) => { setOverrideAmount(e.target.value); if (paymentType === "full") setAmount(e.target.value); }}
                className="w-full pl-7 pr-3 py-2 h-9 text-sm bg-white border border-amber-300 rounded-lg focus:outline-none focus:border-accent-amber focus:ring-1 focus:ring-amber-200 text-slate-700" />
            </div>
            {Number(overrideAmount) !== fullAmount && Number(overrideAmount) > 0 && (
              <p className="text-[11px] text-amber-700">
                {Number(overrideAmount) > fullAmount ? "↑ Increased" : "↓ Reduced"} from ₹{fullAmount.toLocaleString()} — applies to this and all future renewals
              </p>
            )}
          </div>
        )}
      </div>

      <div className="border-t border-slate-100" />

      {/* STEP 2 */}
      <div className="space-y-3">
        <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Step 2 — Payment Collected</p>
        <div className="grid grid-cols-2 gap-2">
          <button type="button" onClick={() => handleTypeChange("full")}
            className={cn("flex flex-col items-center gap-1 py-3 px-4 rounded-xl border-2 transition-all",
              paymentType === "full" ? "border-accent-green bg-accent-greenLight" : "border-slate-200 bg-white hover:border-slate-300")}>
            <CheckCircle2 className={cn("w-5 h-5", paymentType === "full" ? "text-accent-green" : "text-slate-300")} />
            <span className={cn("text-sm font-semibold", paymentType === "full" ? "text-accent-green" : "text-slate-500")}>Full Payment</span>
            <span className={cn("text-xs", paymentType === "full" ? "text-accent-green/70" : "text-slate-400")}>{formatCurrency(effectiveOutstanding)} collected</span>
          </button>
          <button type="button" onClick={() => handleTypeChange("partial")}
            className={cn("flex flex-col items-center gap-1 py-3 px-4 rounded-xl border-2 transition-all",
              paymentType === "partial" ? "border-accent-amber bg-accent-amberLight" : "border-slate-200 bg-white hover:border-slate-300")}>
            <Clock className={cn("w-5 h-5", paymentType === "partial" ? "text-accent-amber" : "text-slate-300")} />
            <span className={cn("text-sm font-semibold", paymentType === "partial" ? "text-accent-amber" : "text-slate-500")}>Partial Payment</span>
            <span className={cn("text-xs", paymentType === "partial" ? "text-accent-amber/70" : "text-slate-400")}>Enter amount below</span>
          </button>
        </div>

        {paymentType === "partial" && (
          <div>
            <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide block mb-1">Amount Received (₹) *</label>
            <div className="relative">
              <IndianRupee className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)}
                placeholder={`Up to ${formatCurrency(effectiveOutstanding)}`}
                className="w-full pl-7 pr-3 py-2 h-9 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/20 text-slate-700" />
            </div>
            {entered > 0 && entered < effectiveOutstanding && (
              <p className="text-xs text-accent-amber mt-1">{formatCurrency(effectiveOutstanding - entered)} still outstanding after this payment</p>
            )}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide block mb-1">Date of Payment *</label>
            <input type="date" value={paidOn} onChange={(e) => setPaidOn(e.target.value)}
              className="w-full px-3 py-2 h-9 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/20 text-slate-700" />
          </div>
          <div>
            <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide block mb-1">Notes (optional)</label>
            <div className="relative">
              <FileText className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
              <input type="text" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="NEFT ref, cheque no..."
                className="w-full pl-7 pr-3 py-2 h-9 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/20 text-slate-700" />
            </div>
          </div>
        </div>
      </div>

      {/* STEP 3 */}
      {paymentType === "partial" && (
        <>
          <div className="border-t border-slate-100" />
          <div className="space-y-3">
            <div>
              <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">
                Step 3 — Promises for Remaining {entered > 0 ? formatCurrency(remaining) : "Amount"}
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                When has <strong className="text-slate-600">{clientName}</strong> committed to paying the rest?
              </p>
            </div>

            <div className="border border-amber-200 bg-amber-50 rounded-xl overflow-hidden">
              <div className="divide-y divide-amber-100">
                {promiseRows.map((row, idx) => (
                  <div key={idx} className="p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-semibold text-amber-700 uppercase tracking-wide">
                        Promise {promiseRows.length > 1 ? `#${idx + 1}` : ""}
                      </span>
                      {promiseRows.length > 1 && (
                        <button type="button" onClick={() => removePromiseRow(idx)}
                          className="text-amber-400 hover:text-accent-red transition-colors p-0.5 rounded">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[10px] font-medium text-amber-700 block mb-1">Promised Date</label>
                        <input type="date" value={row.date} onChange={(e) => updatePromiseRow(idx, "date", e.target.value)}
                          className="w-full px-3 py-2 h-9 text-sm bg-white border border-amber-200 rounded-lg focus:outline-none focus:border-accent-amber focus:ring-1 focus:ring-amber-200 text-slate-700" />
                      </div>
                      <div>
                        <label className="text-[10px] font-medium text-amber-700 block mb-1">Amount (₹)</label>
                        <div className="relative">
                          <IndianRupee className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-amber-400" />
                          <input type="number" value={row.amount} onChange={(e) => updatePromiseRow(idx, "amount", e.target.value)}
                            placeholder="0"
                            className="w-full pl-7 pr-3 py-2 h-9 text-sm bg-white border border-amber-200 rounded-lg focus:outline-none focus:border-accent-amber focus:ring-1 focus:ring-amber-200 text-slate-700" />
                        </div>
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] font-medium text-amber-700 block mb-1">Note (optional)</label>
                      <input type="text" value={row.notes} onChange={(e) => updatePromiseRow(idx, "notes", e.target.value)}
                        placeholder="e.g. Cheque on 15th, NEFT transfer"
                        className="w-full px-3 py-2 h-9 text-sm bg-white border border-amber-200 rounded-lg focus:outline-none focus:border-accent-amber focus:ring-1 focus:ring-amber-200 text-slate-700" />
                    </div>
                    {row.date && (
                      <p className="text-[11px] text-amber-700 bg-white border border-amber-200 rounded-lg px-2.5 py-1.5">
                        📅 Will appear on renewal calendar on{" "}
                        <strong>{new Date(row.date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</strong>
                        {row.amount ? ` · ${formatCurrency(Number(row.amount))}` : ""}
                      </p>
                    )}
                  </div>
                ))}
              </div>

              <div className="px-3 py-2.5 bg-amber-100/60 border-t border-amber-200 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 text-xs">
                  {remaining > 0 && hasAnyPromise && (
                    <>
                      <span className="text-amber-700">Promised: <span className="font-semibold">{formatCurrency(promisedTotal)}</span></span>
                      <span className="text-amber-500">of</span>
                      <span className="text-amber-700">Outstanding: <span className="font-semibold">{formatCurrency(remaining)}</span></span>
                      {promiseSumDiff !== 0 && (
                        <span className={cn("font-semibold", promiseSumDiff > 0 ? "text-accent-green" : "text-accent-red")}>
                          {promiseSumDiff > 0 ? `+${formatCurrency(promiseSumDiff)} over` : `${formatCurrency(Math.abs(promiseSumDiff))} short`}
                        </span>
                      )}
                      {promiseSumDiff === 0 && (
                        <span className="text-accent-green font-semibold flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> Balanced
                        </span>
                      )}
                    </>
                  )}
                  {remaining > 0 && !hasAnyPromise && (
                    <span className="text-amber-500 italic">Set dates to track on calendar</span>
                  )}
                </div>
                <button type="button" onClick={addPromiseRow}
                  className="flex items-center gap-1 text-xs font-semibold text-amber-700 hover:text-amber-900 transition-colors flex-shrink-0">
                  <Plus className="w-3.5 h-3.5" /> Add another date
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-100">
        <Button variant="ghost" size="sm" onClick={onCancel}>Cancel</Button>
        <Button size="sm" onClick={handleSave} loading={loading}
          disabled={paymentType === "partial" && (!entered || entered <= 0)}>
          <CheckCircle2 className="w-3.5 h-3.5" />
          {paymentType === "full" ? "Mark as Collected" : "Save Partial Payment"}
        </Button>
      </div>
    </div>
  );
}

// ─── Main Modal ───────────────────────────────────────────────────────────────
interface ClientDetailModalProps {
  open: boolean;
  onClose: () => void;
  contracts: Contract[];
  onMarkPayment?: (contractId: string, year: number, month: number) => void;
  isStopped?: boolean;
  onStop?: (clientName: string) => void;
  onReactivate?: (clientName: string) => void;
}

export function ClientDetailModal({
  open, onClose, contracts, onMarkPayment,
  isStopped = false, onStop, onReactivate,
}: ClientDetailModalProps) {
  const [showStopConfirm, setShowStopConfirm] = useState(false);
  const [activePayment,   setActivePayment]   = useState<string | null>(null);
  const [newNoteText,     setNewNoteText]     = useState("");
  const [addingNote,      setAddingNote]      = useState(false);
  const [savingNote,      setSavingNote]      = useState(false);

  if (!contracts.length) return null;

  const { addNote, getNotesForClient, getOnboardingPayment, getEffectiveAmount, recordPayment } = useClient();
  const clientNotes       = getNotesForClient(contracts[0]?.clientName ?? "");
  const onboardingPayment = getOnboardingPayment(contracts[0]?.clientName ?? "");

  async function handleAddNote() {
    if (!newNoteText.trim()) return;
    setSavingNote(true);
    await new Promise((r) => setTimeout(r, 300));
    addNote({
      id:         `note-${Date.now()}`,
      clientName: primary.clientName,
      text:       newNoteText.trim(),
      createdAt:  new Date().toISOString(),
      createdBy:  "Management",
    });
    setNewNoteText("");
    setAddingNote(false);
    setSavingNote(false);
  }

  const primary    = contracts[0];
  const color      = SALESPERSON_COLORS[primary.salesperson];
  const totalValue = contracts.reduce((a, c) => a + c.dealValue, 0);

  const allRenewals = contracts
    .flatMap((c) => c.renewalSchedule.map((r) => ({ ...r, contract: c })))
    .sort((a, b) => (a.year * 100 + a.month) - (b.year * 100 + b.month));

  const byYear: Record<number, typeof allRenewals> = {};
  allRenewals.forEach((r) => {
    if (!byYear[r.year]) byYear[r.year] = [];
    byYear[r.year].push(r);
  });

  function handleStop() {
    onStop?.(primary.clientName);
    setShowStopConfirm(false);
  }

  // Calls recordPayment from context directly — no prop passing, no stale closure
  function handlePaymentSave(data: any) {
    recordPayment(data);
    setActivePayment(null);
  }

  return (
    <Modal
      open={open}
      onClose={() => { setShowStopConfirm(false); setActivePayment(null); onClose(); }}
      title={primary.clientName}
      subtitle={`${primary.salesperson} · ${primary.accountManager}`}
      size="xl"
    >
      <div className="space-y-5">
        {isStopped && (
          <div className="flex items-center gap-3 px-4 py-3 bg-accent-redLight border border-red-200 rounded-xl">
            <Ban className="w-4 h-4 text-accent-red flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-accent-red">Client Stopped</p>
              <p className="text-xs text-red-400 mt-0.5">This client has opted out of renewals.</p>
            </div>
            <Button variant="secondary" size="sm" onClick={() => onReactivate?.(primary.clientName)}>
              <RefreshCw className="w-3.5 h-3.5" /> Reactivate
            </Button>
          </div>
        )}

        {/* Overview */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Salesperson", value: primary.salesperson,        icon: User,        color: "text-slate-700"    },
            { label: "Account Mgr", value: primary.accountManager,     icon: User,        color: "text-slate-700"    },
            { label: "Total Value", value: formatCurrency(totalValue),  icon: IndianRupee, color: "text-accent-green" },
            { label: "Services",    value: contracts.length.toString(), icon: Package,     color: "text-accent"       },
          ].map(({ label, value, icon: Icon, color: c }) => (
            <div key={label} className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5">
              <div className="flex items-center gap-1.5 mb-1">
                <Icon className="w-3 h-3 text-slate-400" />
                <span className="text-[10px] text-slate-400 uppercase tracking-wide">{label}</span>
              </div>
              <p className={cn("text-sm font-semibold truncate", c)}>{value}</p>
            </div>
          ))}
        </div>

        {/* Contracts */}
        <div>
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest mb-3">Contracts</p>
          <div className="space-y-2">
            {contracts.map((c) => (
              <div key={c.id} className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                    <span className="text-sm font-semibold text-slate-700">{c.product}</span>
                  </div>
                  <span className="text-sm font-bold text-slate-700">{formatCurrency(c.dealValue)}</span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  {[
                    ["Contract ID",   c.contractId || "—"],
                    ["Term",          `${c.contractTermMonths} months`],
                    ["GST",           c.gstStatus === "Y" ? "Registered" : "Not registered"],
                    ["Profiles",      String(c.profiles)],
                    ["First Renewal", c.firstRenewalDate],
                    ["Renewals",      `${c.renewalSchedule.length} months`],
                  ].map(([label, value]) => (
                    <div key={label}>
                      <span className="text-slate-400">{label}</span>
                      <p className={cn("mt-0.5 font-medium", label === "GST" && c.gstStatus === "Y" ? "text-accent-cyan" : "text-slate-600")}>{value}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Onboarding payment */}
        {onboardingPayment && (
          <div>
            <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest mb-3">Payment Timeline</p>
            <div className="relative pl-5">
              <div className="absolute left-1.5 top-3 bottom-3 w-px bg-slate-200" />
              <div className="relative mb-4">
                <div className={cn("absolute -left-5 top-2 w-3 h-3 rounded-full border-2 border-white",
                  onboardingPayment.status === "collected" ? "bg-accent-green" :
                  onboardingPayment.status === "partial"   ? "bg-accent-amber" : "bg-slate-300")} />
                <div className={cn("border rounded-xl p-3",
                  onboardingPayment.status === "collected" ? "bg-accent-greenLight border-emerald-200" :
                  onboardingPayment.status === "partial"   ? "bg-accent-amberLight border-amber-200" :
                  "bg-slate-50 border-slate-200")}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-700">Onboarding Payment</span>
                      <StatusBadge status={onboardingPayment.status === "not_collected" ? "pending" : onboardingPayment.status} size="sm" />
                    </div>
                    <span className={cn("text-sm font-bold",
                      onboardingPayment.status === "collected" ? "text-accent-green" :
                      onboardingPayment.status === "partial"   ? "text-accent-amber" : "text-slate-400")}>
                      {onboardingPayment.status === "not_collected" ? "Not collected" : formatCurrency(onboardingPayment.amountCollected)}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">{onboardingPayment.paidOn} · Initial deal payment</p>
                  {onboardingPayment.notes && <p className="text-[11px] text-slate-500 mt-0.5 italic">{onboardingPayment.notes}</p>}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Renewal timeline */}
        <div>
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest mb-3">
            Renewal Timeline — click Pay on any due renewal
          </p>
          <div className="space-y-5">
            {Object.entries(byYear).map(([year, renewals]) => (
              <div key={year}>
                <p className="text-xs font-semibold text-slate-500 mb-2">{year}</p>
                <div className="space-y-1.5">
                  {renewals.map((r) => {
                    const key       = `${r.contract.id}-${r.year}-${r.month}`;
                    const isActive  = activePayment === key;
                    const paidSoFar = r.payments.reduce((a, p) => a + p.amount, 0);
                    const canPay    = !isStopped && r.status !== "collected" && r.status !== "waived";
                    const effAmount = getEffectiveAmount(r.contract.id, r.year, r.month, r.amount);

                    return (
                      <div key={key}>
                        <div className={cn("flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl border transition-all",
                          isActive ? "bg-accent-light/20 border-accent-border" : "bg-slate-50 border-slate-200 hover:border-slate-300")}>
                          <div className="flex items-center gap-2 min-w-0">
                            <CalendarDays className="w-3 h-3 text-slate-400 flex-shrink-0" />
                            <div className="min-w-0">
                              <p className="text-xs font-medium text-slate-600">{getMonthShort(r.month)} {r.year}</p>
                              <p className="text-[10px] text-slate-400 truncate">{r.contract.product}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <div className="text-right">
                              <div className="flex items-center gap-1.5">
                                <p className="text-xs font-semibold text-slate-700">{formatCurrency(effAmount)}</p>
                                {(r as any).overriddenAmount && (r as any).overriddenAmount !== r.amount && (
                                  <span className="text-[9px] text-slate-400 line-through">{formatCurrency(r.amount)}</span>
                                )}
                              </div>
                              {paidSoFar > 0 && paidSoFar < effAmount && (
                                <p className="text-[10px] text-accent-green">Paid: {formatCurrency(paidSoFar)}</p>
                              )}
                            </div>
                            <StatusBadge status={r.status} size="sm" />
                            {canPay && (
                              <button onClick={() => setActivePayment(isActive ? null : key)}
                                className={cn("flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-lg border transition-all",
                                  isActive ? "bg-slate-100 text-slate-500 border-slate-200" : "bg-accent text-white border-accent hover:bg-accent-hover shadow-sm")}>
                                {isActive ? <><ChevronUp className="w-3 h-3" /> Hide</> : <><CreditCard className="w-3 h-3" /> Pay</>}
                              </button>
                            )}
                            {r.status === "collected" && (
                              <span className="flex items-center gap-1 text-[11px] text-accent-green">
                                <CheckCircle2 className="w-3.5 h-3.5" /> Done
                              </span>
                            )}
                          </div>
                        </div>
                        {isActive && (
                          <InlinePaymentForm
                            contractId={r.contract.id}
                            clientName={primary.clientName}
                            renewalYear={r.year}
                            renewalMonth={r.month}
                            fullAmount={effAmount}
                            paidSoFar={paidSoFar}
                            onSave={handlePaymentSave}
                            onCancel={() => setActivePayment(null)}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
                <div className="flex justify-end mt-1 pr-1">
                  <span className="text-xs text-slate-400">
                    Year total: <span className="font-semibold text-slate-500">{formatCurrency(renewals.reduce((a, r) => a + r.amount, 0))}</span>
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Notes */}
        <div className="border border-slate-200 rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-200">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-3.5 h-3.5 text-slate-500" />
              <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Notes</p>
              {clientNotes.length > 0 && (
                <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-accent-light text-accent border border-accent-border">{clientNotes.length}</span>
              )}
            </div>
            <button onClick={() => setAddingNote((v) => !v)}
              className="flex items-center gap-1.5 text-xs font-medium text-accent hover:text-accent-hover transition-colors">
              <Plus className="w-3.5 h-3.5" /> Add Note
            </button>
          </div>
          {addingNote && (
            <div className="px-4 py-3 bg-accent-light/20 border-b border-slate-200 space-y-2">
              <textarea rows={3} placeholder="Type your note here..." value={newNoteText}
                onChange={(e) => setNewNoteText(e.target.value)} autoFocus
                className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/10 text-slate-700 placeholder:text-slate-400 resize-none" />
              <div className="flex items-center justify-end gap-2">
                <button onClick={() => { setAddingNote(false); setNewNoteText(""); }}
                  className="text-xs text-slate-400 hover:text-slate-600 transition-colors">Cancel</button>
                <button onClick={handleAddNote} disabled={!newNoteText.trim() || savingNote}
                  className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-accent text-white hover:bg-accent-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                  <Send className="w-3 h-3" />
                  {savingNote ? "Saving..." : "Save Note"}
                </button>
              </div>
            </div>
          )}
          <div className="divide-y divide-slate-100">
            {clientNotes.length === 0 ? (
              <div className="px-4 py-6 text-center">
                <MessageSquare className="w-6 h-6 text-slate-300 mx-auto mb-2" />
                <p className="text-xs text-slate-400">No notes yet — add the first one</p>
              </div>
            ) : (
              [...clientNotes].reverse().map((note) => (
                <div key={note.id} className="px-4 py-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] font-semibold text-slate-500">{note.createdBy}</span>
                    <span className="text-[10px] text-slate-400">
                      {new Date(note.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                  <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">{note.text}</p>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Stop client */}
        {!isStopped && (
          <div className="border border-slate-200 rounded-xl p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-slate-700">Stop Client</p>
                <p className="text-xs text-slate-400 mt-0.5">Mark as stopped if they've opted out of renewals. Data is preserved.</p>
              </div>
              {!showStopConfirm ? (
                <Button variant="danger" size="sm" onClick={() => setShowStopConfirm(true)}>
                  <Ban className="w-3.5 h-3.5" /> Stop Client
                </Button>
              ) : (
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Button variant="ghost" size="sm" onClick={() => setShowStopConfirm(false)}>Cancel</Button>
                  <Button variant="danger" size="sm" onClick={handleStop}>
                    <AlertTriangle className="w-3.5 h-3.5" /> Confirm Stop
                  </Button>
                </div>
              )}
            </div>
            {showStopConfirm && (
              <div className="mt-3 px-3 py-2 bg-accent-redLight border border-red-200 rounded-lg">
                <p className="text-xs text-accent-red font-medium">
                  This will mark <strong>{primary.clientName}</strong> as stopped across all pages.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}