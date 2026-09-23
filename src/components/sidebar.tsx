"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { useTheme, type Mode } from "@/lib/theme";
import { NAV, ALL_LINKS } from "@/lib/nav";
import { Brand } from "@/components/brand";
import { cn } from "@/lib/utils";
import { LogOut, X, Sun, Moon, MonitorCog, Ellipsis } from "lucide-react";

/**
 * Dua belas menu tidak muat jadi tab semua di layar telepon — dipaksa muat
 * bikin sasaran sentuhnya di bawah ukuran nyaman. Empat yang paling sering
 * dibuka jadi tab tetap, sisanya lewat "Lainnya" yang membuka sheet berisi
 * SELURUH menu (termasuk yang empat), jadi tidak ada yang tidak terjangkau.
 */
const TAB_HREFS = ["/", "/ltm", "/graph", "/search"];

function NavLinks({ pathname, onNavigate }: { pathname: string; onNavigate?: () => void }) {
  return (
    <nav className="mt-6 flex-1 space-y-6">
      {NAV.map((g) => (
        <div key={g.name}>
          <p className="kicker mb-2 px-2.5 !text-[9.5px]">{g.name}</p>
          <div className="space-y-px">
            {g.links.map(({ href, label, icon: Icon, index }) => {
              const active = pathname === href;
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={onNavigate}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "group relative flex items-center gap-3 rounded-md px-2.5 py-[7px] text-[13.5px] transition-colors",
                    active
                      ? "bg-surf-1 font-medium text-tx-1 ring-1 ring-line"
                      : "text-tx-2 hover:bg-sunken hover:text-tx-1"
                  )}
                >
                  {/* Batang tinta di tepi kiri — penanda aktif yang tetap
                      terbaca tanpa warna. */}
                  {active && (
                    <span aria-hidden className="absolute inset-y-1.5 left-0 w-[2px] rounded-full bg-tx-1" />
                  )}
                  <Icon
                    strokeWidth={1.75}
                    className={cn(
                      "size-[15px] shrink-0",
                      active ? "text-tx-1" : "text-tx-3 group-hover:text-tx-2"
                    )}
                  />
                  <span className="flex-1 truncate">{label}</span>
                  <span className={cn("num text-[10px]", active ? "text-tx-2" : "text-tx-3/70")}>
                    {index}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      ))}
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
    <div className="flex rounded-md border border-line p-0.5" role="group" aria-label="Tema">
      {opts.map(({ m, icon: Icon, label }) => (
        <button
          key={m}
          onClick={() => setMode(m)}
          aria-label={label}
          title={label}
          aria-pressed={mode === m}
          className={cn(
            "flex flex-1 items-center justify-center rounded-[4px] py-1.5 transition-colors",
            mode === m ? "bg-tx-1 text-bg" : "text-tx-3 hover:text-tx-1"
          )}
        >
          <Icon className="size-3.5" strokeWidth={1.75} />
        </button>
      ))}
    </div>
  );
}

function FooterActions({ onLogout }: { onLogout: () => void }) {
  return (
    <div className="space-y-3 border-t border-line pt-4">
      <ThemeSwitch />
      <div className="flex items-center justify-between px-1">
        <span className="kicker flex items-center gap-2 !text-[9.5px]">
          <span className="mark mark-ok size-[6px] text-ok" />
          Baca-saja
        </span>
        <button
          onClick={onLogout}
          className="flex items-center gap-1.5 text-[12px] text-tx-3 transition-colors hover:text-tx-1"
        >
          <LogOut className="size-3.5" strokeWidth={1.75} />
          Keluar
        </button>
      </div>
    </div>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const { logout } = useAuth();
  const [open, setOpen] = useState(false);

  const tabs = ALL_LINKS.filter((l) => TAB_HREFS.includes(l.href));
  const onOverflowRoute = !TAB_HREFS.includes(pathname);

  // Rute ganti (link diklik, atau navigasi lain) -> tutup drawer. Tanpa ini
  // drawer nyangkut kebuka di halaman berikutnya kalau ditutup lewat cara
  // selain klik link (mis. tombol back).
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <>
      {/* Desktop — rel penuh setinggi layar, menempel saat halaman di-scroll.
          Tidak berbentuk kartu: dia bingkai, bukan isi. */}
      <aside className="sticky top-0 hidden h-screen w-[240px] shrink-0 flex-col overflow-y-auto border-r border-line px-4 pb-4 pt-6 lg:flex">
        <div className="px-1">
          <Brand />
        </div>
        <NavLinks pathname={pathname} />
        <FooterActions onLogout={logout} />
      </aside>

      {/* Mobile — bar bawah menempel. Sengaja fixed, bukan ikut flow:
          halaman ini panjang-panjang dan navigasinya harus tetap kejangkau
          jempol tanpa scroll balik ke atas. Konsekuensinya dia menutupi
          bagian bawah konten, jadi tiap <main> punya padding bawah ekstra
          (pb-28) buat mengimbangi — lihat halaman-halamannya. */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-surf-1 pb-[env(safe-area-inset-bottom)] lg:hidden">
        <div className="flex items-stretch">
          {tabs.map(({ href, label, icon: Icon }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex min-w-0 flex-1 flex-col items-center justify-center gap-1 py-2.5 text-[10.5px] transition-colors",
                  active ? "font-medium text-tx-1" : "text-tx-3"
                )}
              >
                {active && <span aria-hidden className="absolute inset-x-5 top-0 h-[2px] bg-tx-1" />}
                <Icon className="size-[18px] shrink-0" strokeWidth={1.75} />
                <span className="w-full truncate text-center">{label}</span>
              </Link>
            );
          })}
          <button
            onClick={() => setOpen(true)}
            aria-label="Menu lainnya"
            aria-expanded={open}
            className={cn(
              "relative flex min-w-0 flex-1 flex-col items-center justify-center gap-1 py-2.5 text-[10.5px] transition-colors",
              onOverflowRoute ? "font-medium text-tx-1" : "text-tx-3"
            )}
          >
            {onOverflowRoute && <span aria-hidden className="absolute inset-x-5 top-0 h-[2px] bg-tx-1" />}
            <Ellipsis className="size-[18px] shrink-0" strokeWidth={1.75} />
            <span className="w-full truncate text-center">Lainnya</span>
          </button>
        </div>
      </nav>

      {/* Sheet naik dari bawah, bukan drawer dari samping — asalnya dari
          tombol di bar bawah, jadi arah munculnya mengikuti tombolnya. */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/45" onClick={() => setOpen(false)} />
          <div className="overlay absolute inset-x-0 bottom-0 flex max-h-[88vh] flex-col overflow-y-auto rounded-t-2xl px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-3">
            <div className="mx-auto mb-4 h-1 w-10 shrink-0 rounded-full bg-line" />
            <div className="flex items-center justify-between">
              <Brand compact />
              <button
                onClick={() => setOpen(false)}
                aria-label="Tutup navigasi"
                className="flex size-9 shrink-0 items-center justify-center rounded-md border border-line text-tx-2"
              >
                <X className="size-4" />
              </button>
            </div>
            <NavLinks pathname={pathname} onNavigate={() => setOpen(false)} />
            <div className="mt-6">
              <FooterActions onLogout={logout} />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
