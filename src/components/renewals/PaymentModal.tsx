"use client";
import { useState, useEffect } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { StatusBadge } from "@/components/ui/Badge";
import { CONTRACTS } from "@/lib/mock-data";
import { formatCurrency, getMonthShort } from "@/lib/utils";
import { PaymentStatus } from "@/types";
import { IndianRupee, FileText, CheckCircle2, Clock, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export interface PaymentPromise {
  id: string;
  contractId: string;
  clientName: string;
  salesperson: string;
  renewalYear: number;
  renewalMonth: number;
  paidAmount: number;
  remainingAmount: number;
  promisedDate: string;
  notes?: string;
  createdAt: string;
}

interface PaymentModalProps {
  open: boolean;
  onClose: () => void;
  contractId: string;
  renewalYear: number;
  renewalMonth: number;
  onSave: (data: {
    contractId: string;
    year: number;
    month: number;
    amount: number;
    status: PaymentStatus;
    notes: string;
    paidOn: string;
    promise?: Omit<PaymentPromise, "id" | "createdAt">;
  }) => void;
}

export function PaymentModal({
  open, onClose, contractId, renewalYear, renewalMonth, onSave,
}: PaymentModalProps) {
  const contract = CONTRACTS.find((c) => c.id === contractId);
  const renewal  = contract?.renewalSchedule.find(
    (r) => r.year === renewalYear && r.month === renewalMonth
  );

  const [amount,       setAmount]       = useState(String(renewal?.amount ?? ""));
  const [notes,        setNotes]        = useState("");
  const [paidOn,       setPaidOn]       = useState(new Date().toISOString().split("T")[0]);
  const [promiseDate,  setPromiseDate]  = useState("");
  const [promiseNotes, setPromiseNotes] = useState("");
  const [loading,      setLoading]      = useState(false);

  // Reset when contract changes
  useEffect(() => {
    setAmount(String(renewal?.amount ?? ""));
    setNotes("");
    setPaidOn(new Date().toISOString().split("T")[0]);
    setPromiseDate("");
    setPromiseNotes("");
  }, [contractId, renewalYear, renewalMonth]);

  if (!contract || !renewal) return null;

  const fullAmount    = renewal?.amount ?? 0;
  const paidSoFar     = renewal?.payments.reduce((a, p) => a + p.amount, 0);
  const outstanding   = fullAmount - paidSoFar;
  const enteredAmount = Number(amount) || 0;
  const remaining     = outstanding - enteredAmount;
  const isPartial     = enteredAmount > 0 && enteredAmount < outstanding;
  const isFull        = enteredAmount >= outstanding;

  function handleAmountChange(val: string) {
    setAmount(val);
  }

  async function handleSave() {
    if (!enteredAmount || enteredAmount <= 0) return;
    setLoading(true);
    await new Promise((r) => setTimeout(r, 600));

    const promise = isPartial && promiseDate
      ? {
          contractId,
          clientName:      contract!.clientName,
          salesperson:     contract!.salesperson,
          renewalYear,
          renewalMonth,
          paidAmount:      enteredAmount,
          remainingAmount: remaining,
          promisedDate:    promiseDate,
          notes:           promiseNotes || `Balance of ${formatCurrency(remaining)}`,
        }
      : undefined;

    onSave({
      contractId,
      year:   renewalYear,
      month:  renewalMonth,
      amount: enteredAmount,
      status: isFull ? "collected" : "partial",
      notes,
      paidOn,
      promise,
    });

    setLoading(false);
    onClose();
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Record Payment"
      subtitle={`${contract.clientName} · ${getMonthShort(renewalMonth)} ${renewalYear}`}
      size="md"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} loading={loading} disabled={!enteredAmount || enteredAmount <= 0}>
            <CheckCircle2 className="w-3.5 h-3.5" />
            Save Payment
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        {/* Contract summary */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 grid grid-cols-2 gap-x-4 gap-y-1.5">
          {[
            ["Client",       contract.clientName,          "text-slate-600 col-span-2"],
            ["Full Amount",  formatCurrency(fullAmount),   "text-slate-700"],
            ["Paid So Far",  formatCurrency(paidSoFar),    "text-accent-green"],
            ["Outstanding",  formatCurrency(outstanding),  outstanding > 0 ? "text-accent-amber" : "text-accent-green"],
          ].map(([label, value, color]) => (
            <div key={label as string} className={label === "Client" ? "col-span-2" : ""}>
              <p className="text-[10px] text-slate-400 uppercase tracking-wide">{label}</p>
              <p className={cn("text-xs font-semibold mt-0.5 truncate", color as string)}>{value}</p>
            </div>
          ))}
          <div className="col-span-2 pt-1.5 border-t border-slate-200 flex items-center justify-between">
            <span className="text-[10px] text-slate-400 uppercase tracking-wide">Status</span>
            <StatusBadge status={renewal.status} size="sm" />
          </div>
        </div>

        {/* Payment fields */}
        <div className="space-y-4">
          <Input
            label="Amount Received (₹) *"
            type="number"
            min={1}
            max={outstanding}
            placeholder={`Up to ${formatCurrency(outstanding)}`}
            value={amount}
            onChange={(e) => handleAmountChange(e.target.value)}
            leftIcon={<IndianRupee className="w-3.5 h-3.5" />}
          />

          <Input
            label="Date of Payment *"
            type="date"
            value={paidOn}
            onChange={(e) => setPaidOn(e.target.value)}
          />

          <Input
            label="Notes (optional)"
            placeholder="e.g. Paid via NEFT, ref #12345"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            leftIcon={<FileText className="w-3.5 h-3.5" />}
          />
        </div>

        {/* Live status preview */}
        {enteredAmount > 0 && (
          <div className={cn(
            "flex items-center justify-between px-4 py-3 rounded-xl border",
            isFull
              ? "bg-accent-greenLight border-emerald-200"
              : "bg-accent-amberLight border-amber-200"
          )}>
            <div>
              <p className="text-xs font-medium text-slate-600">
                {isFull ? "Fully paid — will be marked as" : `Partial — ₹${formatCurrency(remaining)} still outstanding`}
              </p>
            </div>
            <StatusBadge status={isFull ? "collected" : "partial"} />
          </div>
        )}

        {/* ── PROMISE SECTION — only shows for partial ── */}
        {isPartial && (
          <div className="border border-amber-200 bg-accent-amberLight rounded-xl p-4 space-y-4">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-accent-amber" />
              <p className="text-sm font-semibold text-amber-800">Payment Promise for Remaining {formatCurrency(remaining)}</p>
            </div>
            <p className="text-xs text-amber-700">
              When has the party promised to pay the remaining amount? This will appear on the renewal calendar on that date.
            </p>

            <Input
              label="Promised Payment Date *"
              type="date"
              value={promiseDate}
              onChange={(e) => setPromiseDate(e.target.value)}
              hint="This date will show on the calendar as a payment promise"
            />

            <Input
              label="Promise Notes (optional)"
              placeholder="e.g. Cheque on 15th, online transfer promised"
              value={promiseNotes}
              onChange={(e) => setPromiseNotes(e.target.value)}
              leftIcon={<FileText className="w-3.5 h-3.5" />}
            />

            {promiseDate && (
              <div className="flex items-start gap-2 px-3 py-2.5 bg-white border border-amber-200 rounded-lg">
                <AlertCircle className="w-3.5 h-3.5 text-accent-amber mt-0.5 flex-shrink-0" />
                <p className="text-xs text-amber-700">
                  <span className="font-semibold">{formatCurrency(remaining)}</span> from{" "}
                  <span className="font-semibold">{contract.clientName}</span> will appear on the calendar on{" "}
                  <span className="font-semibold">{new Date(promiseDate).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</span>
                </p>
              </div>
            )}

            {!promiseDate && (
              <p className="text-xs text-amber-600 italic">
                ⚠ No promise date set — the remaining amount won't show on the calendar
              </p>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}