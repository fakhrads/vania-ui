"use client";

import { useState } from "react";
import { Sidebar } from "@/components/sidebar";
import { Guard } from "@/components/guard";
import { Panel, StatusDot, useLive, type Tone } from "@/components/monitor";
import { cn } from "@/lib/utils";

type Op = {
  id: number; ts: string; action: string; target: string; status: string;
  error_msg: string | null; content_hash: string | null; source: string;
  matched_row_id: number | null; rows_added: number; rows_evicted: number;
  scope: string; session_id: string | null;
};

const STATUS_TONE: Record<string, Tone> = { ok: "ok", skip: "warn", error: "bad" };

const ACTION: Record<string, string> = {
  add: "text-active bg-ok-tint",
  replace: "text-seed bg-accent-tint",
  remove: "text-evicted bg-warn-tint",
  recall: "text-entity bg-accent-tint",
  repair: "text-bad bg-bad-tint",
  sync_file: "text-tx-2 bg-idle-tint",
  edit: "text-warn bg-warn-tint",
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
    <div className="flex min-h-screen flex-col lg:flex-row">
      <Sidebar />

      <main className="flex-1 overflow-y-auto px-6 pb-28 pt-8 lg:px-10 lg:pb-8">
        <header className="mb-6 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-[25px] font-semibold tracking-[-0.025em] text-tx-1">Audit</h1>
            <p className="mt-1 text-sm text-tx-3">
              Setiap operasi memori · <span className="num text-tx-2">vania_ltm_ops</span>
            </p>
          </div>
          <div className="panel flex items-center gap-2 rounded-full px-3.5 py-2 text-xs">
            <StatusDot tone="ok" live />
            <span className="num text-ok">{at ? at.toLocaleTimeString("id-ID") : "…"}</span>
          </div>
        </header>

        <div className="hidden items-center gap-3.5 px-5 pb-3 text-[10.5px] uppercase tracking-[0.12em] text-tx-3 md:flex">
          <span className="w-2.5" />
          <span className="w-[78px] text-center">aksi</span>
          <span className="w-14">sumber</span>
          <span className="w-14">scope</span>
          <span className="w-16">baris</span>
          <span className="flex-1">catatan</span>
          <span>waktu</span>
        </div>

        <Panel className="overflow-hidden p-px">
          <div className="divide-y divide-line-soft">
            {items.map((o) => (
              <div
                key={o.id}
                className="flex flex-wrap items-center gap-3.5 px-5 py-3 transition-colors hover:bg-sunken"
              >
                <StatusDot tone={STATUS_TONE[o.status] ?? "idle"} />

                <span
                  className={cn(
                    "num w-[78px] rounded-full px-2.5 py-0.5 text-center text-[11px]",
                    ACTION[o.action] ?? ACTION.sync_file
                  )}
                >
                  {o.action}
                </span>

                <span className="w-14 text-[11px] text-tx-3">{o.source ?? "—"}</span>
                <span className="w-14 text-xs text-tx-2">{o.scope}</span>

                <span className="num w-16 text-xs">
                  {o.rows_added > 0 && <span className="text-ok">+{o.rows_added} </span>}
                  {o.rows_evicted > 0 && <span className="text-evicted">−{o.rows_evicted}</span>}
                </span>

                <span
                  className={cn(
                    "flex-1 truncate text-xs",
                    o.status === "error" ? "text-bad" : "text-tx-3"
                  )}
                  title={o.error_msg ?? undefined}
                >
                  {o.error_msg}
                </span>

                <span className="num ml-auto shrink-0 text-xs text-tx-3">
                  {new Date(o.ts).toLocaleString("id-ID", {
                    day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
                  })}
                </span>
              </div>
            ))}

            {!items.length && (
              <div className="px-5 py-12 text-center text-sm text-tx-3">Belum ada operasi.</div>
            )}
          </div>
        </Panel>

        {(data?.pagination.totalPages ?? 1) > 1 && (
          <div className="mt-6 flex items-center justify-center gap-3.5">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="raised rounded-xl px-4 py-2 text-sm text-tx-1 transition-opacity disabled:opacity-40 disabled:shadow-none"
            >
              Sebelumnya
            </button>
            <span className="num text-sm text-tx-2">
              {page} / {data?.pagination.totalPages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(data?.pagination.totalPages ?? 1, p + 1))}
              disabled={page >= (data?.pagination.totalPages ?? 1)}
              className="raised rounded-xl px-4 py-2 text-sm text-tx-1 transition-opacity disabled:opacity-40 disabled:shadow-none"
            >
              Berikutnya
            </button>
          </div>
        )}

        <p className="mt-6 text-center text-[11px] text-tx-3">
          <span className="num">{(data?.pagination.total ?? 0).toLocaleString("id-ID")}</span> operasi · 40 per halaman
        </p>
      </main>
    </div>
    </Guard>
  );
}
