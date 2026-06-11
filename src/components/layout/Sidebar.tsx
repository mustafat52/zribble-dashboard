"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn, SALESPERSON_COLORS } from "@/lib/utils";
import { LayoutDashboard, CalendarDays, CreditCard, Users, UserCircle, PlusCircle, TrendingUp, ChevronRight, Bell } from "lucide-react";

const NAV_ITEMS = [
  { group: "Overview", items: [
    { label: "Dashboard",   href: "/dashboard",   icon: LayoutDashboard },
    { label: "Renewals",    href: "/renewals",    icon: CalendarDays    },
    { label: "Payments",    href: "/payments",    icon: CreditCard      },
  ]},
  { group: "Management", items: [
    { label: "Clients",     href: "/clients",     icon: Users           },
    { label: "Salesperson", href: "/salesperson", icon: UserCircle      },
  ]},
  { group: "Actions", items: [
    { label: "New Entry",   href: "/new-entry",   icon: PlusCircle      },
  ]},
];

const SALESPEOPLE = [
  { name: "Aftab",   accounts: 73 },
  { name: "Sarvesh", accounts: 50 },
  { name: "Firoz",   accounts: 37 },
  { name: "Idris",   accounts: 12 },
  { name: "Prajay",  accounts: 3  },
  { name: "Vinay",   accounts: 3  },
];

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="fixed left-0 top-0 h-screen w-60 bg-white border-r border-slate-200 flex flex-col z-40 shadow-sm">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center shadow-sm">
            <TrendingUp className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-800 leading-none">ZribbleOS</p>
            <p className="text-[10px] text-slate-400 mt-0.5">Sales Pipeline</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5 scrollbar-hide">
        {NAV_ITEMS.map((group) => (
          <div key={group.group}>
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest px-2 mb-1.5">{group.group}</p>
            <ul className="space-y-0.5">
              {group.items.map(({ label, href, icon: Icon }) => {
                const active = pathname === href || pathname.startsWith(href + "/");
                return (
                  <li key={href}>
                    <Link href={href} className={cn(
                      "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150 group",
                      active
                        ? "bg-accent-light text-accent border border-accent-border"
                        : "text-slate-600 hover:text-slate-800 hover:bg-slate-50"
                    )}>
                      <Icon className={cn("w-4 h-4 flex-shrink-0", active ? "text-accent" : "text-slate-400 group-hover:text-slate-600")} />
                      {label}
                      {active && <ChevronRight className="w-3 h-3 ml-auto text-accent/50" />}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}

        {/* Exec quick-links */}
        <div>
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest px-2 mb-1.5">Executives</p>
          <ul className="space-y-0.5">
            {SALESPEOPLE.map(({ name, accounts }) => (
              <li key={name}>
                <Link href={`/salesperson?exec=${name}`} className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-sm transition-all duration-150 text-slate-500 hover:text-slate-700 hover:bg-slate-50 group">
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: SALESPERSON_COLORS[name] }} />
                  <span className="flex-1 text-xs">{name}</span>
                  <span className="text-[10px] text-slate-400">{accounts}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </nav>

      {/* Footer */}
      <div className="px-4 py-4 border-t border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-full bg-accent-light flex items-center justify-center">
            <UserCircle className="w-4 h-4 text-accent" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-slate-700 truncate">Management</p>
            <p className="text-[10px] text-slate-400">Admin</p>
          </div>
          <Bell className="w-3.5 h-3.5 text-slate-400 hover:text-slate-600 cursor-pointer transition-colors" />
        </div>
      </div>
    </aside>
  );
}