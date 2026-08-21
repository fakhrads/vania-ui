"use client";

import { useState } from "react";
import { Sidebar } from "@/components/sidebar";
import { Guard } from "@/components/guard";
import { Glass, StatusDot, Pill, useLive, type Tone } from "@/components/monitor";
import { cn } from "@/lib/utils";

type Op = {
  id: number; ts: string; action: string; target: string; status: string;
  error_msg: string | null; content_hash: string | null; source: string;
  matched_row_id: number | null; rows_added: number; rows_evicted: number;
  scope: string; session_id: string | null;
};

const STATUS_TONE: Record<string, Tone> = { ok: "ok", skip: "warn", error: "bad" };

const ACTION: Record<string, string> = {
  add: "text-emerald-300 border-emerald-400/25 bg-emerald-400/10",
  replace: "text-sky-300 border-sky-400/25 bg-sky-400/10",
  remove: "text-amber-300 border-amber-400/25 bg-amber-400/10",
  recall: "text-violet-300 border-violet-400/25 bg-violet-400/10",
  repair: "text-rose-300 border-rose-400/25 bg-rose-400/10",
  sync_file: "text-zinc-400 border-white/10 bg-white/5",
  edit: "text-orange-300 border-orange-400/25 bg-orange-400/10",
};

export default function Audit() {
  const [page, setPage] = useState(1);
  const { data, at } = useLive<{ items: Op[]; pagination: { total: number; totalPages: number } }>(
    `/api/ops?page=${page}&per_page=40`,
    6000
  );
  const items = data?.items ?? [];

  return (
    <Guard>
    <div className="flex flex-col min-h-screen lg:flex-row">
      <div className="mesh-bg" />
      <Sidebar />

      <main className="flex-1 overflow-y-auto px-6 py-8 lg:px-10">
        <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-100">Audit</h1>
            <p className="mt-1 text-sm text-zinc-500">
              Setiap operasi memori · <span className="font-mono text-zinc-400">vania_ltm_ops</span>
            </p>
          </div>
          <Pill tone="ok">
            <StatusDot tone="ok" live />
            {at ? at.toLocaleTimeString("id-ID") : "…"}
          </Pill>
        </header>

        <Glass className="overflow-hidden p-0">
          <div className="divide-y divide-white/[0.05]">
            {items.map((o) => (
              <div key={o.id} className="flex flex-wrap items-center gap-3 px-5 py-3.5 transition-colors hover:bg-white/[0.03]">
                <StatusDot tone={STATUS_TONE[o.status] ?? "idle"} />

                <span className={cn("rounded-full border px-2.5 py-0.5 text-[11px]", ACTION[o.action] ?? ACTION.sync_file)}>
                  {o.action}
                </span>

                <span className={cn(
                  "rounded-full border px-2 py-0.5 text-[10px]",
                  o.source === "web"
                    ? "border-orange-400/25 bg-orange-400/10 text-orange-300"
                    : "border-white/[0.07] text-zinc-500"
                )}>
                  {o.source ?? "—"}
                </span>

                <span className="text-xs text-zinc-600">{o.scope}</span>

                <span className="num min-w-[5rem] text-xs">
                  {o.rows_added > 0 && <span className="text-emerald-400/80">+{o.rows_added} </span>}
                  {o.rows_evicted > 0 && <span className="text-amber-400/80">−{o.rows_evicted}</span>}
                </span>

                {o.error_msg && (
                  <span className={cn(
                    "flex-1 truncate text-xs",
                    o.status === "error" ? "text-rose-300/80" : "text-zinc-600"
                  )} title={o.error_msg}>
                    {o.error_msg}
                  </span>
                )}

                <span className="num ml-auto shrink-0 text-xs text-zinc-600">
                  {new Date(o.ts).toLocaleString("id-ID", {
                    day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
                  })}
                </span>
              </div>
            ))}

            {!items.length && (
              <div className="px-5 py-12 text-center text-sm text-zinc-600">Belum ada operasi.</div>
            )}
          </div>
        </Glass>

        {(data?.pagination.totalPages ?? 1) > 1 && (
          <div className="mt-6 flex items-center justify-center gap-3">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="glass glass-hover rounded-2xl px-4 py-2 text-sm text-zinc-400 disabled:opacity-30"
            >
              Sebelumnya
            </button>
            <span className="num text-sm text-zinc-500">
              {page} / {data?.pagination.totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(data?.pagination.totalPages ?? 1, p + 1))}
              disabled={page >= (data?.pagination.totalPages ?? 1)}
              className="glass glass-hover rounded-2xl px-4 py-2 text-sm text-zinc-400 disabled:opacity-30"
            >
              Berikutnya
            </button>
          </div>
        )}
      </main>
    </div>
    </Guard>
  );
}
