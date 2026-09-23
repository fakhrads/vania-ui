"use client";

import { useState } from "react";
import { Sidebar } from "@/components/sidebar";
import { Guard } from "@/components/guard";
import { useLive, Stat, StatusDot, type Tone } from "@/components/monitor";
import { GitBranch, RefreshCw, X } from "lucide-react";
import { PageHeader, LiveStamp } from "@/components/page-header";
import { cn } from "@/lib/utils";

interface Task {
  id: string;
  board_slug: string;
  title: string;
  body: string | null;
  assignee: string | null;
  status: string;
  priority: number;
  created_by: string | null;
  created_at: number;
  started_at: number | null;
  completed_at: number | null;
  workspace_kind: string;
  branch_name: string | null;
  consecutive_failures: number;
  last_failure_error: string | null;
  worker_pid: number | null;
  model_override: string | null;
}

interface KanbanData {
  ok: boolean;
  boards: string[];
  summary: {
    total: number;
    backlog: number;
    in_progress: number;
    review: number;
    done: number;
  };
  tasks: Task[];
}

/* Tiap kolom punya tone — nada yang sama dipakai di strip kepala kolom
   dan di tanda status kartu, jadi kolom bisa dikenali tanpa baca judulnya. */
const COLUMN_TONE: Record<string, Tone> = { backlog: "idle", in_progress: "accent", review: "warn", done: "ok" };

const COLUMNS = [
  { key: "backlog", label: "Backlog / To Do", filter: (t: Task) => t.status === "backlog" || t.status === "todo" },
  { key: "in_progress", label: "In Progress / Active", filter: (t: Task) => t.status === "in_progress" || t.status === "running" },
  { key: "review", label: "Review / Blocked", filter: (t: Task) => t.status === "review" || t.status === "blocked" },
  { key: "done", label: "Done / Completed", filter: (t: Task) => t.status === "done" || t.status === "completed" },
];

