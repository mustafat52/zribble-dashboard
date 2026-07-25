import { cn, statusColor, statusLabel } from "@/lib/utils";
import { PaymentStatus } from "@/types";

interface BadgeProps {
  children?: React.ReactNode;
  variant?: "indigo" | "green" | "amber" | "red" | "purple" | "cyan" | "gray";
  size?: "sm" | "md";
  className?: string;
}

export function Badge({ children, variant = "indigo", size = "md", className }: BadgeProps) {
  const variants = {
    indigo: "text-accent bg-accent-light border-accent-border",
    green:  "text-accent-green bg-accent-greenLight border-emerald-200",
    amber:  "text-accent-amber bg-accent-amberLight border-amber-200",
    red:    "text-accent-red bg-accent-redLight border-red-200",
    purple: "text-accent-purple bg-purple-50 border-purple-200",
    cyan:   "text-accent-cyan bg-accent-cyanLight border-cyan-200",
    gray:   "text-slate-500 bg-slate-100 border-slate-200",
  };
  const sizes = { sm: "text-[10px] px-1.5 py-0.5", md: "text-xs px-2 py-0.5" };
  return (
    <span className={cn("inline-flex items-center rounded-full border font-medium", variants[variant], sizes[size], className)}>
      {children}
    </span>
  );
}

interface StatusBadgeProps { status: PaymentStatus; size?: "sm" | "md"; }

export function StatusBadge({ status, size = "md" }: StatusBadgeProps) {
  const sizes = { sm: "text-[10px] px-1.5 py-0.5", md: "text-xs px-2 py-0.5" };
  const styles: Record<PaymentStatus, string> = {
    collected: "text-accent-green bg-accent-greenLight border-emerald-200",
    partial:   "text-accent-amber bg-accent-amberLight border-amber-200",
    pending:   "text-accent bg-accent-light border-accent-border",
    overdue:   "text-accent-red bg-accent-redLight border-red-200",
    waived:    "text-slate-500 bg-slate-100 border-slate-200",
    // Renewed, ₹0 collected, but a full-balance promise exists for a
    // future date — deliberately NOT the same color as "partial" (some
    // money already in hand) or plain "pending" (nothing has happened at
    // all). Purple keeps it visually distinct from both.
    promised:  "text-accent-purple bg-purple-50 border-purple-200",
  };
  const dot: Record<PaymentStatus, string> = {
    collected: "bg-accent-green",
    partial:   "bg-accent-amber",
    pending:   "bg-accent",
    overdue:   "bg-accent-red",
    waived:    "bg-slate-400",
    promised:  "bg-accent-purple",
  };
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full border font-medium", styles[status], sizes[size])}>
      <span className={cn("w-1.5 h-1.5 rounded-full", dot[status])} />
      {statusLabel(status)}
    </span>
  );
}