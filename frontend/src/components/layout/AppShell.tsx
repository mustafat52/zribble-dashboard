"use client";
import { useAuth } from "@/lib/auth-context";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";

// Pages that don't need auth or the shell layout
const PUBLIC_PATHS = ["/login"];

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const pathname = usePathname();
  const router   = useRouter();

  const isPublic = PUBLIC_PATHS.includes(pathname);

  useEffect(() => {
    if (isLoading) return;
    if (!user && !isPublic) router.replace("/login");
    // Note: we intentionally do NOT auto-redirect away from /login when `user`
    // becomes truthy. The login page itself owns that redirect, after its
    // welcome + data-prefetch animation sequence finishes. Auto-redirecting
    // here would fire the instant setUser() runs inside login() and skip
    // that sequence entirely.
  }, [user, isLoading, pathname, isPublic, router]);

  // Loading state — show nothing to avoid flash
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-accent border-t-transparent animate-spin" />
      </div>
    );
  }

  // Public pages (login) — no shell
  if (isPublic || !user) return <>{children}</>;

  // Authenticated — full shell
  return (
    <>
      <Sidebar />
      <Topbar />
      {children}
    </>
  );
}