import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { ClientProvider } from "@/lib/client-context";
import { AuthProvider } from "@/lib/auth-context";
import { AppShell } from "@/components/layout/AppShell";
import { QueryProvider } from "@/lib/QueryProvider";

const geistSans = Inter({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = JetBrains_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "ZribbleOS — Sales Pipeline",
  description: "Renewal & payment tracking dashboard",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased bg-slate-50 text-slate-800`}>
        <QueryProvider>
          <AuthProvider>
            <ClientProvider>
              <AppShell>{children}</AppShell>
            </ClientProvider>
          </AuthProvider>
        </QueryProvider>
      </body>
    </html>
  );
}