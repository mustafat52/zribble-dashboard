"use client";
import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";

export type UserRole = "super_admin" | "accounts_team" | "employee";
export type EmployeeMode = "view" | "view_edit";

export interface AppUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  mode?: EmployeeMode;
  salesperson?: string;
  createdAt: string;
  createdBy: string;
}

type Action =
  | "view_all"
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
      case "view_all":       return user.role === "super_admin" || user.role === "accounts_team";
      case "record_payment": return user.role === "super_admin" || (user.role === "employee" && user.mode === "view_edit");
      case "add_client":     return user.role === "super_admin" || (user.role === "employee" && user.mode === "view_edit");
      case "edit_client":    return user.role === "super_admin" || (user.role === "employee" && user.mode === "view_edit");
      case "stop_client":    return user.role === "super_admin" || (user.role === "employee" && user.mode === "view_edit");
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