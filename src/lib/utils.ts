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

export const SALESPERSON_COLORS: Record<string, string> = {
  Aftab:   "#4F46E5",
  Sarvesh: "#0891B2",
  Firoz:   "#7C3AED",
  Idris:   "#059669",
  Prajay:  "#D97706",
  Vinay:   "#DC2626",
};

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