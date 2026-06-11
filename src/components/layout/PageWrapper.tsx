import { cn } from "@/lib/utils";

interface PageWrapperProps {
  children: React.ReactNode;
  className?: string;
  wide?: boolean;
}

export function PageWrapper({ children, className, wide }: PageWrapperProps) {
  return (
    <main className={cn(
      "ml-60 mt-14 min-h-[calc(100vh-3.5rem)]",
      "bg-slate-50 bg-grid-pattern bg-grid",
      "px-6 py-6",
      !wide && "max-w-screen-2xl",
      "animate-fade-in",
      className
    )}>
      {children}
    </main>
  );
}

export function PageGrid({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("grid grid-cols-1 xl:grid-cols-3 gap-5", className)}>{children}</div>;
}

export function PageRow({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("flex flex-col gap-5", className)}>{children}</div>;
}

export function StatRow({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("grid grid-cols-2 md:grid-cols-4 xl:grid-cols-6 gap-4", className)}>{children}</div>;
}