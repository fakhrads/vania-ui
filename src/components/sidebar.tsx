"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Brain, Inbox, Eye, Search, Settings, Sparkles, Database } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/", label: "Dashboard", icon: Sparkles },
  { href: "/inbox", label: "Inbox", icon: Inbox },
  { href: "/observations", label: "Observations", icon: Eye },
  { href: "/search", label: "Semantic Search", icon: Search },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden lg:flex w-60 flex-col border-r border-zinc-800 bg-zinc-900/50 backdrop-blur-sm">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 py-5 border-b border-zinc-800">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600/20">
          <Brain className="h-4 w-4 text-blue-400" />
        </div>
        <div>
          <span className="text-sm font-semibold text-zinc-100">Vania</span>
          <span className="ml-1.5 text-xs text-zinc-500">Memory</span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-all",
                active
                  ? "bg-blue-600/10 text-blue-400"
                  : "text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-4 py-4 border-t border-zinc-800">
        <div className="flex items-center gap-2 text-xs text-zinc-500">
          <Database className="h-3 w-3" />
          <span>db_vania</span>
        </div>
      </div>
    </aside>
  );
}
