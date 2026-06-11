"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { TrendingUp, Mail, Lock, Eye, EyeOff, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export default function LoginPage() {
  const { login } = useAuth();
  const router    = useRouter();

  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [showPw,   setShowPw]   = useState(false);
  const [error,    setError]    = useState("");
  const [loading,  setLoading]  = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password) { setError("Please enter both email and password."); return; }
    setError(""); setLoading(true);
    const result = await login(email, password);
    setLoading(false);
    if (result.success) router.replace("/dashboard");
    else setError(result.error ?? "Login failed.");
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 rounded-2xl bg-accent flex items-center justify-center shadow-lg mb-3">
            <TrendingUp className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-xl font-bold text-slate-800">ZribbleOS</h1>
          <p className="text-sm text-slate-400 mt-0.5">Sales Pipeline</p>
        </div>

        {/* Card */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-card">
          <h2 className="text-base font-semibold text-slate-700 mb-1">Sign in</h2>
          <p className="text-xs text-slate-400 mb-5">Enter your credentials to continue</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div>
              <label className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide block mb-1.5">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@zribble.com" autoComplete="email" autoFocus
                  className="w-full pl-9 pr-3 py-2.5 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/10 text-slate-700 placeholder:text-slate-300"
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
                  className="w-full pl-9 pr-10 py-2.5 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/10 text-slate-700 placeholder:text-slate-300"
                />
                <button type="button" onClick={() => setShowPw((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors">
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="flex items-center gap-2 px-3 py-2.5 bg-accent-redLight border border-red-200 rounded-xl">
                <AlertCircle className="w-4 h-4 text-accent-red flex-shrink-0" />
                <p className="text-xs text-accent-red">{error}</p>
              </div>
            )}

            {/* Submit */}
            <button type="submit" disabled={loading}
              className={cn(
                "w-full py-2.5 rounded-xl text-sm font-semibold transition-all",
                loading
                  ? "bg-accent/60 text-white cursor-not-allowed"
                  : "bg-accent text-white hover:bg-accent-hover shadow-sm hover:shadow-md"
              )}>
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </form>

          {/* Demo hint */}
          <div className="mt-5 pt-4 border-t border-slate-100">
            <p className="text-[11px] text-slate-400 text-center mb-2">Demo credentials</p>
            <div className="space-y-1 text-[11px] text-slate-500">
              <div className="flex justify-between px-2 py-1 bg-slate-50 rounded-lg">
                <span className="text-slate-400">Super Admin</span>
                <span className="font-mono">admin@zribble.com / admin123</span>
              </div>
              <div className="flex justify-between px-2 py-1 bg-slate-50 rounded-lg">
                <span className="text-slate-400">Accounts</span>
                <span className="font-mono">accounts@zribble.com / accounts123</span>
              </div>
              <div className="flex justify-between px-2 py-1 bg-slate-50 rounded-lg">
                <span className="text-slate-400">Executive</span>
                <span className="font-mono">aftab@zribble.com / aftab123</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}