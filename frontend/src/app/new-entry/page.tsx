"use client";
import { useState, useMemo } from "react";
import { PageWrapper } from "@/components/layout/PageWrapper";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/Badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { formatCurrency, getMonthShort, SALESPERSON_COLORS } from "@/lib/utils";
import { NewContractForm, GSTStatus } from "@/types";
import { useClient } from "@/lib/client-context";
import { useAuth } from "@/lib/auth-context";
import { useCreateContract } from "@/lib/api";
import { cn } from "@/lib/utils";
import {
  User, Package, FileText, IndianRupee, CalendarDays,
  CheckCircle2, ChevronRight, AlertCircle, Sparkles,
  RefreshCw, ShieldCheck, Clock,
} from "lucide-react";

// ─── Options ─────────────────────────────────────────────────────────────────
const SALESPERSON_OPTS = [
  { value: "Aftab",   label: "Aftab"   },
  { value: "Sarvesh", label: "Sarvesh" },
  { value: "Firoz",   label: "Firoz"   },
  { value: "Idris",   label: "Idris"   },
  { value: "Prajay",  label: "Prajay"  },
  { value: "Vinay",   label: "Vinay"   },
];

const PRODUCT_OPTS = [
  { value: "DM Single",            label: "DM Single"            },
  { value: "GMB Single",           label: "GMB Single"           },
  { value: "SMM Single",           label: "SMM Single"           },
  { value: "DM + GMB",             label: "DM + GMB"             },
  { value: "DM + SMM",             label: "DM + SMM"             },
  { value: "GMB + SMM",            label: "GMB + SMM"            },
  { value: "GMB + SEO",            label: "GMB + SEO"            },
  { value: "DM + GMB + SMM",       label: "DM + GMB + SMM"       },
  { value: "GMB + SMM + SEO",      label: "GMB + SMM + SEO"      },
  { value: "DM + GMB + SMM + SEO", label: "DM + GMB + SMM + SEO" },
];

const AM_OPTS = [
  { value: "Gaurav",   label: "Gaurav"   },
  { value: "Gunjan",   label: "Gunjan"   },
  { value: "Hitesh",   label: "Hitesh"   },
  { value: "Jenil",    label: "Jenil"    },
  { value: "Kshitiz",  label: "Kshitiz"  },
  { value: "Khushi",   label: "Khushi"   },
  { value: "Kritika",  label: "Kritika"  },
  { value: "Hamza",    label: "Hamza"    },
  { value: "Rayyan",   label: "Rayyan"   },
  { value: "Khasim",   label: "Khasim"   },
  { value: "Danish",   label: "Danish"   },
  { value: "Danish S", label: "Danish S" },
  { value: "Saanya",   label: "Saanya"   },
  { value: "Latika",   label: "Latika"   },
  { value: "Chetan",   label: "Chetan"   },
];

const TERM_OPTS = [
  ...[1,2,3,4,5,6,7,8,9,10,11,12,14,15,18,24].map((n) => ({
    value: String(n),
    label: `${n} month${n > 1 ? "s" : ""}`,
  })),
  { value: "custom", label: "Custom (enter below)..." },
];

const GST_OPTS = [
  { value: "N", label: "Not Registered" },
  { value: "Y", label: "GST Registered" },
];

// ─── Steps ───────────────────────────────────────────────────────────────────
const STEPS = [
  { id: 1, label: "Client Info",    icon: User         },
  { id: 2, label: "Contract",       icon: Package      },
  { id: 3, label: "Financials",     icon: IndianRupee  },
  { id: 4, label: "Review",         icon: CheckCircle2 },
];

// ─── Renewal preview calculator ───────────────────────────────────────────────
function calcRenewalSchedule(
  firstRenewalDate: string,
  dealValue: number,
  termMonths: number
): { year: number; month: number; amount: number }[] {
  if (!firstRenewalDate || !dealValue || !termMonths) return [];
  const start = new Date(firstRenewalDate);
  if (isNaN(start.getTime())) return [];
  const schedule: { year: number; month: number; amount: number }[] = [];
  const endDate = new Date("2028-12-31");
  let current = new Date(start);
  while (current <= endDate) {
    schedule.push({ year: current.getFullYear(), month: current.getMonth() + 1, amount: dealValue });
    current.setMonth(current.getMonth() + termMonths);
  }
  return schedule;
}

