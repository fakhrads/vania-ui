"use client";

import { useState } from "react";
import { Sidebar } from "@/components/sidebar";
import { Guard } from "@/components/guard";
import { useLive, Stat, StatusDot, type Tone } from "@/components/monitor";
import { RefreshCw } from "lucide-react";
import { PageHeader, LiveStamp } from "@/components/page-header";

function stateTone(state: string): Tone {
  if (state === "running" || state === "in_progress") return "accent";
  if (state === "completed") return "ok";
  if (state === "failed") return "bad";
  return "idle";
}
import { cn } from "@/lib/utils";
import { authFetch } from "@/lib/auth-fetch";

interface Delegation {
  delegation_id: string;
  origin_session: string;
  state: string;
  dispatched_at: number;
  completed_at: number | null;
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
  const { data, refresh, at, err } = useLive<AgentsData>("/api/agents", 3000);
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
      <div className="flex min-h-screen flex-col lg:flex-row">
        <Sidebar />

        <main className="min-w-0 flex-1 px-5 pb-28 pt-7 sm:px-8 lg:px-12 lg:pb-12 lg:pt-10">
          <PageHeader
            title="Subagents"
            actions={
              <>
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
            Siklus delegasi agent anak dan transkrip lognya.
          </PageHeader>

          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Stat label="Total delegasi" value={summary.total} />
              <Stat label="Berjalan" tone="accent" value={summary.running} />
              <Stat label="Selesai" tone="ok" value={summary.completed} />
              <Stat label="Gagal" tone={summary.failed > 0 ? "bad" : "idle"} value={summary.failed} />
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
              <section className="panel overflow-hidden rounded-xl lg:col-span-5">
                <h2 className="flex items-center justify-between border-b border-line px-4 py-3 text-[13.5px] font-semibold text-tx-1">
                  Daftar subagent
                  <span className="num text-[12px] font-normal text-tx-3">{delegations.length}</span>
                </h2>
                <div className="max-h-[560px] divide-y divide-line-soft overflow-y-auto">
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
                      const tone = stateTone(d.state);

                      return (
                        <button
                          key={d.delegation_id}
                          onClick={() => handleSelectAgent(d.delegation_id)}
                          className={cn(
                            "relative block w-full px-4 py-3 text-left transition-colors",
                            isSelected ? "bg-sunken" : "hover:bg-sunken/60"
                          )}
                        >
                          {isSelected && <span aria-hidden className="absolute inset-y-0 left-0 w-[2px] bg-tx-1" />}
                          <div className="flex items-center justify-between gap-2">
                            <span className="num max-w-[180px] truncate text-[11px] text-tx-3">{d.delegation_id}</span>
                            <span className={cn("flex items-center gap-1.5 text-[11px] font-medium",
                              tone === "ok" ? "text-ok" : tone === "bad" ? "text-bad" : tone === "accent" ? "text-accent-solid" : "text-tx-2")}>
                              <StatusDot tone={tone} size={7} live={isRunning} />
                              {d.state}
                            </span>
                          </div>
                          <p className="mt-1.5 line-clamp-2 text-[13px] text-tx-1">
                            {taskData.goal || taskData.prompt || "Subagent worker task"}
                          </p>
                          <div className="num mt-1.5 flex items-center justify-between text-[10.5px] text-tx-3">
                            <span>pid {d.owner_pid || "—"}</span>
                            <span>{new Date(d.dispatched_at * 1000).toLocaleTimeString("id-ID")}</span>
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              </section>

              <section className="panel flex min-h-[560px] flex-col overflow-hidden rounded-xl lg:col-span-7">
                <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
                  <span className="text-[13.5px] font-semibold text-tx-1">Transkrip &amp; log</span>
                  {selectedAgentId && (
                    <span className="num truncate text-[11px] text-tx-3">{selectedAgentId}</span>
                  )}
                </div>

                <div className="num max-h-[500px] flex-1 overflow-y-auto bg-sunken/50 p-4 text-[12px]">
                  {!selectedAgentId ? (
                    <div className="flex h-full items-center justify-center text-center text-tx-3">
                      Pilih subagent di kiri untuk membuka transkripnya.
                    </div>
                  ) : loadingLogs ? (
                    <div className="flex h-full items-center justify-center text-tx-3">
                      <RefreshCw className="mr-2 size-4 animate-spin" />
                      Memuat transkrip…
                    </div>
                  ) : !agentLogs || agentLogs.length === 0 ? (
                    <div className="flex h-full items-center justify-center text-tx-3">
                      Belum ada log transkrip untuk subagent ini.
                    </div>
                  ) : (
                    <div className="space-y-2 text-tx-2">
                      {agentLogs.map((log, idx) => (
                        <div key={idx} className="border-b border-line-soft pb-2 leading-relaxed">
                          {log.role && (
                            <span
                              className={cn(
                                "mr-2 text-[10.5px] font-semibold uppercase",
                                log.role === "user" && "text-read",
                                log.role === "assistant" && "text-ok",
                                log.role === "tool" && "text-warn"
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
              </section>
            </div>
          </div>
        </main>
      </div>
    </Guard>
  );
}
