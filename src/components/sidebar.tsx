"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";
import {
  Activity, Brain, Mail, Eye, Search, ClipboardList, LogOut, ShieldCheck,
} from "lucide-react";

const links = [
  { href: "/", label: "Kesehatan", icon: Activity },
  { href: "/ltm", label: "Korpus", icon: Brain },
  { href: "/ops", label: "Audit", icon: ClipboardList },
  { href: "/search", label: "Cari", icon: Search },
  { href: "/inbox", label: "Inbox", icon: Mail },
  { href: "/observations", label: "Observasi", icon: Eye },
];

export function Sidebar() {
  const pathname = usePathname();
  const { logout } = useAuth();

  return (
    <aside className="hidden w-60 shrink-0 flex-col p-3 lg:flex">
      <div className="glass flex h-full flex-col rounded-3xl p-3">
        <div className="flex items-center gap-3 px-2 py-3">
          <div className="flex size-9 items-center justify-center rounded-2xl border border-white/10 bg-gradient-to-br from-sky-400/25 to-violet-500/20">
            <Brain className="size-4 text-sky-300" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-zinc-100">Vania Memory</p>
            <p className="text-[10px] text-zinc-500">panel pemantauan</p>
          </div>
        </div>

        <nav className="mt-3 flex-1 space-y-1">
          {links.map(({ href, label, icon: Icon }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm transition-colors",
                  active
                    ? "border border-white/10 bg-white/[0.07] text-zinc-100"
                    : "text-zinc-400 hover:bg-white/[0.04] hover:text-zinc-200"
                )}
              >
                <Icon className={cn("size-4", active && "text-sky-300")} />
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="space-y-2 border-t border-white/[0.07] pt-3">
          <div className="flex items-center gap-2 rounded-2xl bg-white/[0.03] px-3 py-2 text-[11px] text-zinc-500">
            <ShieldCheck className="size-3.5 shrink-0 text-emerald-400/70" />
            <span>Baca-saja</span>
          </div>
          <button
            onClick={logout}
            className="flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-sm text-zinc-500 transition-colors hover:bg-white/[0.04] hover:text-zinc-300"
          >
            <LogOut className="size-4" />
            Keluar
          </button>
        </div>
      </div>
    </aside>
  );
}
