"use client";
import { useState, useMemo } from "react";
import { PageWrapper } from "@/components/layout/PageWrapper";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/Badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { formatCurrency, getMonthShort, SALESPERSON_COLORS } from "@/lib/utils";
import { NewContractForm, GSTStatus, OnboardingPayment } from "@/types";
import { useClient } from "@/lib/client-context";
import { cn } from "@/lib/utils";
import {
  User, Package, FileText, IndianRupee, CalendarDays,
  CheckCircle2, ChevronRight, AlertCircle, Sparkles,
  RefreshCw, ShieldCheck,
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
  { id: 1, label: "Client Info",    icon: User        },
  { id: 2, label: "Contract",       icon: Package     },
  { id: 3, label: "Financials",     icon: IndianRupee },
  { id: 4, label: "Review",         icon: CheckCircle2},
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
    schedule.push({
      year: current.getFullYear(),
      month: current.getMonth() + 1,
      amount: dealValue,
    });
    current.setMonth(current.getMonth() + termMonths);
  }
  return schedule;
}

// ─── Default form state ───────────────────────────────────────────────────────
const DEFAULT_FORM: NewContractForm = {
  salesperson:        "Aftab",
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

// Separate notes state (not part of contract form, stored in ClientContext)


// ─── Validation ───────────────────────────────────────────────────────────────
function validate(form: NewContractForm, step: number): Record<string, string> {
  const errors: Record<string, string> = {};
  if (step >= 1) {
    if (!form.clientName.trim()) errors.clientName = "Client name is required";
    if (!form.salesperson)       errors.salesperson = "Select a salesperson";
    if (!form.accountManager)    errors.accountManager = "Select an account manager";
  }
  if (step >= 2) {
    if (!form.product)                                    errors.product = "Select a product";
    if (!form.profiles || form.profiles < 1)              errors.profiles = "Minimum 1 profile";
    if (!form.contractTermMonths || form.contractTermMonths < 1) errors.contractTermMonths = "Select contract term";
  }
  if (step >= 3) {
    if (!form.dealValue || form.dealValue <= 0) errors.dealValue = "Enter a valid deal value";
    if (!form.firstRenewalDate)                 errors.firstRenewalDate = "Select first renewal date";
  }
  return errors;
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function NewEntryPage() {
  const [step,      setStep]      = useState(1);
  const [form,      setForm]      = useState<NewContractForm>(DEFAULT_FORM);
  const [errors,    setErrors]    = useState<Record<string, string>>({});
  const [submitted,    setSubmitted]    = useState(false);
  const [loading,      setLoading]      = useState(false);
  const [isCustomTerm, setIsCustomTerm] = useState(false);
  const [customTerm,   setCustomTerm]   = useState("");
  const [initialNote,       setInitialNote]       = useState("");
  const [onboardingStatus,  setOnboardingStatus]  = useState<"collected"|"partial"|"not_collected">("collected");
  const [onboardingAmount,  setOnboardingAmount]  = useState("");
  const [onboardingDate,    setOnboardingDate]    = useState(new Date().toISOString().split("T")[0]);
  const [onboardingNotes,   setOnboardingNotes]   = useState("");

  const { addOnboardingPayment, addNote: addClientNote } = useClient();

  const renewalPreview = useMemo(
    () => calcRenewalSchedule(form.firstRenewalDate, form.dealValue, form.contractTermMonths),
    [form.firstRenewalDate, form.dealValue, form.contractTermMonths]
  );

  const totalPipeline = renewalPreview.reduce((a, r) => a + r.amount, 0);

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
    await new Promise((r) => setTimeout(r, 1000));

    // Save onboarding payment to context
    if (onboardingStatus !== "not_collected" && onboardingAmount) {
      addOnboardingPayment({
        contractId:      `c-new-${Date.now()}`,
        clientName:      form.clientName,
        salesperson:     form.salesperson,
        status:          onboardingStatus,
        amountCollected: Number(onboardingAmount),
        paidOn:          onboardingDate,
        notes:           onboardingNotes || undefined,
      });
    }

    // Save initial note if provided
    if (initialNote.trim()) {
      addClientNote({
        id:          `note-${Date.now()}`,
        clientName:  form.clientName,
        text:        initialNote.trim(),
        createdAt:   new Date().toISOString(),
        createdBy:   "Management",
      });
    }

    setLoading(false);
    setSubmitted(true);
  }

  function reset() {
    setForm(DEFAULT_FORM);
    setStep(1);
    setErrors({});
    setSubmitted(false);
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
            const done    = step > s.id;
            const active  = step === s.id;
            const Icon    = s.icon;
            return (
              <div key={s.id} className="flex items-center flex-1 last:flex-none">
                <div className="flex flex-col items-center gap-1.5">
                  <div
                    className={cn(
                      "w-9 h-9 rounded-full flex items-center justify-center border-2 transition-all duration-300",
                      done   ? "bg-accent-green border-accent-green"     :
                      active ? "border-accent-blue bg-accent-blue/10"    :
                               "border-surface-border bg-surface-elevated"
                    )}
                  >
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
                <CardTitle>
                  Step {step} — {STEPS[step - 1].label}
                </CardTitle>
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

                    {/* Initial note */}
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
                            <div className="relative">
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
                                  if (!isNaN(n) && n >= 1 && n <= 36) {
                                    update("contractTermMonths", n);
                                  }
                                }}
                                className="w-full px-3 py-2 h-9 text-sm bg-white border border-accent rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/20 text-slate-700 placeholder:text-slate-400"
                              />
                            </div>
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

                    {/* Live preview */}
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
                        {/* Mini timeline dots */}
                        <div className="flex flex-wrap gap-1.5 mt-1">
                          {renewalPreview.slice(0, 12).map((r, i) => (
                            <div
                              key={i}
                              className="px-2 py-0.5 rounded text-[10px] bg-navy-800 text-gray-500 border border-surface-border"
                            >
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
                  </>
                )}

                {/* ── Step 4: Review ── */}
                {step === 4 && (
                  <div className="space-y-4">
                    {/* Summary card */}
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
                        ["Onboarding Pmt", onboardingStatus === "not_collected" ? "Not collected" : onboardingStatus === "partial" ? `Partial — ₹${onboardingAmount} of ₹${form.dealValue}` : `Collected — ₹${onboardingAmount || form.dealValue}`],
                      ].map(([label, value]) => (
                        <div key={label} className="flex items-center justify-between text-xs">
                          <span className="text-gray-500">{label}</span>
                          <span className={cn(
                            "font-medium",
                            label === "Total Pipeline" ? "text-accent-green" : "text-gray-300"
                          )}>
                            {value}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* GST notice */}
                    {form.gstStatus === "Y" && (
                      <div className="flex items-start gap-2.5 px-3 py-2.5 rounded-lg bg-accent-cyan/5 border border-accent-cyan/20">
                        <ShieldCheck className="w-3.5 h-3.5 text-accent-cyan mt-0.5 flex-shrink-0" />
                        <p className="text-xs text-accent-cyan/80">
                          GST-registered client. Invoices will include 18% GST.
                          Effective per renewal: <span className="font-semibold">{formatCurrency(Math.round(form.dealValue * 1.18))}</span>
                        </p>
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

                {/* Navigation buttons */}
                <div className="flex items-center justify-between pt-2 border-t border-surface-border">
                  <Button
                    variant="ghost"
                    onClick={prevStep}
                    disabled={step === 1}
                  >
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
            {/* Contract summary (live) */}
            <Card>
              <CardHeader>
                <CardTitle>Live Preview</CardTitle>
                <p className="text-xs text-gray-500 mt-0.5">Updates as you fill the form</p>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Client name */}
                <div>
                  <p className="text-[10px] text-gray-600 uppercase tracking-wide mb-1">Client</p>
                  <p className="text-sm font-semibold text-gray-200">
                    {form.clientName || <span className="text-gray-600 font-normal">Not entered</span>}
                  </p>
                </div>

                {/* Exec + AM */}
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

                {/* Product */}
                <div>
                  <p className="text-[10px] text-gray-600 uppercase tracking-wide mb-1">Product</p>
                  <span className="text-xs px-2 py-0.5 rounded bg-surface-elevated text-gray-400 border border-surface-border">
                    {form.product}
                  </span>
                </div>

                {/* Financial */}
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
                  <div className="flex justify-between text-xs pt-1 border-t border-surface-border">
                    <span className="text-gray-500 font-medium">Total Pipeline</span>
                    <span className="font-bold text-accent-green">
                      {totalPipeline > 0 ? formatCurrency(totalPipeline) : "—"}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Renewal preview card */}
            {renewalPreview.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Renewal Schedule</CardTitle>
                  <p className="text-xs text-gray-500 mt-0.5">{renewalPreview.length} entries</p>
                </CardHeader>
                <CardContent className="max-h-64 overflow-y-auto space-y-1.5 pr-1">
                  {renewalPreview.map((r, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between px-3 py-2 rounded-lg bg-surface-elevated border border-surface-border text-xs"
                    >
                      <span className="text-gray-400">
                        {getMonthShort(r.month)} {r.year}
                      </span>
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