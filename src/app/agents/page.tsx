"use client";

import { useState } from "react";
import { Guard } from "@/components/guard";
import { useLive } from "@/components/monitor";
import {
  Bot, CheckCircle2, Clock, AlertCircle, PlayCircle,
  Terminal, RefreshCw, Layers, FileText, ChevronRight
} from "lucide-react";
import { cn } from "@/lib/utils";
import { authFetch } from "@/lib/auth-fetch";

interface Delegation {
  delegation_id: string;
  origin_session: string;
  parent_session_id: string | null;
  state: string;
  dispatched_at: number;
  completed_at: number | null;
  updated_at: number;
  delivery_state: string;
  owner_pid: number | null;
  task_json: string | null;
  result_json: string | null;
}

interface AgentsData {
  ok: boolean;
  summary: {
    total: number;
    running: number;
    completed: number;
    failed: number;
  };
  delegations: Delegation[];
}

export default function AgentsPage() {
  const { data, refresh } = useLive<AgentsData>("/api/agents", 3000);
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null);
  const [agentLogs, setAgentLogs] = useState<any[] | null>(null);
  const [loadingLogs, setLoadingLogs] = useState(false);

  const summary = data?.summary || { total: 0, running: 0, completed: 0, failed: 0 };
  const delegations = data?.delegations || [];

  const handleSelectAgent = async (id: string) => {
    setSelectedAgentId(id);
    setLoadingLogs(true);
    try {
      const res = await authFetch(`/api/agents?id=${id}`);
      const json = await res.json();
      if (json.ok) {
        setAgentLogs(json.logs || []);
      }
    } catch (e) {
      console.error("Failed to load agent logs:", e);
    } finally {
      setLoadingLogs(false);
    }
  };

  return (
    <Guard>
      <div className="space-y-6">
        {/* Header Soft-Depth */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl font-semibold tracking-tight text-tx-1">Subagent Live Tracking</h1>
              <span className="live-dot" />
            </div>
            <p className="mt-1 text-[13px] text-tx-3">
              Pantau siklus delegasi agent anak, konsumsi resources, dan live terminal transcript.
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
            <span className="text-[12px] font-medium text-tx-3">Total Delegations</span>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-2xl font-semibold tracking-tight text-tx-1">{summary.total}</span>
              <Layers className="size-4 text-tx-3" />
            </div>
          </div>
          <div className="panel flex flex-col justify-between p-4">
            <span className="text-[12px] font-medium text-tx-3">Running Active</span>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-2xl font-semibold tracking-tight text-accent-solid">{summary.running}</span>
              <PlayCircle className="size-4 text-accent-solid" />
            </div>
          </div>
          <div className="panel flex flex-col justify-between p-4">
            <span className="text-[12px] font-medium text-tx-3">Selesai</span>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-2xl font-semibold tracking-tight text-emerald-400">{summary.completed}</span>
              <CheckCircle2 className="size-4 text-emerald-400" />
            </div>
          </div>
          <div className="panel flex flex-col justify-between p-4">
            <span className="text-[12px] font-medium text-tx-3">Error / Failed</span>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-2xl font-semibold tracking-tight text-rose-400">{summary.failed}</span>
              <AlertCircle className="size-4 text-rose-400" />
            </div>
          </div>
        </div>

        {/* Subagent List & Transcript Viewer Layout */}
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
          {/* Subagent List */}
          <div className="panel lg:col-span-5 rounded-2xl p-4 space-y-3">
            <h2 className="text-[13.5px] font-semibold text-tx-1 px-1">Daftar Subagent</h2>
            <div className="well space-y-2 rounded-xl p-2 max-h-[560px] overflow-y-auto">
              {delegations.length === 0 ? (
                <div className="flex h-32 items-center justify-center text-[12px] text-tx-3">
                  Belum ada riwayat subagent.
                </div>
              ) : (
                delegations.map((d) => {
                  let taskData: any = {};
                  try {
                    taskData = d.task_json ? JSON.parse(d.task_json) : {};
                  } catch {}

                  const isSelected = selectedAgentId === d.delegation_id;
                  const isRunning = d.state === "running" || d.state === "in_progress";

                  return (
                    <div
                      key={d.delegation_id}
                      onClick={() => handleSelectAgent(d.delegation_id)}
                      className={cn(
                        "raised cursor-pointer rounded-xl p-3 text-left transition-all hover:border-accent-border/50",
                        isSelected && "border-accent-solid ring-1 ring-accent-solid/30"
                      )}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <Bot className={cn("size-4", isRunning ? "text-accent-solid animate-pulse" : "text-tx-3")} />
                          <span className="font-mono text-[11px] text-tx-2 truncate max-w-[140px]">
                            {d.delegation_id}
                          </span>
                        </div>
                        <span
                          className={cn(
                            "rounded-md px-2 py-0.5 text-[10px] font-medium",
                            isRunning && "bg-accent-solid/10 text-accent-solid",
                            d.state === "completed" && "bg-emerald-500/10 text-emerald-400",
                            d.state === "failed" && "bg-rose-500/10 text-rose-400"
                          )}
                        >
                          {d.state}
                        </span>
                      </div>

                      <p className="mt-2 line-clamp-2 text-[12px] font-medium text-tx-1">
                        {taskData.goal || taskData.prompt || "Subagent Worker Task"}
                      </p>

                      <div className="mt-2.5 flex items-center justify-between text-[10.5px] text-tx-3">
                        <span>PID: {d.owner_pid || "—"}</span>
                        <span>{new Date(d.dispatched_at * 1000).toLocaleTimeString("id-ID")}</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Transcript Viewer Drawer / Console */}
          <div className="panel lg:col-span-7 rounded-2xl p-4 flex flex-col min-h-[560px]">
            <div className="flex items-center justify-between border-b border-border/40 pb-3 px-1">
              <div className="flex items-center gap-2">
                <Terminal className="size-4 text-accent-solid" />
                <span className="text-[13.5px] font-semibold text-tx-1">Live Transcript & Logs</span>
              </div>
              {selectedAgentId && (
                <span className="font-mono text-[11px] text-tx-3 well px-2 py-0.5 rounded-md">
                  {selectedAgentId}
                </span>
              )}
            </div>

            <div className="well flex-1 mt-3 rounded-xl p-3.5 font-mono text-[11.5px] overflow-y-auto max-h-[480px]">
              {!selectedAgentId ? (
                <div className="flex h-full items-center justify-center text-tx-3">
                  Pilih salah satu subagent di sebelah kiri untuk melihat live log transcript.
                </div>
              ) : loadingLogs ? (
                <div className="flex h-full items-center justify-center text-tx-3">
                  <RefreshCw className="size-4 animate-spin mr-2" />
                  Memuat transcript logs...
                </div>
              ) : !agentLogs || agentLogs.length === 0 ? (
                <div className="flex h-full items-center justify-center text-tx-3">
                  Belum ada log file transcript untuk subagent ini.
                </div>
              ) : (
                <div className="space-y-2 text-tx-2">
                  {agentLogs.map((log, idx) => (
                    <div key={idx} className="leading-relaxed border-b border-border/20 pb-1.5">
                      {log.role && (
                        <span
                          className={cn(
                            "mr-2 font-semibold text-[10.5px] uppercase",
                            log.role === "user" && "text-sky-400",
                            log.role === "assistant" && "text-emerald-400",
                            log.role === "tool" && "text-amber-400"
                          )}
                        >
                          [{log.role}]
                        </span>
                      )}
                      <span className="whitespace-pre-wrap">{log.content || JSON.stringify(log)}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Guard>
  );
}
