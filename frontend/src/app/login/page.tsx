"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-context";
import { apiFetch } from "@/lib/api";
import { TrendingUp, Mail, Lock, Eye, EyeOff, AlertCircle, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

type Stage = "form" | "welcome" | "preparing";

export default function LoginPage() {
  const { login, user, isLoading: authLoading } = useAuth();
  const router    = useRouter();
  const qc        = useQueryClient();

  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [showPw,   setShowPw]   = useState(false);
  const [error,    setError]    = useState("");
  const [loading,  setLoading]  = useState(false);
  const [stage,    setStage]    = useState<Stage>("form");

  // If someone with an existing valid session lands directly on /login
  // (e.g. browser back button), send them straight to the dashboard —
  // this only fires on mount/session-check, never mid-animation, since
  // `stage` stays "form" the whole time in that scenario.
  useEffect(() => {
    if (!authLoading && user && stage === "form") {
      router.replace("/dashboard");
    }
  }, [authLoading, user, stage, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password) { setError("Please enter both email and password."); return; }
    setError(""); setLoading(true);

    const result = await login(email, password);
    setLoading(false);

    if (!result.success) {
      setError(result.error ?? "Login failed.");
      return;
    }

    // ── Welcome stage ──────────────────────────────────────────────────────
    setStage("welcome");
    await wait(1100);

    // ── Preparing stage — warm the dashboard's cache for real ─────────────
    setStage("preparing");
    await Promise.all([
      prefetchContracts(qc),
      prefetchDashboardStats(qc),
      wait(900), // floor, so the animation never feels like a flicker on fast connections
    ]);

    router.replace("/dashboard");
  }

  if (stage !== "form") {
    return <PostLoginOverlay stage={stage} name={user?.name} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-accent-light flex items-center justify-center p-4 relative overflow-hidden">
      {/* Ambient background accents */}
      <div className="absolute -top-32 -right-32 w-96 h-96 bg-accent/[0.06] rounded-full blur-3xl" />
      <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-accent-purple/[0.05] rounded-full blur-3xl" />
      <div className="absolute inset-0 bg-grid-pattern bg-grid opacity-[0.4] [mask-image:radial-gradient(ellipse_60%_60%_at_50%_0%,#000_10%,transparent_70%)]" />

      <div className="w-full max-w-sm relative animate-slide-up">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-accent to-accent-purple flex items-center justify-center shadow-lg shadow-accent/20 mb-4 rotate-3">
            <TrendingUp className="w-7 h-7 text-white -rotate-3" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800 tracking-tight">ZribbleOS</h1>
          <p className="text-sm text-slate-400 mt-1">Sales Pipeline</p>
        </div>

        {/* Card */}
        <div className="bg-white/90 backdrop-blur-sm border border-slate-200/80 rounded-2xl p-7 shadow-xl shadow-slate-200/50">
          <h2 className="text-base font-semibold text-slate-700 mb-1">Welcome back</h2>
          <p className="text-xs text-slate-400 mb-6">Sign in to continue to your dashboard</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div>
              <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@zribble.com" autoComplete="email" autoFocus
                  className="w-full pl-9 pr-3 py-2.5 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/10 text-slate-700 placeholder:text-slate-300 transition-shadow"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type={showPw ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••" autoComplete="current-password"
                  className="w-full pl-9 pr-10 py-2.5 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/10 text-slate-700 placeholder:text-slate-300 transition-shadow"
                />
                <button type="button" onClick={() => setShowPw((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors">
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-center gap-2 px-3 py-2.5 bg-accent-redLight border border-red-200 rounded-xl animate-fade-in">
                <AlertCircle className="w-4 h-4 text-accent-red flex-shrink-0" />
                <p className="text-xs text-accent-red">{error}</p>
              </div>
            )}

            {/* Submit */}
            <button type="submit" disabled={loading}
              className={cn(
                "w-full py-2.5 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2",
                loading
                  ? "bg-accent/60 text-white cursor-not-allowed"
                  : "bg-accent text-white hover:bg-accent-hover shadow-sm hover:shadow-md hover:-translate-y-0.5"
              )}>
              {loading && <span className="w-3.5 h-3.5 rounded-full border-2 border-white/40 border-t-white animate-spin" />}
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </form>
        </div>

        <p className="text-center text-[11px] text-slate-400 mt-6">
          Internal tool — Zribble team access only
        </p>
      </div>
    </div>
  );
}

// ─── Post-login overlay: welcome message → data setup ──────────────────────────
function PostLoginOverlay({ stage, name }: { stage: Stage; name?: string }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-accent-light flex items-center justify-center p-4">
      <div className="flex flex-col items-center text-center max-w-xs">
        {stage === "welcome" ? (
          <>
            <div className="w-16 h-16 rounded-full bg-accent-greenLight flex items-center justify-center mb-5 animate-scale-in">
              <CheckCircle2 className="w-9 h-9 text-accent-green" />
            </div>
            <h2 className="text-xl font-bold text-slate-800 animate-fade-in">
              Welcome back{name ? `, ${name}` : ""}
            </h2>
            <p className="text-sm text-slate-400 mt-1.5 animate-fade-in">Signed in successfully</p>
          </>
        ) : (
          <>
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-accent to-accent-purple flex items-center justify-center shadow-lg shadow-accent/20 mb-5 relative">
              <TrendingUp className="w-7 h-7 text-white" />
              <span className="absolute -inset-1.5 rounded-2xl border-2 border-accent/30 border-t-accent animate-spin" />
            </div>
            <h2 className="text-base font-semibold text-slate-700 animate-fade-in">Setting up your workspace</h2>
            <p className="text-sm text-slate-400 mt-1.5 animate-fade-in">Fetching contracts, renewals, and stats…</p>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Pre-warms the ["contracts"] query key so the dashboard renders instantly on arrival. */
async function prefetchContracts(qc: ReturnType<typeof useQueryClient>) {
  try {
    await qc.prefetchQuery({
      queryKey: ["contracts"],
      queryFn: async () => {
        const data = await apiFetch<any[]>("/contracts");
        return data.map((c) => ({
          ...c,
          renewalSchedule: (c.renewalMonths ?? []).map((r: any) => ({
            contractId: c.id,
            year: r.year,
            month: r.month,
            amount: r.overriddenAmount ?? r.amount,
            status: r.status,
            payments: (c.payments ?? []).filter(
              (p: any) => p.renewalYear === r.year && p.renewalMonth === r.month
            ),
          })),
        }));
      },
    });
  } catch {
    // Non-fatal — the dashboard will simply fetch normally if this fails.
  }
}

/** Pre-warms the ["dashboard"] query key (matches useDashboardStats' key in lib/api.ts). */
async function prefetchDashboardStats(qc: ReturnType<typeof useQueryClient>) {
  try {
    await qc.prefetchQuery({
      queryKey: ["dashboard"],
      queryFn: () => apiFetch("/dashboard/stats"),
    });
  } catch {
    // Non-fatal — same reasoning as above.
  }
}