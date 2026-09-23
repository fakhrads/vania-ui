"use client";

import { useState } from "react";
import { Sidebar } from "@/components/sidebar";
import { Guard } from "@/components/guard";
import { Panel, StatusDot, useLive, type Tone } from "@/components/monitor";
import { cn } from "@/lib/utils";
import { PageHeader, LiveStamp } from "@/components/page-header";
import { Pager } from "@/components/controls";

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
  recall: "text-entity bg-idle-tint",
  repair: "text-bad bg-bad-tint",
  sync_file: "text-tx-2 bg-idle-tint",
  edit: "text-warn bg-warn-tint",
};

export default function Audit() {
  const [page, setPage] = useState(1);
  const { data, at, err } = useLive<{ items: Op[]; pagination: { total: number; totalPages: number } }>(
    `/api/ops?page=${page}&per_page=40`,
    6000
  );
  const items = data?.items ?? [];

  return (
    <Guard>
    <div className="flex min-h-screen flex-col lg:flex-row">
      <Sidebar />

      <main className="min-w-0 flex-1 px-5 pb-28 pt-7 sm:px-8 lg:px-12 lg:pb-12 lg:pt-10">
        <PageHeader
          title="Audit"
          actions={
            <LiveStamp at={at} err={err}>
              <StatusDot tone={err ? "bad" : "ok"} live={!err} />
            </LiveStamp>
          }
        >
          Setiap operasi memori · <span className="num text-tx-2">vania_ltm_ops</span> · 40 per halaman
        </PageHeader>

        <Panel className="overflow-hidden">
          <div className="kicker hidden items-center gap-4 border-b border-line bg-sunken/60 px-5 py-2.5 md:flex">
            <span className="w-[92px]">waktu</span>
            <span className="w-2.5" />
            <span className="w-[84px]">aksi</span>
            <span className="w-16">sumber</span>
            <span className="w-14">scope</span>
            <span className="w-14 text-right">baris</span>
            <span className="flex-1">catatan</span>
          </div>
          <div className="divide-y divide-line-soft">
            {items.map((o) => (
              <div
                key={o.id}
                className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-2.5 md:gap-x-4 md:px-5 transition-colors hover:bg-sunken/60"
              >
                <span className="num shrink-0 text-[12px] text-tx-3 md:w-[92px]">
                  {new Date(o.ts).toLocaleString("id-ID", {
                    day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
                  })}
                </span>
                <StatusDot tone={STATUS_TONE[o.status] ?? "idle"} />
                <span
                  className={cn(
                    "num shrink-0 rounded-[4px] px-1.5 py-px text-center text-[11px] md:w-[84px]",
                    ACTION[o.action] ?? ACTION.sync_file
                  )}
                >
                  {o.action}
                </span>
                <span className="shrink-0 truncate text-[12px] text-tx-3 md:w-16">{o.source ?? "—"}</span>
                <span className="shrink-0 text-[12px] text-tx-2 md:w-14">{o.scope}</span>
                <span className="num shrink-0 text-[12px] md:w-14 md:text-right">
                  {o.rows_added > 0 && <span className="text-ok">+{o.rows_added} </span>}
                  {o.rows_evicted > 0 && <span className="text-evicted">−{o.rows_evicted}</span>}
                </span>
                <span
                  className={cn(
                    "min-w-0 flex-1 basis-full truncate text-[12px] md:basis-0",
                    o.status === "error" ? "text-bad" : "text-tx-3"
                  )}
                  title={o.error_msg ?? undefined}
                >
                  {o.error_msg}
                </span>
              </div>
            ))}

            {!items.length && (
              <div className="px-5 py-12 text-center text-sm text-tx-3">Belum ada operasi.</div>
            )}
          </div>
        </Panel>

        <Pager
          page={page}
          pages={data?.pagination.totalPages ?? 1}
          onPage={setPage}
          total={data?.pagination.total}
        />
      </main>
    </div>
    </Guard>
  );
}
