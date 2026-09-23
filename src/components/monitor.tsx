"use client";

import { cn } from "@/lib/utils";
import { useEffect, useRef, useState, useCallback } from "react";
import { authFetch } from "@/lib/auth-fetch";

/* ── Permukaan ───────────────────────────────────────────────────────── */

export function Panel({
  className,
  children,
  hover = false,
  level = 1,
}: {
  className?: string;
  children?: React.ReactNode;
  hover?: boolean;
  level?: 1 | 2 | 3;
}) {
  return (
    <div
      className={cn(
        level === 1 && "panel",
        level === 2 && "raised-2",
        level === 3 && "overlay",
        hover && "panel-hover",
        "rounded-xl",
        className
      )}
    >
      {children}
    </div>
  );
}

/* ── Status ──────────────────────────────────────────────────────────── */

export type Tone = "ok" | "warn" | "bad" | "idle" | "accent" | "purple";

const TONE: Record<Tone, { text: string; tint: string; mark: string; ring: string }> = {
  ok:     { text: "text-ok",           tint: "bg-ok-tint",     mark: "mark-ok",   ring: "var(--ok)" },
  warn:   { text: "text-warn",         tint: "bg-warn-tint",   mark: "mark-warn", ring: "var(--warn)" },
  bad:    { text: "text-bad",          tint: "bg-bad-tint",    mark: "mark-bad",  ring: "var(--bad)" },
  idle:   { text: "text-tx-2",         tint: "bg-idle-tint",   mark: "mark-idle", ring: "var(--idle)" },
  accent: { text: "text-accent-solid", tint: "bg-accent-tint", mark: "mark-ok",   ring: "var(--accent-solid)" },
  purple: { text: "text-entity",       tint: "bg-idle-tint",   mark: "mark-ok",   ring: "var(--entity)" },
};

/**
 * Penanda status. Bentuknya berbeda per tone, bukan cuma warnanya
 * (lihat .mark-* di globals.css): ok bulat, warn segitiga, bad belah
 * ketupat, idle cincin kosong. `live` menambah denyut cincin di belakang
 * tanda — satu-satunya animasi loop yang dibolehkan di dasbor ini.
 */
export function StatusDot({
  tone,
  live = false,
  size = 9,
}: {
  tone: Tone;
  live?: boolean;
  size?: number;
}) {
  const shape = (
    <span
      aria-hidden
      className={cn("mark", TONE[tone].mark, TONE[tone].text)}
      style={{ width: size, height: size }}
    />
  );
  if (!live) return shape;
  return (
    <span className="relative inline-flex shrink-0" style={{ width: size, height: size }}>
      <span
        aria-hidden
        className="live-dot absolute inset-0 rounded-full"
        style={{ ["--ring-color" as string]: `color-mix(in oklch, ${TONE[tone].ring} 55%, transparent)` }}
      />
      {shape}
    </span>
  );
}

export function Pill({
  tone = "idle",
  children,
  className,
}: {
  tone?: Tone;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-[5px] px-2 py-0.5 text-[11.5px] font-medium",
        TONE[tone].tint,
        TONE[tone].text,
        className
      )}
    >
      {children}
    </span>
  );
}

/**
 * Sel angka. Datar, dengan strip nada 2px di tepi atas — di barisan
 * empat sel, mata langsung menemukan yang bukan tinta biasa.
 */
export function Stat({
  label,
  value,
  sub,
  tone = "idle",
  className,
}: {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  tone?: Tone;
  className?: string;
}) {
  return (
    <Panel className={cn("relative overflow-hidden p-5", className)}>
      <span
        aria-hidden
        className={cn("absolute inset-x-0 top-0 h-[2px]", tone === "idle" ? "bg-line" : "bg-current", TONE[tone].text)}
      />
      <div className="kicker flex items-center gap-2">
        <StatusDot tone={tone} size={7} />
        {label}
      </div>
      <div className={cn("num mt-4 text-[34px] font-medium leading-none", tone === "idle" ? "text-tx-1" : TONE[tone].text)}>
        {value}
      </div>
      {sub ? <div className="mt-2.5 text-xs text-tx-3">{sub}</div> : null}
    </Panel>
  );
}

/* ── Polling sadar-visibilitas ───────────────────────────────────────── */

export function useLive<T>(url: string, ms = 5000) {
  const [data, setData] = useState<T | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [at, setAt] = useState<Date | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const tick = useCallback(async () => {
    try {
      const res = await authFetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setData(await res.json());
      setErr(null);
      setAt(new Date());
    } catch (e) {
      setErr(e instanceof Error ? e.message : "gagal memuat");
    }
  }, [url]);

  useEffect(() => {
    let stop = false;
    const loop = async () => {
      if (!document.hidden) await tick();
      if (!stop) timer.current = setTimeout(loop, ms);
    };
    loop();
    const onVis = () => { if (!document.hidden) tick(); };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      stop = true;
      if (timer.current) clearTimeout(timer.current);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [tick, ms]);

  return { data, err, at, refresh: tick };
}

/* ── Util ────────────────────────────────────────────────────────────── */

export function ago(seconds: number | null | undefined) {
  if (seconds == null) return "—";
  if (seconds < 60) return `${Math.max(0, Math.round(seconds))} dtk lalu`;
  if (seconds < 3600) return `${Math.round(seconds / 60)} mnt lalu`;
  if (seconds < 86400) return `${Math.round(seconds / 3600)} jam lalu`;
  return `${Math.round(seconds / 86400)} hari lalu`;
}

/* Nada per tier korpus & aksi audit — dipakai lintas halaman. */
export const KIND_CLASS: Record<string, string> = {
  seed: "text-seed bg-accent-tint",
  active: "text-active bg-ok-tint",
  evicted: "text-evicted bg-warn-tint",
  archive: "text-tx-2 bg-idle-tint",
  resampled: "text-seed bg-idle-tint",
  reasoning: "text-entity bg-idle-tint",
  quarantine: "text-bad bg-bad-tint ring-1 ring-inset ring-bad/40",
};
