"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { useTheme, type Mode } from "@/lib/theme";
import { cn } from "@/lib/utils";
import {
  Activity, Brain, Mail, Eye, Search, ClipboardList, LogOut, ShieldCheck,
  Share2, X, Sun, Moon, MonitorCog, Ellipsis,
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

/**
 * Tujuh menu tidak muat jadi tab semua di layar telepon — dipaksa muat
 * bikin sasaran sentuhnya di bawah ukuran nyaman. Empat yang paling sering
 * dibuka jadi tab tetap, sisanya lewat "Lainnya" yang membuka sheet berisi
 * SELURUH menu (termasuk yang empat), jadi tidak ada yang tidak terjangkau.
 */
const TAB_HREFS = ["/", "/ltm", "/graph", "/search"];

function Brand() {
  return (
    <div className="flex items-center gap-3 px-1 py-3">
      <div className="raised flex size-9 shrink-0 items-center justify-center rounded-xl text-accent-solid">
        <Brain className="size-4" />
      </div>
      <div className="min-w-0">
        <p className="truncate text-[13px] font-semibold text-tx-1">Fakhri&apos;s Agentic Memory</p>
        <p className="text-[10px] text-tx-3">panel pemantauan</p>
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
              "flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13.5px] transition-colors",
              active
                ? "raised font-medium text-tx-1"
                : "border border-transparent text-tx-2 hover:bg-sunken"
            )}
          >
            <Icon className={cn("size-4", active && "text-accent-solid")} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

/**
 * Pemilih tema. Tiga pilihan, bukan dua: default-nya ikut preferensi OS,
 * jadi "sistem" harus bisa dipilih balik setelah pengguna menimpanya.
 */
function ThemeSwitch() {
  const { mode, setMode } = useTheme();
  const opts: { m: Mode; icon: typeof Sun; label: string }[] = [
    { m: "light", icon: Sun, label: "Terang" },
    { m: "system", icon: MonitorCog, label: "Ikut sistem" },
    { m: "dark", icon: Moon, label: "Gelap" },
  ];
  return (
    <div className="well mb-2.5 flex gap-1 rounded-xl p-1">
      {opts.map(({ m, icon: Icon, label }) => (
        <button
          key={m}
          onClick={() => setMode(m)}
          aria-label={label}
          title={label}
          aria-pressed={mode === m}
          className={cn(
            "flex flex-1 items-center justify-center rounded-lg py-1.5 transition-colors",
            mode === m ? "raised text-tx-1" : "text-tx-3 hover:text-tx-2"
          )}
        >
          <Icon className="size-3.5" />
        </button>
      ))}
    </div>
  );
}

function FooterActions({ onLogout }: { onLogout: () => void }) {
  return (
    <div className="border-t border-line-soft pt-3">
      <ThemeSwitch />
      <div className="mb-1.5 flex items-center gap-2 rounded-xl bg-ok-tint px-3 py-2 text-[11px] text-ok">
        <ShieldCheck className="size-3.5 shrink-0" />
        <span>Baca-saja</span>
      </div>
      <button
        onClick={onLogout}
        className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[13.5px] text-tx-3 transition-colors hover:bg-sunken hover:text-tx-2"
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

  const tabs = links.filter((l) => TAB_HREFS.includes(l.href));
  const onOverflowRoute = !TAB_HREFS.includes(pathname);

  // Rute ganti (link diklik, atau navigasi lain) -> tutup drawer. Tanpa ini
  // drawer nyangkut kebuka di halaman berikutnya kalau ditutup lewat cara
  // selain klik link (mis. tombol back).
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <>
      {/* Desktop */}
      <aside className="hidden w-60 shrink-0 flex-col p-3.5 lg:flex">
        <div className="panel flex h-full flex-col rounded-[20px] p-3.5">
          <Brand />
          <NavLinks pathname={pathname} />
          <FooterActions onLogout={logout} />
        </div>
      </aside>

      {/* Mobile — bottom nav melayang. Sengaja fixed, bukan ikut flow:
          halaman ini panjang-panjang dan navigasinya harus tetap kejangkau
          jempol tanpa scroll balik ke atas. Konsekuensinya dia menutupi
          bagian bawah konten, jadi tiap <main> punya padding bawah ekstra
          (pb-28) buat mengimbangi — lihat halaman-halamannya. */}
      <nav className="fixed inset-x-0 bottom-0 z-40 pb-[env(safe-area-inset-bottom)] lg:hidden">
        <div className="panel mx-3 mb-3 flex items-stretch gap-1 rounded-2xl p-1.5">
          {tabs.map(({ href, label, icon: Icon }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-xl py-2 text-[10px] transition-colors",
                  active ? "raised font-medium text-tx-1" : "text-tx-3"
                )}
              >
                <Icon className={cn("size-[18px] shrink-0", active && "text-accent-solid")} />
                <span className="w-full truncate text-center">{label}</span>
              </Link>
            );
          })}
          <button
            onClick={() => setOpen(true)}
            aria-label="Menu lainnya"
            aria-expanded={open}
            className={cn(
              "flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-xl py-2 text-[10px] transition-colors",
              onOverflowRoute ? "raised font-medium text-tx-1" : "text-tx-3"
            )}
          >
            <Ellipsis className={cn("size-[18px] shrink-0", onOverflowRoute && "text-accent-solid")} />
            <span className="w-full truncate text-center">Lainnya</span>
          </button>
        </div>
      </nav>

      {/* Sheet naik dari bawah, bukan drawer dari samping — asalnya dari
          tombol di bar bawah, jadi arah munculnya mengikuti tombolnya. */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setOpen(false)}
          />
          <div className="overlay absolute inset-x-0 bottom-0 flex max-h-[88vh] flex-col overflow-y-auto rounded-t-[20px] p-3.5 pb-[calc(1rem+env(safe-area-inset-bottom))]">
            <div className="mx-auto mb-2 h-1 w-10 shrink-0 rounded-full bg-line" />
            <div className="flex items-center justify-between">
              <Brand />
              <button
                onClick={() => setOpen(false)}
                aria-label="Tutup navigasi"
                className="raised mr-1 flex size-9 shrink-0 items-center justify-center rounded-xl text-tx-2"
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
