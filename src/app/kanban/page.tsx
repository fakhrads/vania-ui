"use client";

import { useState } from "react";
import { Guard } from "@/components/guard";
import { useLive } from "@/components/monitor";
import { Stat, StatusDot, Pill } from "@/components/monitor";
import {
  Kanban as KanbanIcon, CheckCircle2, Clock, AlertCircle, PlayCircle,
  Cpu, GitBranch, RefreshCw, Layers
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Task {
  id: string;
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
  workflow_template_id: string | null;
  current_step_key: string | null;
  model_override: string | null;
  last_heartbeat_at: number | null;
}

interface KanbanData {
  ok: boolean;
  summary: {
    total: number;
    backlog: number;
    in_progress: number;
    review: number;
    done: number;
  };
  tasks: Task[];
}

const COLUMNS = [
  { key: "backlog", label: "Backlog / To Do", filter: (t: Task) => t.status === "backlog" || t.status === "todo" },
  { key: "in_progress", label: "In Progress / Active", filter: (t: Task) => t.status === "in_progress" || t.status === "running" },
  { key: "review", label: "Review / Blocked", filter: (t: Task) => t.status === "review" || t.status === "blocked" },
  { key: "done", label: "Done / Completed", filter: (t: Task) => t.status === "done" || t.status === "completed" },
];

export default function KanbanPage() {
  const { data, err, refresh } = useLive<KanbanData>("/api/kanban", 3000);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  const summary = data?.summary || { total: 0, backlog: 0, in_progress: 0, review: 0, done: 0 };
  const tasks = data?.tasks || [];

  return (
    <Guard>
      <div className="space-y-6">
        {/* Header Soft-Depth */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl font-semibold tracking-tight text-tx-1">Kanban Board & Pipeline</h1>
              <span className="live-dot" />
            </div>
            <p className="mt-1 text-[13px] text-tx-3">
              Pelacakan tugas multi-agent, pipeline autonomous, dan status alur kerja Hermes.
            </p>
          </div>
          <button
            onClick={() => refresh()}
            className="raised flex items-center gap-2 rounded-xl px-3.5 py-2 text-[13px] font-medium text-tx-1 transition-transform active:scale-95"
          >
            <RefreshCw className="size-3.5 text-tx-3" />
            Segarkan
          </button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-4">
          <div className="panel flex flex-col justify-between p-4">
            <span className="text-[12px] font-medium text-tx-3">Total Tasks</span>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-2xl font-semibold tracking-tight text-tx-1">{summary.total}</span>
              <Layers className="size-4 text-tx-3" />
            </div>
          </div>
          <div className="panel flex flex-col justify-between p-4">
            <span className="text-[12px] font-medium text-tx-3">In Progress</span>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-2xl font-semibold tracking-tight text-accent-solid">{summary.in_progress}</span>
              <PlayCircle className="size-4 text-accent-solid" />
            </div>
          </div>
          <div className="panel flex flex-col justify-between p-4">
            <span className="text-[12px] font-medium text-tx-3">Backlog</span>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-2xl font-semibold tracking-tight text-tx-2">{summary.backlog}</span>
              <Clock className="size-4 text-tx-3" />
            </div>
          </div>
          <div className="panel flex flex-col justify-between p-4">
            <span className="text-[12px] font-medium text-tx-3">Selesai</span>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-2xl font-semibold tracking-tight text-emerald-400">{summary.done}</span>
              <CheckCircle2 className="size-4 text-emerald-400" />
            </div>
          </div>
        </div>

        {/* Board Columns (Soft-Depth Surface Layout) */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
          {COLUMNS.map((col) => {
            const colTasks = tasks.filter(col.filter);
            return (
              <div key={col.key} className="panel flex flex-col rounded-2xl p-3.5">
                <div className="flex items-center justify-between px-1 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-[13px] font-semibold text-tx-1">{col.label}</span>
                  </div>
                  <span className="well rounded-lg px-2 py-0.5 text-[11px] font-medium text-tx-3">
                    {colTasks.length}
                  </span>
                </div>

                <div className="well flex-1 space-y-2.5 rounded-xl p-2 min-h-[420px] overflow-y-auto">
                  {colTasks.length === 0 ? (
                    <div className="flex h-32 items-center justify-center text-[12px] text-tx-3">
                      Kosong
                    </div>
                  ) : (
                    colTasks.map((t) => (
                      <div
                        key={t.id}
                        onClick={() => setSelectedTask(t)}
                        className={cn(
                          "raised cursor-pointer rounded-xl p-3 text-left transition-all hover:border-accent-border/50",
                          selectedTask?.id === t.id && "border-accent-solid ring-1 ring-accent-solid/30"
                        )}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className="line-clamp-2 text-[13px] font-medium text-tx-1">
                            {t.title}
                          </span>
                          {t.priority > 0 && (
                            <span className="shrink-0 rounded bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-medium text-amber-400">
                              P{t.priority}
                            </span>
                          )}
                        </div>

                        {t.body && (
                          <p className="mt-1.5 line-clamp-2 text-[11.5px] text-tx-3">
                            {t.body}
                          </p>
                        )}

                        <div className="mt-3 flex flex-wrap items-center gap-1.5 text-[11px] text-tx-3">
                          {t.assignee && (
                            <span className="well rounded-md px-1.5 py-0.5 text-tx-2">
                              {t.assignee}
                            </span>
                          )}
                          {t.branch_name && (
                            <span className="flex items-center gap-1 well rounded-md px-1.5 py-0.5 text-tx-3 font-mono text-[10px]">
                              <GitBranch className="size-3" />
                              {t.branch_name}
                            </span>
                          )}
                          {t.consecutive_failures > 0 && (
                            <span className="flex items-center gap-1 rounded-md bg-rose-500/10 px-1.5 py-0.5 text-rose-400 text-[10px]">
                              <AlertCircle className="size-3" />
                              {t.consecutive_failures} fail
                            </span>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Task Detail Drawer / Modal View */}
        {selectedTask && (
          <div className="panel space-y-4 rounded-2xl p-5 border border-accent-border/30">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="well rounded-md px-2 py-0.5 font-mono text-[11px] text-tx-3">
                    {selectedTask.id}
                  </span>
                  <span className="rounded-md bg-accent-solid/10 px-2 py-0.5 text-[11px] font-medium text-accent-solid">
                    {selectedTask.status}
                  </span>
                </div>
                <h3 className="mt-2 text-base font-semibold text-tx-1">{selectedTask.title}</h3>
              </div>
              <button
                onClick={() => setSelectedTask(null)}
                className="well rounded-lg px-2.5 py-1 text-[12px] text-tx-3 hover:text-tx-1"
              >
                Tutup
              </button>
            </div>

            {selectedTask.body && (
              <div className="well rounded-xl p-3.5 text-[12.5px] leading-relaxed text-tx-2 font-mono whitespace-pre-wrap">
                {selectedTask.body}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 text-[12px] sm:grid-cols-4">
              <div className="panel p-3">
                <span className="text-tx-3">Assignee:</span>
                <p className="mt-1 font-medium text-tx-1">{selectedTask.assignee || "—"}</p>
              </div>
              <div className="panel p-3">
                <span className="text-tx-3">Model Override:</span>
                <p className="mt-1 font-mono text-tx-1">{selectedTask.model_override || "default"}</p>
              </div>
              <div className="panel p-3">
                <span className="text-tx-3">Worker PID:</span>
                <p className="mt-1 font-mono text-tx-1">{selectedTask.worker_pid || "—"}</p>
              </div>
              <div className="panel p-3">
                <span className="text-tx-3">Dibuat:</span>
                <p className="mt-1 text-tx-1">
                  {new Date(selectedTask.created_at * 1000).toLocaleString("id-ID")}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </Guard>
  );
}
