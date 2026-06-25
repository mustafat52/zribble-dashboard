"use client";
import { useClient } from "@/lib/client-context";
import { SALESPERSON_COLORS } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { Ban } from "lucide-react";

interface ClientLinkProps {
  clientName: string;
  salesperson?: string;
  className?: string;
  showDot?: boolean;
  showStoppedBadge?: boolean;
}

export function ClientLink({
  clientName, salesperson, className, showDot = false, showStoppedBadge = true,
}: ClientLinkProps) {
  const { openClient, isClientStopped } = useClient();
  const stopped = isClientStopped(clientName);
  const color   = salesperson ? SALESPERSON_COLORS[salesperson] : undefined;

  return (
    <button
      onClick={(e) => { e.stopPropagation(); openClient(clientName); }}
      className={cn(
        "flex items-center gap-1.5 text-left group",
        className
      )}
    >
      {showDot && color && (
        <span className="w-1.5 h-5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
      )}
      <span className={cn(
        "font-medium truncate transition-colors group-hover:text-accent group-hover:underline underline-offset-2",
        stopped ? "text-slate-400 line-through" : "text-slate-700"
      )}>
        {clientName}
      </span>
      {stopped && showStoppedBadge && (
        <span className="flex items-center gap-0.5 text-[9px] font-semibold px-1 py-0.5 rounded bg-accent-redLight text-accent-red border border-red-200 flex-shrink-0">
          <Ban className="w-2 h-2" /> Stopped
        </span>
      )}
    </button>
  );
}