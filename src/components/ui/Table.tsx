import { cn } from "@/lib/utils";

export function Table({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("w-full overflow-x-auto", className)}><table className="w-full text-sm">{children}</table></div>;
}
export function THead({ children }: { children: React.ReactNode }) {
  return <thead><tr className="border-b border-slate-100 bg-slate-50">{children}</tr></thead>;
}
export function Th({ children, className }: { children?: React.ReactNode; className?: string }) {
  return <th className={cn("px-4 py-2.5 text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap", className)}>{children}</th>;
}
export function TBody({ children }: { children: React.ReactNode }) {
  return <tbody className="divide-y divide-slate-100">{children}</tbody>;
}
export function Tr({ children, className, onClick }: { children: React.ReactNode; className?: string; onClick?: () => void }) {
  return <tr onClick={onClick} className={cn("transition-colors duration-100 hover:bg-slate-50/80", onClick && "cursor-pointer", className)}>{children}</tr>;
}
export function Td({ children, className }: { children?: React.ReactNode; className?: string }) {
  return <td className={cn("px-4 py-3 text-sm text-slate-700 whitespace-nowrap", className)}>{children}</td>;
}