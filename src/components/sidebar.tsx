"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { Brain, LayoutDashboard, Mail, Eye, Search, ClipboardList, LogOut } from "lucide-react";

const links = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/inbox", label: "Inbox", icon: Mail },
  { href: "/observations", label: "Observations", icon: Eye },
  { href: "/ltm", label: "Long-Term Memory", icon: Brain },
  { href: "/search", label: "Search", icon: Search },
  { href: "/ops", label: "Audit Log", icon: ClipboardList },
];

export function Sidebar() {
  const pathname = usePathname();
  const { logout } = useAuth();

  return (
    <aside className="w-56 border-r border-zinc-800 bg-zinc-900/50 flex flex-col shrink-0 hidden lg:flex">
      {/* Logo */}
      <div className="p-4 border-b border-zinc-800">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600/20">
            <Brain className="h-4 w-4 text-blue-400" />
          </div>
          <div>
            <p className="text-sm font-semibold">Vania Memory</p>
            <p className="text-[10px] text-zinc-600">memory manager</p>
          </div>
        </div>
      </div>

      {/* Nav Links */}
      <nav className="flex-1 p-2 space-y-0.5">
        {links.map((link) => {
          const Icon = link.icon;
          const active = pathname === link.href;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
                active
                  ? "bg-zinc-800 text-zinc-100"
                  : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50"
              }`}
            >
              <Icon className="h-4 w-4" />
              {link.label}
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="p-2 border-t border-zinc-800">
        <button
          onClick={logout}
          className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50 w-full"
        >
          <LogOut className="h-4 w-4" />
          Logout
        </button>
      </div>
    </aside>
  );
}
