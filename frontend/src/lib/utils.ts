import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { PaymentStatus } from "@/types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(value: number): string {
  if (value >= 10000000) return `₹${(value / 10000000).toFixed(2)}Cr`;
  if (value >= 100000)   return `₹${(value / 100000).toFixed(2)}L`;
  if (value >= 1000)     return `₹${(value / 1000).toFixed(1)}K`;
  return `₹${value.toFixed(0)}`;
}

export function formatCurrencyFull(value: number): string {
  const formatted = value.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `₹${formatted}`;
}

export function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

export function getMonthLabel(year: number, month: number): string {
  const date = new Date(year, month - 1, 1);
  return date.toLocaleDateString("en-IN", { month: "short", year: "numeric" });
}

export function getMonthShort(month: number): string {
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return months[month - 1];
}

export function statusColor(status: PaymentStatus): string {
  switch (status) {
    case "collected": return "text-accent-green bg-accent-greenLight border-emerald-200";
    case "partial":   return "text-accent-amber bg-accent-amberLight border-amber-200";
    case "pending":   return "text-accent bg-accent-light border-accent-border";
    case "overdue":   return "text-accent-red bg-accent-redLight border-red-200";
    case "waived":    return "text-slate-500 bg-slate-100 border-slate-200";
    default:          return "text-slate-500 bg-slate-100 border-slate-200";
  }
}

export function statusLabel(status: PaymentStatus): string {
  switch (status) {
    case "collected": return "Collected";
    case "partial":   return "Partial";
    case "pending":   return "Pending";
    case "overdue":   return "Overdue";
    case "waived":    return "Waived";
    default:          return status;
  }
}

// ─── Salesperson colors ────────────────────────────────────────────────────────
// Known names get a fixed, stable color (kept for visual continuity with
// existing screenshots/training). Any name NOT in this map (new hires,
// renamed/typo'd entries) falls through to getSalespersonColor() below,
// which deterministically derives a color from the name itself — so new
// people always get *some* consistent color instead of a blank dot, and
// the same new name always maps to the same color across sessions without
// needing this file edited every time someone joins or leaves.
const KNOWN_SALESPERSON_COLORS: Record<string, string> = {
  Aftab:   "#4F46E5",
  Sarvesh: "#0891B2",
  Firoz:   "#7C3AED",
  Idris:   "#059669",
  Prajay:  "#D97706",
  Vinay:   "#DC2626",
};

// Small fixed palette to cycle through for unknown names — chosen to be
// visually distinct from each other and from the 6 known colors above.
const FALLBACK_PALETTE = [
  "#0EA5E9", "#16A34A", "#DB2777", "#CA8A04", "#9333EA", "#0D9488", "#E11D48", "#475569",
];

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0; // keep as 32-bit int
  }
  return Math.abs(hash);
}

/**
 * Returns a stable color for any salesperson name — known names get their
 * fixed color, unknown names get a deterministic pick from FALLBACK_PALETTE
 * based on a hash of the name, so it's consistent across renders/sessions
 * without needing a database lookup or any manual list maintenance.
 */
export function getSalespersonColor(name: string): string {
  if (KNOWN_SALESPERSON_COLORS[name]) return KNOWN_SALESPERSON_COLORS[name];
  return FALLBACK_PALETTE[hashString(name) % FALLBACK_PALETTE.length];
}

// Kept exported for any existing call sites doing direct lookups — now a
// Proxy so reads for unknown keys still resolve via getSalespersonColor()
// instead of returning undefined. Existing code (`SALESPERSON_COLORS[x]`)
// keeps working unchanged; only the previously-silent "unknown name → no
// color" case is now handled instead of falling through to undefined.
export const SALESPERSON_COLORS: Record<string, string> = new Proxy(
  KNOWN_SALESPERSON_COLORS,
  {
    get(target, prop: string) {
      if (prop in target) return target[prop];
      return getSalespersonColor(prop);
    },
  }
);

export const MONTH_COLS = [
  "Jul-2026","Aug-2026","Sep-2026","Oct-2026","Nov-2026","Dec-2026",
  "Jan-2027","Feb-2027","Mar-2027","Apr-2027","May-2027","Jun-2027",
  "Jul-2027","Aug-2027","Sep-2027","Oct-2027","Nov-2027","Dec-2027",
  "Jan-2028","Feb-2028","Mar-2028","Apr-2028","May-2028","Jun-2028",
  "Jul-2028","Aug-2028","Sep-2028","Oct-2028","Nov-2028","Dec-2028",
];

export function parseMonthCol(col: string): { year: number; month: number } {
  const [mon, yr] = col.split("-");
  const months: Record<string, number> = {
    Jan:1,Feb:2,Mar:3,Apr:4,May:5,Jun:6,
    Jul:7,Aug:8,Sep:9,Oct:10,Nov:11,Dec:12,
  };
  return { year: parseInt(yr), month: months[mon] };
}

export function effectiveAmount(renewal: { amount: number; overriddenAmount?: number }): number {
  return renewal.overriddenAmount ?? renewal.amount;
}



// Case-insensitive dedup for name lists (account managers, products, etc.)
// where the same value may exist with inconsistent casing in the DB
// (e.g. "Hamza" and "hamza" as separate rows). Keeps the first-seen casing
// for each unique lowercase value. Shared across ClientDetailModal, Sidebar,
// and Insights so all three stay in sync instead of duplicating this logic.
export function dedupeCaseInsensitive(values: string[]): string[] {
  const seen = new Map<string, string>();
  for (const v of values) {
    const key = v.trim().toLowerCase();
    if (!seen.has(key)) seen.set(key, v);
  }
  return Array.from(seen.values());
}
