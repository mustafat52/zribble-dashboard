"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth, AppUser, UserRole, EmployeeMode } from "@/lib/auth-context";
import { PageWrapper } from "@/components/layout/PageWrapper";
import { SALESPERSON_COLORS } from "@/lib/utils";
import { cn } from "@/lib/utils";
import {
  Shield, Users, CheckCircle2, LogOut, Settings as SettingsIcon,
  Plus, Pencil, Trash2, X, Eye, EyeOff,
} from "lucide-react";

const API = process.env.NEXT_PUBLIC_API_URL ?? "";

// ─── Types ────────────────────────────────────────────────────────────────────
interface UserFormData {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  mode: EmployeeMode | "";
  salesperson: string;
}

// ─── Local API helpers (same pattern as lib/api.ts) ──────────────────────────
async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API}${path}`, {
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

function useUsers() {
  return useQuery<AppUser[]>({
    queryKey: ["users"],
    queryFn: () => apiFetch<AppUser[]>("/users"),
    staleTime: 30_000,
  });
}

function useCreateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: UserFormData) =>
      apiFetch<AppUser>("/users", { method: "POST", body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["users"] }),
  });
}

function useUpdateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<UserFormData> }) =>
      apiFetch<AppUser>(`/users/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["users"] }),
  });
}

function useDeleteUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/users/${id}`, { method: "DELETE" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["users"] }),
  });
}

// ─── Constants ────────────────────────────────────────────────────────────────
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

// NOTE: previously a hardcoded SALESPERSON_OPTS = ["Aftab","Sarvesh",...] array
// lived here, which made it impossible to assign a brand-new salesperson name
// to a newly-created employee until that name already existed somewhere else.
// The salesperson field below is now free-text with a <datalist> of existing
// employee names (derived live from the `users` list already loaded on this
// page) for autocomplete/consistency — never blocking, always reflects who's
// actually in the system right now. See UserForm's `existingSalespeople` prop.

const EMPTY_FORM: UserFormData = {
  name: "", email: "", password: "", role: "employee", mode: "view", salesperson: "",
};

// ─── User Form (shared for Add + Edit) ───────────────────────────────────────
interface UserFormProps {
  initial?: Partial<UserFormData>;
  isEdit?: boolean;
  onSave: (data: UserFormData) => void;
  onCancel: () => void;
  error?: string;
  loading?: boolean;
  existingSalespeople: string[];
}

function UserForm({ initial = {}, isEdit, onSave, onCancel, error, loading, existingSalespeople }: UserFormProps) {
  const [form, setForm] = useState<UserFormData>({ ...EMPTY_FORM, ...initial });
  const [showPw, setShowPw] = useState(false);

  function update<K extends keyof UserFormData>(k: K, v: UserFormData[K]) {
    setForm((prev) => ({ ...prev, [k]: v }));
  }

  function handleSubmit() {
    if (!form.name.trim() || !form.email.trim()) return;
    if (!isEdit && !form.password.trim()) return;
    if (form.role === "employee" && !form.mode) return;
    if (form.role === "employee" && !form.salesperson.trim()) return;
    onSave(form);
  }

  const inputCls = "w-full px-3 py-2 h-9 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-accent focus:ring-1 focus:ring-accent/20 text-slate-700 placeholder:text-slate-400";
  const labelCls = "text-[10px] font-semibold text-slate-500 uppercase tracking-wide block mb-1";

  return (
    <div className="border border-accent-border bg-accent-light/10 rounded-xl p-4 space-y-4">
      <p className="text-xs font-semibold text-accent uppercase tracking-wide">
        {isEdit ? "Edit User" : "Add New User"}
      </p>

      <div className="grid grid-cols-2 gap-3">
        {/* Name */}
        <div>
          <label className={labelCls}>Full Name *</label>
          <input value={form.name} onChange={(e) => update("name", e.target.value)}
            placeholder="e.g. Aftab Khan" className={inputCls} />
        </div>

        {/* Email */}
        <div>
          <label className={labelCls}>Email *</label>
          <input type="email" value={form.email} onChange={(e) => update("email", e.target.value)}
            placeholder="e.g. aftab@zribble.com" className={inputCls} />
        </div>

        {/* Password */}
        <div className="col-span-2">
          <label className={labelCls}>{isEdit ? "New Password (leave blank to keep current)" : "Password *"}</label>
          <div className="relative">
            <input
              type={showPw ? "text" : "password"}
              value={form.password}
              onChange={(e) => update("password", e.target.value)}
              placeholder={isEdit ? "Leave blank to keep current password" : "Min 6 characters"}
              className={cn(inputCls, "pr-9")}
            />
            <button type="button" onClick={() => setShowPw((v) => !v)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
              {showPw ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* Role */}
        <div>
          <label className={labelCls}>Role *</label>
          <select value={form.role} onChange={(e) => update("role", e.target.value as UserRole)} className={inputCls}>
            <option value="employee">Executive</option>
            <option value="accounts_team">Accounts Team</option>
            <option value="super_admin">Super Admin</option>
          </select>
        </div>

        {/* Mode — only for employees */}
        {form.role === "employee" && (
          <div>
            <label className={labelCls}>Permission Mode *</label>
            <select value={form.mode} onChange={(e) => update("mode", e.target.value as EmployeeMode)} className={inputCls}>
              <option value="view">View Only</option>
              <option value="view_edit">View & Edit</option>
            </select>
          </div>
        )}

        {/* Salesperson — only for employees. Free-text + datalist suggestions,
            so a brand-new name (new hire) is never blocked, while existing
            names are still suggested for consistency. */}
        {form.role === "employee" && (
          <div className="col-span-2">
            <label className={labelCls}>Salesperson Name *</label>
            <input
              list="salesperson-suggestions"
              value={form.salesperson}
              onChange={(e) => update("salesperson", e.target.value)}
              placeholder="Type a name — existing names are suggested, or type a new one"
              className={inputCls}
            />
            <datalist id="salesperson-suggestions">
              {existingSalespeople.map((s) => <option key={s} value={s} />)}
            </datalist>
            {form.salesperson.trim() && !existingSalespeople.includes(form.salesperson.trim()) && (
              <p className="text-[10px] text-accent-amber mt-1">
                "{form.salesperson.trim()}" is a new name — double-check the spelling matches what you intend to use everywhere.
              </p>
            )}
          </div>
        )}
      </div>

      {error && (
        <p className="text-xs text-accent-red bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
      )}

      <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-100">
        <button onClick={onCancel} className="text-xs text-slate-500 hover:text-slate-700 px-3 py-1.5 rounded-lg hover:bg-slate-100 transition-all">
          Cancel
        </button>
        <button
          onClick={handleSubmit}
          disabled={loading || !form.name.trim() || !form.email.trim() || (!isEdit && !form.password.trim()) || (form.role === "employee" && !form.mode) || (form.role === "employee" && !form.salesperson.trim())}
          className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-accent text-white hover:bg-accent-hover transition-all disabled:opacity-50 disabled:cursor-not-allowed">
          <CheckCircle2 className="w-3.5 h-3.5" />
          {loading ? "Saving..." : isEdit ? "Save Changes" : "Create User"}
        </button>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function SettingsPage() {
  const { user, canPerform, logout } = useAuth();
  const router = useRouter();

  const { data: users = [], isLoading } = useUsers();
  const createUser  = useCreateUser();
  const updateUser  = useUpdateUser();
  const deleteUser  = useDeleteUser();

  const [addingUser,    setAddingUser]    = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [deleteTarget,  setDeleteTarget]  = useState<AppUser | null>(null);
  const [formError,     setFormError]     = useState("");

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

  // Live list of existing employee salesperson names, derived from the
  // already-loaded users list — always reflects who's actually in the
  // system right now, with zero extra API calls and zero manual upkeep.
  const existingSalespeople = Array.from(
    new Set(users.filter((u) => u.role === "employee" && u.salesperson).map((u) => u.salesperson as string))
  ).sort();

  function handleAdd(data: UserFormData) {
    setFormError("");
    createUser.mutate(data, {
      onSuccess: () => { setAddingUser(false); },
      onError: (err: any) => setFormError(err.message ?? "Failed to create user"),
    });
  }

  function handleEdit(data: UserFormData) {
    if (!editingUserId) return;
    setFormError("");
    // Only send password if the user actually typed one
    const payload: Partial<UserFormData> = { ...data };
    if (!payload.password) delete payload.password;
    updateUser.mutate({ id: editingUserId, data: payload }, {
      onSuccess: () => { setEditingUserId(null); },
      onError: (err: any) => setFormError(err.message ?? "Failed to update user"),
    });
  }

  function handleDelete(u: AppUser) {
    deleteUser.mutate(u.id, {
      onSuccess: () => setDeleteTarget(null),
      onError: (err: any) => setFormError(err.message ?? "Failed to delete user"),
    });
  }

  const editingUser = users.find((u) => u.id === editingUserId);

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
          <button
            onClick={() => { logout(); router.replace("/login"); }}
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
              {!isLoading && (
                <span className="text-[11px] font-semibold px-1.5 py-0.5 rounded-full bg-accent-light text-accent border border-accent-border">
                  {users.length}
                </span>
              )}
            </div>
            {!addingUser && !editingUserId && (
              <button
                onClick={() => { setAddingUser(true); setFormError(""); }}
                className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-accent text-white hover:bg-accent-hover transition-all shadow-sm">
                <Plus className="w-3.5 h-3.5" /> Add User
              </button>
            )}
          </div>

          {/* Add user form */}
          {addingUser && (
            <div className="px-5 py-4 border-b border-slate-100">
              <UserForm
                onSave={handleAdd}
                onCancel={() => { setAddingUser(false); setFormError(""); }}
                error={formError}
                loading={createUser.isPending}
                existingSalespeople={existingSalespeople}
              />
            </div>
          )}

          <div className="divide-y divide-slate-100">
            {isLoading ? (
              <div className="px-5 py-8 text-center text-sm text-slate-400">Loading users...</div>
            ) : users.map((u) => (
              <div key={u.id}>
                <div className="flex items-center gap-4 px-5 py-3.5">
                  <div className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold flex-shrink-0",
                    u.role === "super_admin"   ? "bg-accent-light text-accent" :
                    u.role === "accounts_team" ? "bg-cyan-50 text-accent-cyan" :
                    "bg-slate-100 text-slate-500")}>
                    {u.name[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-slate-700">{u.name}</p>
                      {u.salesperson && (
                        <span className="w-2 h-2 rounded-full flex-shrink-0"
                          style={{ backgroundColor: SALESPERSON_COLORS[u.salesperson] }} />
                      )}
                    </div>
                    <p className="text-xs text-slate-400 truncate">{u.email}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {u.mode && (
                      <span className={cn(
                        "text-[10px] font-semibold px-2 py-0.5 rounded-full border",
                        u.mode === "view_edit"
                          ? "bg-accent-greenLight text-accent-green border-emerald-200"
                          : "bg-slate-100 text-slate-500 border-slate-200")}>
                        {u.mode === "view_edit" ? "View & Edit" : "View Only"}
                      </span>
                    )}
                    <span className={cn("text-[11px] font-semibold px-2.5 py-1 rounded-full border", ROLE_COLORS[u.role])}>
                      {ROLE_LABELS[u.role]}
                    </span>
                    {/* Edit button — not shown while a form is open for another user */}
                    {!addingUser && editingUserId !== u.id && (
                      <button
                        onClick={() => { setEditingUserId(u.id); setFormError(""); setAddingUser(false); }}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-accent hover:bg-accent-light/30 transition-all"
                        title="Edit user">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {/* Cancel edit button */}
                    {editingUserId === u.id && (
                      <button
                        onClick={() => { setEditingUserId(null); setFormError(""); }}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all"
                        title="Cancel edit">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {/* Delete button — backend blocks self-deletion */}
                    {u.id !== user?.id && !addingUser && editingUserId !== u.id && (
                      <button
                        onClick={() => { setDeleteTarget(u); setFormError(""); }}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-accent-red hover:bg-accent-redLight transition-all"
                        title="Delete user">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Inline edit form */}
                {editingUserId === u.id && editingUser && (
                  <div className="px-5 pb-4">
                    <UserForm
                      isEdit
                      initial={{
                        name:        editingUser.name,
                        email:       editingUser.email,
                        password:    "",
                        role:        editingUser.role,
                        mode:        editingUser.mode ?? "",
                        salesperson: editingUser.salesperson ?? "",
                      }}
                      onSave={handleEdit}
                      onCancel={() => { setEditingUserId(null); setFormError(""); }}
                      error={formError}
                      loading={updateUser.isPending}
                      existingSalespeople={existingSalespeople}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="px-5 py-3 bg-slate-50 border-t border-slate-100">
            <p className="text-[11px] text-slate-400">
              User management connected to live backend — full CRUD enabled.
            </p>
          </div>
        </div>

        {/* Delete confirm dialog */}
        {deleteTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
            <div className="bg-white border border-slate-200 rounded-2xl shadow-xl p-6 max-w-sm w-full mx-4 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-accent-redLight flex items-center justify-center flex-shrink-0">
                  <Trash2 className="w-4 h-4 text-accent-red" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-700">Delete User</p>
                  <p className="text-xs text-slate-400">This action cannot be undone.</p>
                </div>
              </div>
              <p className="text-sm text-slate-600">
                Are you sure you want to delete <span className="font-semibold">{deleteTarget.name}</span> ({deleteTarget.email})?
              </p>
              {formError && (
                <p className="text-xs text-accent-red bg-red-50 border border-red-200 rounded-lg px-3 py-2">{formError}</p>
              )}
              <div className="flex items-center justify-end gap-2">
                <button
                  onClick={() => { setDeleteTarget(null); setFormError(""); }}
                  className="text-xs text-slate-500 hover:text-slate-700 px-3 py-1.5 rounded-lg hover:bg-slate-100 transition-all">
                  Cancel
                </button>
                <button
                  onClick={() => handleDelete(deleteTarget)}
                  disabled={deleteUser.isPending}
                  className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-accent-red text-white hover:bg-red-600 transition-all disabled:opacity-50">
                  <Trash2 className="w-3.5 h-3.5" />
                  {deleteUser.isPending ? "Deleting..." : "Confirm Delete"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Permissions reference */}
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-card">
          <div className="px-5 py-4 border-b border-slate-100">
            <p className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <Shield className="w-4 h-4 text-slate-400" /> Permission Matrix
            </p>
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
                  ["See all data",   true,  true,  false, false],
                  ["Record payment", true,  false, false, true ],
                  ["Add new client", true,  false, false, true ],
                  ["Edit client",    true,  false, false, true ],
                  ["Stop client",    true,  false, false, true ],
                  ["Export Excel",   true,  false, false, false],
                  ["Settings",       true,  false, false, false],
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