// ─── Default form state ───────────────────────────────────────────────────────
function getDefaultForm(salesperson: string): NewContractForm {
  return {
    salesperson:        salesperson as NewContractForm["salesperson"],
    clientName:         "",
    product:            "DM Single",
    accountManager:     "Gaurav",
    contractId:         "",
    profiles:           1,
    gstStatus:          "N",
    dealValue:          0,
    contractTermMonths: 3,
    firstRenewalDate:   "",
  };
}

// ─── Validation ───────────────────────────────────────────────────────────────
function validate(form: NewContractForm, step: number): Record<string, string> {
  const errors: Record<string, string> = {};
  if (step >= 1) {
    if (!form.clientName.trim()) errors.clientName = "Client name is required";
    if (!form.salesperson)       errors.salesperson = "Select a salesperson";
    if (!form.accountManager)    errors.accountManager = "Select an account manager";
  }
  if (step >= 2) {
    if (!form.product)                                               errors.product = "Select a product";
    if (!form.profiles || form.profiles < 1)                         errors.profiles = "Minimum 1 profile";
    if (!form.contractTermMonths || form.contractTermMonths < 1)     errors.contractTermMonths = "Select contract term";
  }
  if (step >= 3) {
    if (!form.dealValue || form.dealValue <= 0) errors.dealValue = "Enter a valid deal value";
    if (!form.firstRenewalDate)                 errors.firstRenewalDate = "Select first renewal date";
  }
  return errors;
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function NewEntryPage() {
  const { user, canPerform } = useAuth();

  // ── Permission gate — only view_edit employees and super_admin can add clients ──
  if (!canPerform("add_client")) {
    return (
      <PageWrapper>
        <div className="max-w-lg mx-auto mt-20 text-center">
          <div className="w-14 h-14 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center mx-auto mb-4">
            <ShieldCheck className="w-7 h-7 text-slate-400" />
          </div>
          <h2 className="text-base font-semibold text-slate-700 mb-1">Access Restricted</h2>
          <p className="text-sm text-slate-400">You don&apos;t have permission to add new contracts.</p>
        </div>
      </PageWrapper>
    );
  }

  const [step,         setStep]         = useState(1);
  const [form,         setForm]         = useState<NewContractForm>(() =>
    getDefaultForm(user?.role === "employee" && user?.salesperson ? user.salesperson : "Aftab")
  );
  const [errors,       setErrors]       = useState<Record<string, string>>({});
  const [submitted,    setSubmitted]    = useState(false);
  const [loading,      setLoading]      = useState(false);
  const [isCustomTerm, setIsCustomTerm] = useState(false);
  const [customTerm,   setCustomTerm]   = useState("");

  // Step 1
  const [initialNote, setInitialNote] = useState("");

  // Step 3 — onboarding payment
  const [onboardingStatus,  setOnboardingStatus]  = useState<"collected"|"partial"|"not_collected">("collected");
  const [onboardingAmount,  setOnboardingAmount]  = useState("");
  const [onboardingDate,    setOnboardingDate]    = useState(new Date().toISOString().split("T")[0]);
  const [onboardingNotes,   setOnboardingNotes]   = useState("");

  // Step 3 — promises for remaining (only when partial) — supports multiple rows
  interface PromiseRow { date: string; amount: string; notes: string; }
  const [promiseRows, setPromiseRows] = useState<PromiseRow[]>([{ date: "", amount: "", notes: "" }]);

function updatePromiseRow(idx: number, field: keyof PromiseRow, value: string) {
  setPromiseRows((prev) => prev.map((row, i) => i === idx ? { ...row, [field]: value } : row));
}

  const { addOnboardingPayment, addNote: addClientNote, addPromise } = useClient();

  // Use mutateAsync directly so we can await the real server-assigned contract ID
  // before creating the dependent onboarding/promise/note records.
  const createContractMutation = useCreateContract();

  const renewalPreview = useMemo(
    () => calcRenewalSchedule(form.firstRenewalDate, form.dealValue, form.contractTermMonths),
    [form.firstRenewalDate, form.dealValue, form.contractTermMonths]
  );
  const totalPipeline = renewalPreview.reduce((a, r) => a + r.amount, 0);

  // Derived onboarding values
  const paidAmount      = Number(onboardingAmount) || 0;
  const remainingAmount = form.dealValue > 0 ? Math.max(form.dealValue - paidAmount, 0) : 0;
  const isPartial       = onboardingStatus === "partial" && paidAmount > 0 && remainingAmount > 0;

  function update<K extends keyof NewContractForm>(key: K, value: NewContractForm[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => { const e = { ...prev }; delete e[key]; return e; });
  }

  function nextStep() {
    const errs = validate(form, step);
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({});
    setStep((s) => Math.min(s + 1, 4));
  }
  function prevStep() { setStep((s) => Math.max(s - 1, 1)); }

  async function handleSubmit() {
    const errs = validate(form, 4);
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setLoading(true);

    try {
      // 1. Create the contract first and await the real server-assigned ID.
      //    The backend enforces the employee's own salesperson name server-side,
      //    so whatever is in form.salesperson is used for admins; employees are
      //    overridden by the backend regardless.
      const created = await createContractMutation.mutateAsync({
        salesperson:        form.salesperson,
        clientName:         form.clientName,
        product:            form.product,
        accountManager:     form.accountManager,
        contractId:         form.contractId || undefined,
        profiles:           form.profiles,
        gstStatus:          form.gstStatus,
        dealValue:          form.dealValue,
        contractTermMonths: form.contractTermMonths,
        firstRenewalDate:   form.firstRenewalDate,
        renewalSchedule:    renewalPreview,
      });

      const realContractId = created.id;

      // 2. Save onboarding payment against the real contract ID.
      if (onboardingStatus !== "not_collected" && paidAmount > 0) {
        addOnboardingPayment({
          contractId:      realContractId,
          clientName:      form.clientName,
          salesperson:     form.salesperson,
          status:          onboardingStatus,
          amountCollected: paidAmount,
          paidOn:          onboardingDate,
          notes:           onboardingNotes || undefined,
        });
      }

      // 3. Save promise if partial payment and promise date given.
      
      if (isPartial) {
        promiseRows
          .filter((r) => r.date)
          .forEach((r, idx) => {
            addPromise({
              id:             `p-onboard-${Date.now()}-${idx}`,
              contractId:     realContractId,
              clientName:     form.clientName,
              salesperson:    form.salesperson,
              renewalYear:    new Date(onboardingDate).getFullYear(),
              renewalMonth:   new Date(onboardingDate).getMonth() + 1,
              paidAmount,
              remainingAmount: Number(r.amount) || 0,
              promisedDate:   r.date,
              notes:          r.notes || `Onboarding balance of ${formatCurrency(remainingAmount)}`,
              createdAt:      new Date().toISOString(),
            });
          });
      }

      // 4. Save initial note.
      if (initialNote.trim()) {
        addClientNote({
          id:        `note-${Date.now()}`,
          clientName: form.clientName,
          text:       initialNote.trim(),
          createdAt:  new Date().toISOString(),
          createdBy:  user?.name ?? "Management",
        });
      }

      setSubmitted(true);
    } catch (err) {
      console.error("Failed to create contract:", err);
      setErrors({ submit: "Failed to create contract. Please try again." });
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    setForm(getDefaultForm(user?.role === "employee" && user?.salesperson ? user.salesperson : "Aftab"));
    setStep(1);
    setErrors({});
    setSubmitted(false);
    setInitialNote("");
    setOnboardingStatus("collected");
    setOnboardingAmount("");
    setOnboardingDate(new Date().toISOString().split("T")[0]);
    setOnboardingNotes("");
    setPromiseRows([{ date: "", amount: "", notes: "" }]);
  }

  const color = SALESPERSON_COLORS[form.salesperson] ?? "#3B82F6";

  // ─── Success screen ──────────────────────────────────────────────────────
  if (submitted) {
    return (
      <PageWrapper>
        <div className="max-w-lg mx-auto mt-16 text-center">
          <div className="w-16 h-16 rounded-full bg-accent-green/10 border border-accent-green/20 flex items-center justify-center mx-auto mb-5">
            <CheckCircle2 className="w-8 h-8 text-accent-green" />
          </div>
          <h2 className="text-xl font-bold text-gray-100 mb-2">Contract Created!</h2>
          <p className="text-sm text-gray-500 mb-2">
            <span className="font-semibold text-gray-300">{form.clientName}</span> has been added
            under <span className="font-semibold text-gray-300">{form.salesperson}</span>.
          </p>
          {isPartial && promiseRows.some((r) => r.date) && (
            <p className="text-xs text-amber-400 mb-2">
              {promiseRows.filter((r) => r.date).length} promise{promiseRows.filter((r) => r.date).length > 1 ? "s" : ""} recorded for the remaining {formatCurrency(remainingAmount)}
            </p>
          )}
          <p className="text-xs text-gray-600 mb-8">
            {renewalPreview.length} renewal months · {formatCurrency(totalPipeline)} total pipeline
          </p>
          <div className="flex gap-3 justify-center">
            <Button variant="secondary" onClick={reset}>
              <RefreshCw className="w-3.5 h-3.5" /> Add Another
            </Button>
            <Button variant="primary" onClick={() => window.location.href = "/clients"}>
              View Clients <ChevronRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-7">
          <h2 className="text-lg font-semibold text-gray-100">New Contract Entry</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Add a new client contract — renewal schedule auto-calculated from your inputs.
          </p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-0 mb-8">
          {STEPS.map((s, i) => {
            const done   = step > s.id;
            const active = step === s.id;
            const Icon   = s.icon;
            return (
              <div key={s.id} className="flex items-center flex-1 last:flex-none">
                <div className="flex flex-col items-center gap-1.5">
                  <div className={cn(
                    "w-9 h-9 rounded-full flex items-center justify-center border-2 transition-all duration-300",
                    done   ? "bg-accent-green border-accent-green"  :
                    active ? "border-accent-blue bg-accent-blue/10" :
                             "border-surface-border bg-surface-elevated"
                  )}>
                    {done
                      ? <CheckCircle2 className="w-4 h-4 text-white" />
                      : <Icon className={cn("w-4 h-4", active ? "text-accent-blue" : "text-gray-600")} />
                    }
                  </div>
                  <span className={cn(
                    "text-[10px] font-medium hidden sm:block whitespace-nowrap",
                    active ? "text-accent-blue" : done ? "text-accent-green" : "text-gray-600"
                  )}>
                    {s.label}
                  </span>
                </div>
                {i < STEPS.length - 1 && (
                  <div className={cn(
                    "flex-1 h-0.5 mx-2 mt-[-18px] transition-all duration-300",
                    done ? "bg-accent-green" : "bg-surface-border"
                  )} />
                )}
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Form panel */}
          <div className="xl:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Step {step} — {STEPS[step - 1].label}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">

                {/* ── Step 1: Client Info ── */}
                {step === 1 && (
                  <>
                    <Input
                      label="Client Name *"
                      placeholder="e.g. Toni & Guy Indiranagar"
                      value={form.clientName}
                      onChange={(e) => update("clientName", e.target.value)}
                      error={errors.clientName}
                      leftIcon={<User className="w-3.5 h-3.5" />}
                    />
                    <Select
                    label="Salesperson *"
                    options={SALESPERSON_OPTS}
                    value={form.salesperson}
                    onChange={(e) => update("salesperson", e.target.value as NewContractForm["salesperson"])}
                    error={errors.salesperson}
                    disabled={user?.role === "employee"}
                    />
                    <Select
                      label="Account Manager *"
                      options={AM_OPTS}
                      value={form.accountManager}
                      onChange={(e) => update("accountManager", e.target.value)}
                      error={errors.accountManager}
                    />
                    <Input
                      label="Contract ID (optional)"
                      placeholder="e.g. 14700"
                      value={form.contractId ?? ""}
                      onChange={(e) => update("contractId", e.target.value)}
                      leftIcon={<FileText className="w-3.5 h-3.5" />}
                    />
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-medium text-slate-600 uppercase tracking-wide">
                        Notes (optional)
                      </label>
                      <textarea
                        rows={3}
                        placeholder="Any notes about this client — source of lead, special terms, first meeting context..."
                        value={initialNote}
                        onChange={(e) => setInitialNote(e.target.value)}
                        className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/10 text-slate-700 placeholder:text-slate-400 resize-none"
                      />
                      <p className="text-xs text-slate-400">This will appear in the client&apos;s notes log</p>
                    </div>
                  </>
                )}

                {/* ── Step 2: Contract Details ── */}
                {step === 2 && (
                  <>
                    <Select
                      label="Product / Service *"
                      options={PRODUCT_OPTS}
                      value={form.product}
                      onChange={(e) => update("product", e.target.value)}
                      error={errors.product}
                    />
                    <div className="grid grid-cols-2 gap-4">
                      <Input
                        label="Number of Profiles *"
                        type="number"
                        min={1}
                        value={String(form.profiles)}
                        onChange={(e) => update("profiles", Number(e.target.value))}
                        error={errors.profiles}
                      />
                      <div className="flex flex-col gap-1.5">
                        <Select
                          label="Contract Term *"
                          options={TERM_OPTS}
                          value={isCustomTerm ? "custom" : String(form.contractTermMonths)}
                          onChange={(e) => {
                            if (e.target.value === "custom") {
                              setIsCustomTerm(true);
                              setCustomTerm("");
                            } else {
                              setIsCustomTerm(false);
                              update("contractTermMonths", Number(e.target.value));
                            }
                          }}
                          error={!isCustomTerm ? errors.contractTermMonths : undefined}
                        />
                        {isCustomTerm && (
                          <div className="flex flex-col gap-1.5">
                            <input
                              type="number"
                              min={1}
                              max={36}
                              placeholder="Enter months (1–36)"
                              value={customTerm}
                              onChange={(e) => {
                                const val = e.target.value;
                                setCustomTerm(val);
                                const n = parseInt(val);
                                if (!isNaN(n) && n >= 1 && n <= 36) update("contractTermMonths", n);
                              }}
                              className="w-full px-3 py-2 h-9 text-sm bg-white border border-accent rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/20 text-slate-700 placeholder:text-slate-400"
                            />
                            {customTerm && (parseInt(customTerm) < 1 || parseInt(customTerm) > 36) && (
                              <p className="text-xs text-accent-red">Must be between 1 and 36 months</p>
                            )}
                            {customTerm && parseInt(customTerm) >= 1 && parseInt(customTerm) <= 36 && (
                              <p className="text-xs text-accent-green">✓ {customTerm}-month contract selected</p>
                            )}
                            <button
                              onClick={() => { setIsCustomTerm(false); update("contractTermMonths", 3); setCustomTerm(""); }}
                              className="text-xs text-slate-400 hover:text-slate-600 text-left underline"
                            >
                              ← Back to preset options
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                    <Select
                      label="GST Status"
                      options={GST_OPTS}
                      value={form.gstStatus}
                      onChange={(e) => update("gstStatus", e.target.value as GSTStatus)}
                    />
                  </>
                )}

                {/* ── Step 3: Financials ── */}
                {step === 3 && (
                  <>
                    <Input
                      label="Deal Value (₹) *"
                      type="number"
                      min={0}
                      placeholder="e.g. 75000"
                      value={form.dealValue > 0 ? String(form.dealValue) : ""}
                      onChange={(e) => update("dealValue", Number(e.target.value))}
                      error={errors.dealValue}
                      leftIcon={<IndianRupee className="w-3.5 h-3.5" />}
                      hint={
                        form.dealValue > 0
                          ? `${formatCurrency(form.dealValue)} per renewal · GST ${form.gstStatus === "Y" ? `+18% = ${formatCurrency(Math.round(form.dealValue * 1.18))}` : "not applicable"}`
                          : undefined
                      }
                    />
                    <Input
                      label="First Renewal Date *"
                      type="date"
                      value={form.firstRenewalDate}
                      onChange={(e) => update("firstRenewalDate", e.target.value)}
                      error={errors.firstRenewalDate}
                      leftIcon={<CalendarDays className="w-3.5 h-3.5" />}
                      hint="Renewal schedule is auto-calculated from this date"
                    />

                    {/* Live schedule preview */}
                    {renewalPreview.length > 0 && (
                      <div className="mt-2 p-4 rounded-xl border border-surface-border bg-surface-elevated space-y-3">
                        <div className="flex items-center gap-2">
                          <Sparkles className="w-3.5 h-3.5 text-accent-blue" />
                          <p className="text-xs font-semibold text-accent-blue">Auto-calculated Schedule</p>
                        </div>
                        <div className="flex gap-6 text-xs">
                          <div>
                            <p className="text-gray-600">Renewals</p>
                            <p className="font-semibold text-gray-300 mt-0.5">{renewalPreview.length} months</p>
                          </div>
                          <div>
                            <p className="text-gray-600">Per Renewal</p>
                            <p className="font-semibold text-gray-300 mt-0.5">{formatCurrency(form.dealValue)}</p>
                          </div>
                          <div>
                            <p className="text-gray-600">Total Pipeline</p>
                            <p className="font-semibold text-accent-green mt-0.5">{formatCurrency(totalPipeline)}</p>
                          </div>
                        </div>
                        <div className="flex flex-wrap gap-1.5 mt-1">
                          {renewalPreview.slice(0, 12).map((r, i) => (
                            <div key={i} className="px-2 py-0.5 rounded text-[10px] bg-navy-800 text-gray-500 border border-surface-border">
                              {getMonthShort(r.month)} {String(r.year).slice(2)}
                            </div>
                          ))}
                          {renewalPreview.length > 12 && (
                            <div className="px-2 py-0.5 rounded text-[10px] bg-navy-800 text-gray-600 border border-surface-border">
                              +{renewalPreview.length - 12} more
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* ── Onboarding Payment Section ── */}
                    <div className="border border-slate-200 rounded-xl p-4 space-y-4 bg-slate-50">
                      <p className="text-xs font-semibold text-slate-700 uppercase tracking-wide">
                        Signing / Onboarding Payment
                      </p>
                      <p className="text-xs text-slate-500">
                        Record the payment collected at the time of signing. A new client entry is only created when at least some amount is received.
                      </p>

                      {/* Status selector */}
                      <div className="flex gap-2">
                        {(["collected","partial","not_collected"] as const).map((s) => (
                          <button
                            key={s}
                            onClick={() => setOnboardingStatus(s)}
                            className={cn(
                              "flex-1 py-2 rounded-lg text-xs font-medium border transition-all",
                              onboardingStatus === s
                                ? s === "collected"     ? "bg-accent-green text-white border-accent-green"
                                : s === "partial"       ? "bg-accent-amber text-white border-accent-amber"
                                :                         "bg-accent-red text-white border-accent-red"
                                : "bg-white text-slate-500 border-slate-200 hover:border-slate-300"
                            )}
                          >
                            {s === "collected" ? "✓ Fully Collected" : s === "partial" ? "⚡ Partial" : "✗ Not Collected"}
                          </button>
                        ))}
                      </div>

                      {/* Amount + date fields — show for collected and partial */}
                      {onboardingStatus !== "not_collected" && (
                        <>
                          <Input
                            label={onboardingStatus === "partial" ? "Amount Received (₹) *" : "Amount Collected (₹) *"}
                            type="number"
                            min={1}
                            placeholder={form.dealValue > 0 ? `Deal value: ${formatCurrency(form.dealValue)}` : "Enter amount"}
                            value={onboardingAmount}
                            onChange={(e) => setOnboardingAmount(e.target.value)}
                            leftIcon={<IndianRupee className="w-3.5 h-3.5" />}
                          />
                          <Input
                            label="Date of Payment *"
                            type="date"
                            value={onboardingDate}
                            onChange={(e) => setOnboardingDate(e.target.value)}
                          />
                          <Input
                            label="Notes (optional)"
                            placeholder="e.g. Cash received, NEFT ref #12345"
                            value={onboardingNotes}
                            onChange={(e) => setOnboardingNotes(e.target.value)}
                            leftIcon={<FileText className="w-3.5 h-3.5" />}
                          />
                        </>
                      )}

                      {/* Live status preview */}
                      {onboardingStatus !== "not_collected" && paidAmount > 0 && (
                        <div className={cn(
                          "flex items-center justify-between px-4 py-3 rounded-xl border",
                          onboardingStatus === "collected" || remainingAmount === 0
                            ? "bg-accent-greenLight border-emerald-200"
                            : "bg-accent-amberLight border-amber-200"
                        )}>
                          <p className="text-xs font-medium text-slate-600">
                            {remainingAmount === 0
                              ? "Fully paid — will be marked as Collected"
                              : `Partial — ${formatCurrency(remainingAmount)} still outstanding`}
                          </p>
                        </div>
                      )}

                      {/* ── PROMISE SECTION — shows when partial and remaining > 0 ── */}
                      {isPartial && (
                        <div className="border border-amber-200 bg-accent-amberLight rounded-xl p-4 space-y-4">
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4 text-accent-amber" />
                            <p className="text-sm font-semibold text-amber-800">
                              Promises for Remaining {formatCurrency(remainingAmount)}
                            </p>
                          </div>
                          <p className="text-xs text-amber-700">
                            When has the client promised to pay the remaining amount? Split it across multiple dates if needed — each will appear on the renewal calendar.
                          </p>

                          <div className="border border-amber-200 bg-white rounded-xl overflow-hidden">
                            <div className="divide-y divide-amber-100">
                              {promiseRows.map((row, idx) => (
                                <div key={idx} className="p-3 space-y-2">
                                  <div className="flex items-center justify-between">
                                    <span className="text-[10px] font-semibold text-amber-700 uppercase tracking-wide">
                                      Promise {promiseRows.length > 1 ? `#${idx + 1}` : ""}
                                    </span>
                                    {promiseRows.length > 1 && (
                                      <button
                                        type="button"
                                        onClick={() => setPromiseRows((prev) => prev.filter((_, i) => i !== idx))}
                                        className="text-amber-400 hover:text-accent-red transition-colors p-0.5 rounded"
                                      >
                                        ✕
                                      </button>
                                    )}
                                  </div>
                                  <div className="grid grid-cols-2 gap-2">
                                    <Input
                                      label="Promised Date"
                                      type="date"
                                      value={row.date}
                                      onChange={(e) => updatePromiseRow(idx, "date", e.target.value)}
                                    />
                                    <Input
                                      label="Amount (₹)"
                                      type="number"
                                      placeholder="0"
                                      value={row.amount}
                                      onChange={(e) => updatePromiseRow(idx, "amount", e.target.value)}
                                      leftIcon={<IndianRupee className="w-3.5 h-3.5" />}
                                    />
                                  </div>
                                  <Input
                                    label="Note (optional)"
                                    placeholder="e.g. Cheque on 15th, NEFT transfer"
                                    value={row.notes}
                                    onChange={(e) => updatePromiseRow(idx, "notes", e.target.value)}
                                    leftIcon={<FileText className="w-3.5 h-3.5" />}
                                  />
                                  {row.date && (
                                    <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5">
                                      📅 Will appear on renewal calendar on{" "}
                                      <strong>{new Date(row.date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</strong>
                                      {row.amount ? ` · ${formatCurrency(Number(row.amount))}` : ""}
                                    </p>
                                  )}
                                </div>
                              ))}
                            </div>
                            <div className="px-3 py-2.5 bg-amber-100/60 border-t border-amber-200 flex items-center justify-end">
                              <button
                                type="button"
                                onClick={() => setPromiseRows((prev) => [...prev, { date: "", amount: "", notes: "" }])}
                                className="flex items-center gap-1 text-xs font-semibold text-amber-700 hover:text-amber-900 transition-colors"
                              >
                                + Add another date
                              </button>
                            </div>
                          </div>

                          {!promiseRows.some((r) => r.date) && (
                            <p className="text-xs text-amber-600 italic">
                              ⚠ No promise date set — the remaining amount won&apos;t show on the calendar
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </>
                )}

                {/* ── Step 4: Review ── */}
                {step === 4 && (
                  <div className="space-y-4">
                    <div
                      className="rounded-xl border p-4 space-y-3"
                      style={{ borderColor: color + "40", backgroundColor: color + "08" }}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
                        <p className="text-sm font-bold text-gray-200">{form.clientName}</p>
                      </div>
                      {[
                        ["Salesperson",    form.salesperson],
                        ["Account Mgr",    form.accountManager],
                        ["Product",        form.product],
                        ["Contract ID",    form.contractId || "—"],
                        ["Profiles",       String(form.profiles)],
                        ["Term",           `${form.contractTermMonths} month${form.contractTermMonths > 1 ? "s" : ""}`],
                        ["GST",            form.gstStatus === "Y" ? "Registered" : "Not registered"],
                        ["Deal Value",     formatCurrency(form.dealValue)],
                        ["First Renewal",  form.firstRenewalDate],
                        ["Renewals",       `${renewalPreview.length} months`],
                        ["Total Pipeline", formatCurrency(totalPipeline)],
                        ["Onboarding Pmt",
                          onboardingStatus === "not_collected"
                            ? "Not collected"
                            : onboardingStatus === "partial"
                            ? `Partial — ${formatCurrency(paidAmount)} of ${formatCurrency(form.dealValue)}`
                            : `Collected — ${formatCurrency(paidAmount || form.dealValue)}`
                        ],
                        ...(isPartial && promiseRows.some((r) => r.date)
                          ? [["Promise Dates", promiseRows.filter((r) => r.date).map((r) => new Date(r.date).toLocaleDateString("en-IN", { day: "numeric", month: "short" })).join(", ")]]
                          : []
                        ),
                        ...(isPartial && remainingAmount > 0
                          ? [["Remaining", formatCurrency(remainingAmount)]]
                          : []
                        ),
                      ].map(([label, value]) => (
                        <div key={label} className="flex items-center justify-between text-xs">
                          <span className="text-gray-500">{label}</span>
                          <span className={cn(
                            "font-medium",
                            label === "Total Pipeline"  ? "text-accent-green"  :
                            label === "Remaining"       ? "text-accent-amber"  :
                            label === "Promise Date"    ? "text-accent-amber"  :
                            "text-gray-300"
                          )}>
                            {value}
                          </span>
                        </div>
                      ))}
                    </div>

                    {form.gstStatus === "Y" && (
                      <div className="flex items-start gap-2.5 px-3 py-2.5 rounded-lg bg-accent-cyan/5 border border-accent-cyan/20">
                        <ShieldCheck className="w-3.5 h-3.5 text-accent-cyan mt-0.5 flex-shrink-0" />
                        <p className="text-xs text-accent-cyan/80">
                          GST-registered client. Invoices will include 18% GST.
                          Effective per renewal: <span className="font-semibold">{formatCurrency(Math.round(form.dealValue * 1.18))}</span>
                        </p>
                      </div>
                    )}

                    {errors.submit && (
                      <div className="flex items-start gap-2.5 px-3 py-2.5 rounded-lg bg-red-50 border border-red-200">
                        <AlertCircle className="w-3.5 h-3.5 text-red-500 mt-0.5 flex-shrink-0" />
                        <p className="text-xs text-red-600">{errors.submit}</p>
                      </div>
                    )}

                    <div className="flex items-start gap-2.5 px-3 py-2.5 rounded-lg bg-accent-amber/5 border border-accent-amber/20">
                      <AlertCircle className="w-3.5 h-3.5 text-accent-amber mt-0.5 flex-shrink-0" />
                      <p className="text-xs text-accent-amber/80">
                        Please verify all details before submitting. This will create{" "}
                        <span className="font-semibold">{renewalPreview.length} renewal entries</span>{" "}
                        in the system.
                      </p>
                    </div>
                  </div>
                )}

                {/* Navigation */}
                <div className="flex items-center justify-between pt-2 border-t border-surface-border">
                  <Button variant="ghost" onClick={prevStep} disabled={step === 1}>
                    Back
                  </Button>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-600">Step {step} of {STEPS.length}</span>
                    {step < 4 ? (
                      <Button variant="primary" onClick={nextStep}>
                        Continue <ChevronRight className="w-3.5 h-3.5" />
                      </Button>
                    ) : (
                      <Button variant="primary" onClick={handleSubmit} loading={loading}>
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Create Contract
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right panel: live preview */}
          <div className="flex flex-col gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Live Preview</CardTitle>
                <p className="text-xs text-gray-500 mt-0.5">Updates as you fill the form</p>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-[10px] text-gray-600 uppercase tracking-wide mb-1">Client</p>
                  <p className="text-sm font-semibold text-gray-200">
                    {form.clientName || <span className="text-gray-600 font-normal">Not entered</span>}
                  </p>
                </div>
                <div className="flex gap-4">
                  <div>
                    <p className="text-[10px] text-gray-600 uppercase tracking-wide mb-1">Exec</p>
                    <div className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />
                      <p className="text-xs text-gray-300">{form.salesperson}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-600 uppercase tracking-wide mb-1">AM</p>
                    <p className="text-xs text-gray-300">{form.accountManager}</p>
                  </div>
                </div>
                <div>
                  <p className="text-[10px] text-gray-600 uppercase tracking-wide mb-1">Product</p>
                  <span className="text-xs px-2 py-0.5 rounded bg-surface-elevated text-gray-400 border border-surface-border">
                    {form.product}
                  </span>
                </div>
                <div className="pt-2 border-t border-surface-border space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-600">Per Renewal</span>
                    <span className="font-semibold text-gray-300">
                      {form.dealValue > 0 ? formatCurrency(form.dealValue) : "—"}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-600">Term</span>
                    <span className="text-gray-400">{form.contractTermMonths}m</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-600">Renewals</span>
                    <span className="text-gray-400">{renewalPreview.length} months</span>
                  </div>
                  {paidAmount > 0 && (
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-600">Collected Now</span>
                      <span className="font-semibold text-accent-green">{formatCurrency(paidAmount)}</span>
                    </div>
                  )}
                  {isPartial && (
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-600">Remaining</span>
                      <span className="font-semibold text-accent-amber">{formatCurrency(remainingAmount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-xs pt-1 border-t border-surface-border">
                    <span className="text-gray-500 font-medium">Total Pipeline</span>
                    <span className="font-bold text-accent-green">
                      {totalPipeline > 0 ? formatCurrency(totalPipeline) : "—"}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {renewalPreview.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Renewal Schedule</CardTitle>
                  <p className="text-xs text-gray-500 mt-0.5">{renewalPreview.length} entries</p>
                </CardHeader>
                <CardContent className="max-h-64 overflow-y-auto space-y-1.5 pr-1">
                  {renewalPreview.map((r, i) => (
                    <div key={i} className="flex items-center justify-between px-3 py-2 rounded-lg bg-surface-elevated border border-surface-border text-xs">
                      <span className="text-gray-400">{getMonthShort(r.month)} {r.year}</span>
                      <StatusBadge status="pending" size="sm" />
                      <span className="font-semibold text-gray-300">{formatCurrency(r.amount)}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </PageWrapper>
  );
}