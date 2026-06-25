"use client";
import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";

export type UserRole = "super_admin" | "accounts_team" | "employee";
export type EmployeeMode = "view" | "view_edit";

export interface AppUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  mode?: EmployeeMode;         // only for employees
  salesperson?: string;        // only for employees — their own exec name
  createdAt: string;
  createdBy: string;
}

type Action =
  | "view_all"           // see all execs' data
  | "record_payment"     // mark renewals as paid
  | "add_client"         // new-entry form
  | "edit_client"        // edit services in modal
  | "stop_client"        // stop/reactivate client
  | "export_excel"       // salesperson page export
  | "view_settings"      // settings page
  | "manage_users";      // create/edit users in settings

// Hardcoded super admin for Phase 4 (no real auth yet)
const SUPER_ADMIN: AppUser = {
  id: "sa-001",
  name: "Admin",
  email: "admin@zribble.com",
  role: "super_admin",
  createdAt: "2026-06-01",
  createdBy: "system",
};

// Hardcoded users for demo — in production these come from the backend
export const DEMO_USERS: AppUser[] = [
  SUPER_ADMIN,
  { id: "ac-001", name: "Accounts Team",  email: "accounts@zribble.com", role: "accounts_team", createdAt: "2026-06-01", createdBy: "sa-001" },
  { id: "em-001", name: "Aftab",          email: "aftab@zribble.com",    role: "employee", mode: "view_edit", salesperson: "Aftab",   createdAt: "2026-06-01", createdBy: "sa-001" },
  { id: "em-002", name: "Sarvesh",        email: "sarvesh@zribble.com",  role: "employee", mode: "view_edit", salesperson: "Sarvesh", createdAt: "2026-06-01", createdBy: "sa-001" },
  { id: "em-003", name: "Firoz",          email: "firoz@zribble.com",    role: "employee", mode: "view_edit", salesperson: "Firoz",   createdAt: "2026-06-01", createdBy: "sa-001" },
  { id: "em-004", name: "Idris",          email: "idris@zribble.com",    role: "employee", mode: "view",      salesperson: "Idris",   createdAt: "2026-06-01", createdBy: "sa-001" },
  { id: "em-005", name: "Prajay",         email: "prajay@zribble.com",   role: "employee", mode: "view",      salesperson: "Prajay",  createdAt: "2026-06-01", createdBy: "sa-001" },
  { id: "em-006", name: "Vinay",          email: "vinay@zribble.com",    role: "employee", mode: "view",      salesperson: "Vinay",   createdAt: "2026-06-01", createdBy: "sa-001" },
];

const PASSWORDS: Record<string, string> = {
  "admin@zribble.com":    "admin123",
  "accounts@zribble.com": "accounts123",
  "aftab@zribble.com":    "aftab123",
  "sarvesh@zribble.com":  "sarvesh123",
  "firoz@zribble.com":    "firoz123",
  "idris@zribble.com":    "idris123",
  "prajay@zribble.com":   "prajay123",
  "vinay@zribble.com":    "vinay123",
};

const STORAGE_KEY = "zribble_user";

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

  // Rehydrate from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as AppUser;
        // Verify the user still exists in DEMO_USERS
        const valid = DEMO_USERS.find((u) => u.id === parsed.id);
        if (valid) setUser(valid);
        else localStorage.removeItem(STORAGE_KEY);
      }
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
    setIsLoading(false);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    await new Promise((r) => setTimeout(r, 600)); // simulate network
    const found = DEMO_USERS.find((u) => u.email.toLowerCase() === email.toLowerCase().trim());
    if (!found) return { success: false, error: "No account found with that email." };
    if (PASSWORDS[found.email] !== password) return { success: false, error: "Incorrect password." };
    setUser(found);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(found));
    return { success: true };
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    localStorage.removeItem(STORAGE_KEY);
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