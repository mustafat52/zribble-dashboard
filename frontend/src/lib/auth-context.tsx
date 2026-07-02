"use client";
import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";

export type UserRole = "super_admin" | "accounts_team" | "employee" | "account_manager";
export type EmployeeMode = "view" | "view_edit";

export interface AppUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  mode?: EmployeeMode;
  salesperson?: string;
  accountManager?: string;
  createdAt: string;
  createdBy: string;
}

type Action =
  | "view_all"
  | "view_insights"
  | "record_payment"
  | "add_client"
  | "edit_client"
  | "stop_client"
  | "export_excel"
  | "view_settings"
  | "manage_users";

const API = process.env.NEXT_PUBLIC_API_URL;

interface AuthContextValue {
  user: AppUser | null;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  canPerform: (action: Action) => boolean;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user,      setUser]      = useState<AppUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // On mount — check if session cookie is still valid
  useEffect(() => {
    fetch(`${API}/auth/me`, { credentials: "include" })
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (data?.user) setUser(data.user);
      })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    try {
      const res = await fetch(`${API}/auth/login`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) return { success: false, error: data.error || "Login failed." };
      setUser(data.user);
      return { success: true };
    } catch {
      return { success: false, error: "Cannot reach server. Please try again." };
    }
  }, []);

  const logout = useCallback(async () => {
    await fetch(`${API}/auth/logout`, {
      method: "POST",
      credentials: "include",
    }).catch(() => {});
    setUser(null);
  }, []);

  const canPerform = useCallback((action: Action): boolean => {
    if (!user) return false;
    switch (action) {
      // view_all means "see org-wide unrestricted data" and is used in 10+
      // places across the frontend. Do NOT add employee or account_manager
      // here — that would silently grant them access to everyone's contracts.
      case "view_all":       return user.role === "super_admin" || user.role === "accounts_team";
      // view_insights gates the Insights page only. All four roles get in —
      // the Insights page itself locks filters based on the specific role.
      case "view_insights":  return true;
      case "record_payment": return user.role === "super_admin"
                                || (user.role === "employee" && user.mode === "view_edit")
                                || (user.role === "account_manager" && user.mode === "view_edit");
      case "add_client":     return user.role === "super_admin" || (user.role === "employee" && user.mode === "view_edit");
      // account_manager intentionally excluded from add_client — creating a
      // new client is an executive action; AMs are assigned to existing clients.
      case "edit_client":    return user.role === "super_admin"
                                || (user.role === "employee" && user.mode === "view_edit")
                                || (user.role === "account_manager" && user.mode === "view_edit");
      case "stop_client":    return user.role === "super_admin"
                                || (user.role === "employee" && user.mode === "view_edit")
                                || (user.role === "account_manager" && user.mode === "view_edit");
      case "export_excel":   return user.role === "super_admin";
      case "view_settings":  return user.role === "super_admin";
      case "manage_users":   return user.role === "super_admin";
      default:               return false;
    }
  }, [user]);

  return (
    <AuthContext.Provider value={{ user, login, logout, canPerform, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}