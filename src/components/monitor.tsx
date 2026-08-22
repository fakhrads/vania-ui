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
        "rounded-2xl",
        className
      )}
    >
      {children}
    </div>
  );
}

/* ── Status ──────────────────────────────────────────────────────────── */

export type Tone = "ok" | "warn" | "bad" | "idle";

const TONE: Record<Tone, { text: string; tint: string; ring: string }> = {
  ok:   { text: "text-ok",   tint: "bg-ok-tint",   ring: "var(--ok)" },
  warn: { text: "text-warn", tint: "bg-warn-tint", ring: "var(--warn)" },
  bad:  { text: "text-bad",  tint: "bg-bad-tint",  ring: "var(--bad)" },
  idle: { text: "text-tx-2", tint: "bg-idle-tint", ring: "var(--idle)" },
};

/**
 * Penanda status. Bentuknya berbeda per tone, bukan cuma warnanya —
 * emerald lawan rose tidak terbedakan untuk mata yang sulit membedakan
 * merah-hijau, dan status adalah sinyal terpenting di panel ini.
 */
export function StatusDot({
  tone,
  live = false,
  size = 10,
}: {
  tone: Tone;
  live?: boolean;
  size?: number;
}) {
  const fill = `var(--${tone === "idle" ? "idle" : tone})`;
  const shape =
    tone === "ok" ? (
      <circle cx="5" cy="5" r="4" fill={fill} />
    ) : tone === "warn" ? (
      <path d="M5 1 9.3 8.5H.7Z" fill={fill} />
    ) : tone === "bad" ? (
      <path d="M5 .6 9.4 5 5 9.4.6 5Z" fill={fill} />
    ) : (
      <circle cx="5" cy="5" r="3.4" fill="none" stroke={fill} strokeWidth="1.6" />
    );

  return (
    <span
      className={cn("inline-flex shrink-0 items-center justify-center rounded-full", live && "live-dot")}
      style={live ? ({ "--ring-color": TONE[tone].ring } as React.CSSProperties) : undefined}
    >
      <svg width={size} height={size} viewBox="0 0 10 10" aria-hidden="true">
        {shape}
      </svg>
    </span>
  );
}

export function Pill({
  tone = "idle",
  children,
  className,
}: {
  tone?: Tone;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium",
        TONE[tone].tint,
        TONE[tone].text,
        className
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
    <Panel hover className={cn("p-5", className)}>
      <div className="flex items-center gap-2 text-[10.5px] uppercase tracking-[0.14em] text-tx-3">
        <StatusDot tone={tone} />
        {label}
      </div>
      <div className={cn("num mt-3 text-3xl font-semibold", TONE[tone].text)}>{value}</div>
      {sub ? <div className="mt-1.5 text-xs text-tx-3">{sub}</div> : null}
    </Panel>
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
    <div className={cn("well flex h-28 items-end gap-[3px] rounded-xl px-2.5 py-2", className)}>
      {data.map((d, i) => (
        <div key={i} className="group relative flex-1" title={`${d.label} · tulis ${d.b} · baca ${d.a}`}>
          <div className="flex h-24 w-full flex-col justify-end gap-[2px]">
            {d.a > 0 && (
              <div
                className="w-full rounded-t-[3px] bg-read"
                style={{ height: `${(d.a / max) * 100}%` }}
              />
            )}
            {d.b > 0 && (
              <div
                className={cn("w-full bg-write", d.a === 0 && "rounded-t-[3px]")}
                style={{ height: `${(d.b / max) * 100}%` }}
              />
            )}
            {d.a + d.b === 0 && <div className="h-[2px] w-full rounded bg-line" />}
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

/* Nada per tier korpus & aksi audit — dipakai lintas halaman. */
export const KIND_CLASS: Record<string, string> = {
  seed: "text-seed bg-accent-tint",
  active: "text-active bg-ok-tint",
  evicted: "text-evicted bg-warn-tint",
  archive: "text-tx-2 bg-idle-tint",
};
