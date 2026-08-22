"use client";

import { useCallback, useSyncExternalStore } from "react";

export type Mode = "system" | "light" | "dark";

const KEY = "vn_theme";

/**
 * Skrip yang ditanam di <head> dan jalan sebelum paint pertama.
 * Tanpa ini halaman selalu merender tema default dulu lalu melompat ke
 * tema pilihan — kedip putih di tiap page load buat yang pakai gelap.
 */
export const themeBootScript = `(function(){try{var m=localStorage.getItem('${KEY}')||'system';var d=m==='dark'||(m==='system'&&window.matchMedia('(prefers-color-scheme: dark)').matches);document.documentElement.classList.toggle('dark',d)}catch(e){}})();`;

/* ── Store kecil di luar React ────────────────────────────────────────────
   Pilihan tema hidup di localStorage + preferensi OS, dua-duanya sistem
   eksternal. Dibaca lewat useSyncExternalStore, bukan useState+useEffect:
   React memakai snapshot server saat hydrate lalu merender ulang dengan
   nilai klien, jadi tidak ada ketidakcocokan hydration dan tidak ada
   render berantai.                                                        */

const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  const mq = window.matchMedia("(prefers-color-scheme: dark)");
  mq.addEventListener("change", cb);
  window.addEventListener("storage", cb);
  return () => {
    listeners.delete(cb);
    mq.removeEventListener("change", cb);
    window.removeEventListener("storage", cb);
  };
}

function readMode(): Mode {
  try {
    return (localStorage.getItem(KEY) as Mode | null) ?? "system";
  } catch {
    return "system";
  }
}

function readIsDark(): boolean {
  const m = readMode();
  if (m === "dark") return true;
  if (m === "light") return false;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

/** Preferensi OS tidak terbaca di server; "system" adalah tebakan netral. */
const serverMode = (): Mode => "system";
const serverIsDark = () => false;

export function useTheme() {
  const mode = useSyncExternalStore(subscribe, readMode, serverMode);
  const isDark = useSyncExternalStore(subscribe, readIsDark, serverIsDark);

  const setMode = useCallback((m: Mode) => {
    try {
      localStorage.setItem(KEY, m);
    } catch {
      /* mode privat / storage diblokir — tema tetap berlaku untuk sesi ini */
    }
    const d =
      m === "dark" ||
      (m === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
    document.documentElement.classList.toggle("dark", d);
    emit();
  }, []);

  return { mode, isDark, setMode };
}