export default function KanbanPage() {
  const [selectedBoard, setSelectedBoard] = useState<string>("all");
  const endpoint = selectedBoard === "all" ? "/api/kanban" : `/api/kanban?board=${selectedBoard}`;
  const { data, refresh, at, err } = useLive<KanbanData>(endpoint, 3000);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  const boards = data?.boards || [];
  const summary = data?.summary || { total: 0, backlog: 0, in_progress: 0, review: 0, done: 0 };
  const tasks = data?.tasks || [];

  return (
    <Guard>
      <div className="flex min-h-screen flex-col lg:flex-row">
        <Sidebar />

        <main className="min-w-0 flex-1 px-5 pb-28 pt-7 sm:px-8 lg:px-12 lg:pb-12 lg:pt-10">
          <PageHeader
            title="Kanban"
            actions={
              <>
                {boards.length > 0 && (
                  <select
                    value={selectedBoard}
                    onChange={(e) => setSelectedBoard(e.target.value)}
                    aria-label="Board"
                    className="cursor-pointer rounded-md border border-line bg-surf-1 px-2.5 py-1.5 text-[12.5px] text-tx-1 outline-none"
                  >
                    <option value="all">Semua board ({boards.length})</option>
                    {boards.map((b) => (
                      <option key={b} value={b}>Board: {b}</option>
                    ))}
                  </select>
                )}
                <button
                  onClick={() => refresh()}
                  className="flex items-center gap-2 rounded-md border border-line bg-surf-1 px-3 py-1.5 text-[12.5px] text-tx-1 transition-colors hover:border-tx-3"
                >
                  <RefreshCw className="size-3.5 text-tx-3" /> Segarkan
                </button>
                <LiveStamp at={at} err={err}>
                  <StatusDot tone={err ? "bad" : "ok"} live={!err} />
                </LiveStamp>
              </>
            }
          >
            Pelacakan tugas multi-agent, pipeline otonom, dan status alur kerja Hermes.
          </PageHeader>

          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Stat label="Total tugas" value={summary.total} />
              <Stat label="Berjalan" tone="accent" value={summary.in_progress} />
              <Stat label="Backlog" value={summary.backlog} />
              <Stat label="Selesai" tone="ok" value={summary.done} />
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              {COLUMNS.map((col) => {
                const colTasks = tasks.filter(col.filter);
                const tone = COLUMN_TONE[col.key];
                return (
                  <section key={col.key} className="flex flex-col">
                    <div className="mb-2.5 flex items-center justify-between border-b-2 border-tx-1 pb-2">
                      <span className="flex items-center gap-2 text-[13px] font-semibold text-tx-1">
                        <StatusDot tone={tone} size={8} />
                        {col.label}
                      </span>
                      <span className="num text-[12px] text-tx-3">{colTasks.length}</span>
                    </div>

                    <div className="min-h-[200px] flex-1 space-y-2 xl:min-h-[420px]">
                      {colTasks.length === 0 ? (
                        <div className="flex h-24 items-center justify-center rounded-lg border border-dashed border-line text-[12px] text-tx-3">
                          Kosong
                        </div>
                      ) : (
                        colTasks.map((t) => (
                          <button
                            key={t.id}
                            onClick={() => setSelectedTask(t)}
                            className={cn(
                              "panel panel-hover block w-full rounded-lg p-3 text-left",
                              selectedTask?.id === t.id && "!border-tx-1"
                            )}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <span className="line-clamp-2 text-[13px] font-medium text-tx-1">{t.title}</span>
                              {t.priority > 0 && (
                                <span className="num shrink-0 rounded-[4px] bg-warn-tint px-1.5 py-px text-[10.5px] font-medium text-warn">
                                  P{t.priority}
                                </span>
                              )}
                            </div>
                            {t.body && (
                              <p className="mt-1.5 line-clamp-2 text-[12px] text-tx-3">{t.body}</p>
                            )}
                            <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-tx-3">
                              {t.board_slug && t.board_slug !== "default" && (
                                <span className="num text-accent-solid">{t.board_slug}</span>
                              )}
                              {t.assignee && <span className="text-tx-2">@{t.assignee}</span>}
                              {t.branch_name && (
                                <span className="num flex items-center gap-1">
                                  <GitBranch className="size-3" />
                                  {t.branch_name}
                                </span>
                              )}
                              {t.consecutive_failures > 0 && (
                                <span className="flex items-center gap-1 text-bad">
                                  <StatusDot tone="bad" size={7} />
                                  {t.consecutive_failures} gagal
                                </span>
                              )}
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  </section>
                );
              })}
            </div>

            {selectedTask && (
              <div className="panel space-y-4 rounded-xl p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="kicker flex flex-wrap items-center gap-x-3 gap-y-1">
                      <span className="text-tx-2">{selectedTask.status}</span>
                      <span className="!normal-case !tracking-normal">{selectedTask.id}</span>
                      {selectedTask.board_slug && <span>board · {selectedTask.board_slug}</span>}
                    </div>
                    <h3 className="display mt-2 text-[28px] text-tx-1">{selectedTask.title}</h3>
                  </div>
                  <button
                    onClick={() => setSelectedTask(null)}
                    aria-label="Tutup"
                    className="flex size-8 shrink-0 items-center justify-center rounded-md border border-line text-tx-2 hover:text-tx-1"
                  >
                    <X className="size-4" />
                  </button>
                </div>

                {selectedTask.body && (
                  <div className="num whitespace-pre-wrap rounded-md border border-line-soft bg-sunken p-3.5 text-[12.5px] leading-relaxed text-tx-2">
                    {selectedTask.body}
                  </div>
                )}

                <dl className="grid grid-cols-2 gap-x-6 gap-y-3 border-t border-line-soft pt-4 text-[12.5px] sm:grid-cols-4">
                  {[
                    ["Assignee", selectedTask.assignee || "—"],
                    ["Model override", selectedTask.model_override || "default"],
                    ["Worker PID", selectedTask.worker_pid || "—"],
                    ["Dibuat", new Date(selectedTask.created_at * 1000).toLocaleString("id-ID")],
                  ].map(([k, v]) => (
                    <div key={k as string}>
                      <dt className="kicker">{k}</dt>
                      <dd className="num mt-1 text-tx-1">{v}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            )}
          </div>
        </main>
      </div>
    </Guard>
  );
}
