import { cn } from "@/lib/utils";
import { InputHTMLAttributes, forwardRef } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string; error?: string; hint?: string;
  leftIcon?: React.ReactNode; rightIcon?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, hint, leftIcon, rightIcon, id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, "-");
    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={inputId} className="text-xs font-medium text-slate-600 uppercase tracking-wide">
            {label}
          </label>
        )}
        <div className="relative">
          {leftIcon && <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">{leftIcon}</div>}
          <input
            ref={ref} id={inputId}
            className={cn(
              "w-full bg-white border border-slate-200 rounded-lg text-sm text-slate-800 placeholder:text-slate-400",
              "px-3 py-2 h-9 transition-all duration-150",
              "focus:outline-none focus:border-accent focus:ring-2 focus:ring-accent/10",
              "disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-slate-50",
              error && "border-accent-red focus:border-accent-red focus:ring-accent-red/10",
              leftIcon && "pl-9", rightIcon && "pr-9",
              className
            )}
            {...props}
          />
          {rightIcon && <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">{rightIcon}</div>}
        </div>
        {error && <p className="text-xs text-accent-red">{error}</p>}
        {hint && !error && <p className="text-xs text-slate-400">{hint}</p>}
      </div>
    );
  }
);
Input.displayName = "Input";