"use client";
import { cn } from "@/lib/utils";
import { X } from "lucide-react";
import { useEffect, useRef } from "react";

interface ModalProps {
  open: boolean; onClose: () => void;
  title?: string; subtitle?: string;
  children: React.ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
  footer?: React.ReactNode;
}

export function Modal({ open, onClose, title, subtitle, children, size = "md", footer }: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [open, onClose]);
  if (!open) return null;
  const sizes = { sm: "max-w-sm", md: "max-w-lg", lg: "max-w-2xl", xl: "max-w-4xl" };
  return (
    <div ref={overlayRef} className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}>
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
      <div className={cn("relative w-full bg-white border border-slate-200 rounded-2xl shadow-xl animate-slide-up max-h-[90vh] flex flex-col", sizes[size])}>
        {(title || subtitle) && (
          <div className="flex items-start justify-between px-6 pt-5 pb-4 border-b border-slate-100 flex-shrink-0">
            <div>
              {title && <h2 className="text-base font-semibold text-slate-800">{title}</h2>}
              {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
            </div>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors ml-4 mt-0.5">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
        <div className="px-6 py-5 overflow-y-auto max-h-[calc(90vh-120px)]">{children}</div>
        {footer && (
          <div className="px-6 pb-5 flex items-center justify-end gap-3 border-t border-slate-100 pt-4 flex-shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}