"use client";

import { cn } from "@/lib/utils";
import { useEffect, useRef, useState, useCallback } from "react";
import { authFetch } from "@/lib/auth-fetch";

/* ── Panel kaca ──────────────────────────────────────────────────────── */

export function Glass({
  className,
  children,
  hover = false,
}: {
  className?: string;
  children: React.ReactNode;
  hover?: boolean;
}) {
  return (
    <div className={cn("glass rounded-3xl", hover && "glass-hover", className)}>
      {children}
    </div>
  );
}

/* ── Status ──────────────────────────────────────────────────────────── */

export type Tone = "ok" | "warn" | "bad" | "idle";

const TONE: Record<Tone, { dot: string; text: string; ring: string }> = {
  ok:   { dot: "bg-emerald-400", text: "text-emerald-300", ring: "rgb(52 211 153 / 0.55)" },
  warn: { dot: "bg-amber-400",   text: "text-amber-300",   ring: "rgb(251 191 36 / 0.55)" },
  bad:  { dot: "bg-rose-400",    text: "text-rose-300",    ring: "rgb(251 113 133 / 0.55)" },
  idle: { dot: "bg-zinc-500",    text: "text-zinc-400",    ring: "rgb(161 161 170 / 0.4)" },
};

export function StatusDot({ tone, live = false }: { tone: Tone; live?: boolean }) {
  return (
    <span
      className={cn("inline-block size-2 rounded-full", TONE[tone].dot, live && "live-dot")}
      style={live ? ({ "--ring-color": TONE[tone].ring } as React.CSSProperties) : undefined}
    />
  );
}

export function Pill({
  tone = "idle",
  children,
}: {
  tone?: Tone;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1",
        "text-[11px] font-medium border border-white/10 bg-white/[0.04]",
        TONE[tone].text
      )}
    >
      {children}
    </span>
  );
}

/* ── Kartu metrik ────────────────────────────────────────────────────── */

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
    <Glass hover className={cn("p-5", className)}>
      <div className="flex items-center gap-2 text-[11px] uppercase tracking-widest text-zinc-500">
        <StatusDot tone={tone} />
        {label}
      </div>
      <div className={cn("num mt-3 text-3xl font-semibold", TONE[tone].text)}>
        {value}
      </div>
      {sub ? <div className="mt-1.5 text-xs text-zinc-500">{sub}</div> : null}
    </Glass>
  );
}

/* ── Grafik batang mungil (tanpa dependensi) ─────────────────────────── */

export function Bars({
  data,
  className,
}: {
  data: { label: string; a: number; b: number }[];
  className?: string;
}) {
  const max = Math.max(1, ...data.map((d) => d.a + d.b));
  return (
    <div className={cn("flex h-24 items-end gap-[3px]", className)}>
      {data.map((d, i) => (
        <div key={i} className="group relative flex-1" title={`${d.label} · tulis ${d.b} · baca ${d.a}`}>
          <div className="flex w-full flex-col justify-end gap-[2px]" style={{ height: "6rem" }}>
            {d.a > 0 && (
              <div
                className="w-full rounded-t-[3px] bg-sky-400/70"
                style={{ height: `${(d.a / max) * 100}%` }}
              />
            )}
            {d.b > 0 && (
              <div
                className={cn("w-full bg-violet-400/60", d.a === 0 && "rounded-t-[3px]")}
                style={{ height: `${(d.b / max) * 100}%` }}
              />
            )}
            {d.a + d.b === 0 && <div className="h-[2px] w-full rounded bg-white/5" />}
          </div>
        </div>
      ))}
    </div>
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
      // Jangan polling saat tab tersembunyi — dasbor ini dibiarkan terbuka
      // berjam-jam; tanpa ini dia terus menembak DB tanpa ada yang melihat.
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
