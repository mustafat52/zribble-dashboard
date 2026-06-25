"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth, DEMO_USERS, AppUser, UserRole, EmployeeMode } from "@/lib/auth-context";
import { PageWrapper } from "@/components/layout/PageWrapper";
import { formatCurrency, SALESPERSON_COLORS } from "@/lib/utils";
import { cn } from "@/lib/utils";
import {
  Shield, Users, UserPlus, Pencil, Eye, EyeOff,
  CheckCircle2, LogOut, Settings as SettingsIcon,
} from "lucide-react";

const ROLE_LABELS: Record<UserRole, string> = {
  super_admin:   "Super Admin",
  accounts_team: "Accounts Team",
  employee:      "Executive",
};

const ROLE_COLORS: Record<UserRole, string> = {
  super_admin:   "bg-accent-light text-accent border-accent-border",
  accounts_team: "bg-cyan-50 text-accent-cyan border-cyan-200",
  employee:      "bg-slate-100 text-slate-600 border-slate-200",
};

const SALESPEOPLE = ["Aftab","Sarvesh","Firoz","Idris","Prajay","Vinay"];

export default function SettingsPage() {
  const { user, canPerform, logout } = useAuth();
  const router = useRouter();

  if (!canPerform("view_settings")) {
    return (
      <PageWrapper>
        <div className="flex flex-col items-center justify-center h-64 gap-3">
          <Shield className="w-10 h-10 text-slate-300" />
          <p className="text-slate-500 font-medium">Access restricted</p>
          <p className="text-sm text-slate-400">Only Super Admins can view Settings.</p>
        </div>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper>
      <div className="flex flex-col gap-6 max-w-3xl">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
              <SettingsIcon className="w-5 h-5 text-accent" /> Settings
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">Manage users and application preferences</p>
          </div>
          <button onClick={() => { logout(); router.replace("/login"); }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-red-200 text-accent-red bg-accent-redLight text-sm font-medium hover:bg-red-100 transition-all">
            <LogOut className="w-4 h-4" /> Sign Out
          </button>
        </div>

        {/* Logged-in user card */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-card">
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest mb-3">Your Account</p>
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-accent-light flex items-center justify-center">
              <span className="text-base font-bold text-accent">{user?.name[0]}</span>
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-700">{user?.name}</p>
              <p className="text-xs text-slate-400">{user?.email}</p>
            </div>
            <span className={cn("ml-auto text-[11px] font-semibold px-2.5 py-1 rounded-full border", ROLE_COLORS[user?.role ?? "employee"])}>
              {ROLE_LABELS[user?.role ?? "employee"]}
            </span>
          </div>
        </div>

        {/* User list */}
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-card">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-slate-500" />
              <p className="text-sm font-semibold text-slate-700">Team Members</p>
              <span className="text-[11px] font-semibold px-1.5 py-0.5 rounded-full bg-accent-light text-accent border border-accent-border">{DEMO_USERS.length}</span>
            </div>
          </div>

          <div className="divide-y divide-slate-100">
            {DEMO_USERS.map((u) => (
              <div key={u.id} className="flex items-center gap-4 px-5 py-3.5">
                <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold flex-shrink-0",
                  u.role === "super_admin" ? "bg-accent-light text-accent" :
                  u.role === "accounts_team" ? "bg-cyan-50 text-accent-cyan" :
                  "bg-slate-100 text-slate-500")}>
                  {u.name[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-slate-700">{u.name}</p>
                    {u.salesperson && (
                      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: SALESPERSON_COLORS[u.salesperson] }} />
                    )}
                  </div>
                  <p className="text-xs text-slate-400 truncate">{u.email}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {u.mode && (
                    <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full border",
                      u.mode === "view_edit" ? "bg-accent-greenLight text-accent-green border-emerald-200" : "bg-slate-100 text-slate-500 border-slate-200")}>
                      {u.mode === "view_edit" ? "View & Edit" : "View Only"}
                    </span>
                  )}
                  <span className={cn("text-[11px] font-semibold px-2.5 py-1 rounded-full border", ROLE_COLORS[u.role])}>
                    {ROLE_LABELS[u.role]}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="px-5 py-3 bg-slate-50 border-t border-slate-100">
            <p className="text-[11px] text-slate-400">
              User creation and password management will be available when the backend is connected.
            </p>
          </div>
        </div>

        {/* Permissions reference */}
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-card">
          <div className="px-5 py-4 border-b border-slate-100">
            <p className="text-sm font-semibold text-slate-700 flex items-center gap-2"><Shield className="w-4 h-4 text-slate-400"/> Permission Matrix</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="text-left px-5 py-2.5 text-slate-500 font-semibold">Action</th>
                  <th className="text-center px-3 py-2.5 text-slate-500 font-semibold">Super Admin</th>
                  <th className="text-center px-3 py-2.5 text-slate-500 font-semibold">Accounts</th>
                  <th className="text-center px-3 py-2.5 text-slate-500 font-semibold">Exec (View)</th>
                  <th className="text-center px-3 py-2.5 text-slate-500 font-semibold">Exec (Edit)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {[
                  ["See all data",     true,  true,  false, false],
                  ["Record payment",   true,  false, false, true ],
                  ["Add new client",   true,  false, false, true ],
                  ["Edit client",      true,  false, false, true ],
                  ["Stop client",      true,  false, false, true ],
                  ["Export Excel",     true,  false, false, false],
                  ["Settings",         true,  false, false, false],
                ].map(([label, ...vals]) => (
                  <tr key={label as string} className="hover:bg-slate-50/50">
                    <td className="px-5 py-2.5 font-medium text-slate-600">{label as string}</td>
                    {(vals as boolean[]).map((v, i) => (
                      <td key={i} className="text-center px-3 py-2.5">
                        {v
                          ? <CheckCircle2 className="w-4 h-4 text-accent-green mx-auto" />
                          : <span className="text-slate-200 text-base leading-none">—</span>}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </PageWrapper>
  );
}