"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";
import {
  Activity, Brain, Mail, Eye, Search, ClipboardList, LogOut, ShieldCheck,
  Share2, Menu, X,
} from "lucide-react";

const links = [
  { href: "/", label: "Kesehatan", icon: Activity },
  { href: "/ltm", label: "Korpus", icon: Brain },
  { href: "/graph", label: "Graph", icon: Share2 },
  { href: "/ops", label: "Audit", icon: ClipboardList },
  { href: "/search", label: "Cari", icon: Search },
  { href: "/inbox", label: "Inbox", icon: Mail },
  { href: "/observations", label: "Observasi", icon: Eye },
];

function Brand() {
  return (
    <div className="flex items-center gap-3 px-2 py-3">
      <div className="flex size-9 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-gradient-to-br from-sky-400/25 to-violet-500/20">
        <Brain className="size-4 text-sky-300" />
      </div>
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-zinc-100">Fakhri&apos;s Agentic Memory</p>
        <p className="text-[10px] text-zinc-500">panel pemantauan</p>
      </div>
    </div>
  );
}

function NavLinks({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  return (
    <nav className="mt-3 flex-1 space-y-1">
      {links.map(({ href, label, icon: Icon }) => {
        const active = pathname === href;
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
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
  );
}

function FooterActions({ onLogout }: { onLogout: () => void }) {
  return (
    <div className="space-y-2 border-t border-white/[0.07] pt-3">
      <div className="flex items-center gap-2 rounded-2xl bg-white/[0.03] px-3 py-2 text-[11px] text-zinc-500">
        <ShieldCheck className="size-3.5 shrink-0 text-emerald-400/70" />
        <span>Baca-saja</span>
      </div>
      <button
        onClick={onLogout}
        className="flex w-full items-center gap-3 rounded-2xl px-3 py-2.5 text-sm text-zinc-500 transition-colors hover:bg-white/[0.04] hover:text-zinc-300"
      >
        <LogOut className="size-4" />
        Keluar
      </button>
    </div>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const { logout } = useAuth();
  const [open, setOpen] = useState(false);

  // Rute ganti (link diklik, atau navigasi lain) -> tutup drawer. Tanpa ini
  // drawer nyangkut kebuka di halaman berikutnya kalau ditutup lewat cara
  // selain klik link (mis. tombol back).
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <>
      {/* Desktop — tidak berubah dari sebelumnya */}
      <aside className="hidden w-60 shrink-0 flex-col p-3 lg:flex">
        <div className="glass flex h-full flex-col rounded-3xl p-3">
          <Brand />
          <NavLinks pathname={pathname} />
          <FooterActions onLogout={logout} />
        </div>
      </aside>

      {/* Mobile — top bar persisten (bagian dari flow, bukan overlay, jadi
          gak nutupin konten) + drawer slide-in dari kiri saat hamburger
          diklik. */}
      <div className="glass sticky top-0 z-30 mx-3 mt-3 flex shrink-0 items-center justify-between rounded-2xl px-3 py-2 lg:hidden">
        <div className="flex items-center gap-2.5">
          <div className="flex size-8 items-center justify-center rounded-xl border border-white/10 bg-gradient-to-br from-sky-400/25 to-violet-500/20">
            <Brain className="size-3.5 text-sky-300" />
          </div>
          <p className="text-sm font-semibold text-zinc-100">Fakhri&apos;s Agentic Memory</p>
        </div>
        <button
          onClick={() => setOpen(true)}
          aria-label="Buka navigasi"
          className="flex size-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-zinc-300 transition-colors hover:bg-white/[0.08]"
        >
          <Menu className="size-4" />
        </button>
      </div>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          <div className="glass absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col rounded-r-3xl p-3">
            <div className="flex items-center justify-between">
              <Brand />
              <button
                onClick={() => setOpen(false)}
                aria-label="Tutup navigasi"
                className="mr-1 flex size-8 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04] text-zinc-400 hover:text-zinc-200"
              >
                <X className="size-4" />
              </button>
            </div>
            <NavLinks pathname={pathname} onNavigate={() => setOpen(false)} />
            <FooterActions onLogout={logout} />
          </div>
        </div>
      )}
    </>
  );
}
