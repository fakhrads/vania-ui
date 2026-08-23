"use client";

import { useEffect, useState, useCallback } from "react";
import { Sidebar } from "@/components/sidebar";
import { Guard } from "@/components/guard";
import { Panel, Pill } from "@/components/monitor";
import { authFetch } from "@/lib/auth-fetch";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight, ArrowLeft, Bot, User, Wrench, Terminal, Search, Clock, Cpu } from "lucide-react";

type SessionSummary = {
  id: string;
  source: string;
  user_id: string | null;
  display_name: string | null;
  model: string | null;
  message_count: number;
  tool_call_count: number;
  input_tokens: number;
  output_tokens: number;
  estimated_cost_usd: number | null;
  title: string | null;
  started_at: number;
  ended_at: number | null;
  last_activity_at: number | null;
};

type MessageItem = {
  id: number;
  role: string;
  content: string | null;
  tool_call_id: string | null;
  tool_calls: string | null;
  tool_name: string | null;
  timestamp: number;
  token_count: number | null;
};

export default function SessionsPage() {
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [sources, setSources] = useState<{ source: string; count: string }[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [sourceFilter, setSourceFilter] = useState("");
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [detailData, setDetailData] = useState<{ session: any; messages: MessageItem[]; model_usage: any[] } | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const perPage = 25;

  const load = useCallback(async () => {
    setLoading(true);
    const p = new URLSearchParams({ page: String(page), per_page: String(perPage) });
    if (sourceFilter) p.set("source", sourceFilter);
    if (q.trim()) p.set("q", q.trim());
    try {
      const res = await authFetch(`/api/sessions?${p}`);
      if (res.ok) {
        const j = await res.json();
        setSessions(j.sessions ?? []);
        setTotal(j.total ?? 0);
        if (j.sources) setSources(j.sources);
      }
    } finally {
      setLoading(false);
    }
  }, [page, sourceFilter, q]);

  useEffect(() => {
    const t = setTimeout(load, q ? 300 : 0);
    return () => clearTimeout(t);
  }, [load, q]);

  const openSessionDetail = async (id: string) => {
    setSelectedSessionId(id);
    setDetailLoading(true);
    try {
      const res = await authFetch(`/api/sessions/${id}`);
      if (res.ok) {
        const data = await res.json();
        setDetailData(data);
      }
    } finally {
      setDetailLoading(false);
    }
  };

  const pages = Math.max(1, Math.ceil(total / perPage));

  return (
    <Guard>
      <div className="flex min-h-screen flex-col lg:flex-row">
        <Sidebar />

        <main className="flex-1 overflow-y-auto px-6 pb-28 pt-8 lg:px-10 lg:pb-8">
          <header className="mb-6">
            <h1 className="text-[25px] font-semibold tracking-[-0.025em] text-tx-1">Sessions</h1>
            <p className="mt-1 text-sm text-tx-3">
              <span className="num">{total.toLocaleString("id-ID")}</span> sesi tercatat di{" "}
              <span className="num text-tx-2">hermes_state_sessions</span> · mirror state.db
            </p>
          </header>

          {selectedSessionId && detailData ? (
            /* DETAIL VIEW */
            <div className="space-y-4">
              <button
                onClick={() => { setSelectedSessionId(null); setDetailData(null); }}
                className="flex items-center gap-2 text-xs font-medium text-tx-2 hover:text-tx-1"
              >
                <ArrowLeft className="size-4" /> Kembali ke daftar sesi
              </button>

              <Panel className="p-6 space-y-5">
                <div className="flex flex-col gap-3 border-b border-border/40 pb-5 sm:flex-row sm:items-start sm:justify-between">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="num text-xs text-accent-solid">{detailData.session.id}</span>
                      <Pill tone="idle">{detailData.session.source}</Pill>
                      {detailData.session.model && (
                        <span className="rounded-full bg-idle-tint px-2.5 py-0.5 text-[11px] text-tx-2 font-mono">
                          {detailData.session.model}
                        </span>
                      )}
                    </div>
                    <h2 className="text-lg font-semibold text-tx-1">
                      {detailData.session.title || detailData.session.display_name || "Untitled Session"}
                    </h2>
                    <div className="flex flex-wrap items-center gap-3 text-xs text-tx-3">
                      <span>Mulai: {new Date(detailData.session.started_at * 1000).toLocaleString("id-ID")}</span>
                      {detailData.session.ended_at && (
                        <>
                          <span>•</span>
                          <span>Selesai: {new Date(detailData.session.ended_at * 1000).toLocaleString("id-ID")}</span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-right">
                    <div>
                      <div className="num text-base font-semibold text-tx-1">{detailData.messages.length}</div>
                      <div className="text-[11px] text-tx-3">pesan</div>
                    </div>
                    <div>
                      <div className="num text-base font-semibold text-tx-2">{detailData.session.tool_call_count || 0}</div>
                      <div className="text-[11px] text-tx-3">tool calls</div>
                    </div>
                  </div>
                </div>

                {/* Messages List */}
                <div className="space-y-3 pt-2">
                  {detailData.messages.map((m) => {
                    const isUser = m.role === "user";
                    const isAssistant = m.role === "assistant";
                    const isTool = m.role === "tool";

                    return (
                      <div
                        key={m.id}
                        className={cn(
                          "rounded-2xl p-4 text-xs transition-colors",
                          isUser
                            ? "well border border-sky-500/20"
                            : isTool
                            ? "well border border-border/40 font-mono text-[11.5px]"
                            : "raised border border-border/50"
                        )}
                      >
                        <div className="mb-2 flex items-center justify-between text-[11px] text-tx-3">
                          <div className="flex items-center gap-2 font-medium">
                            {isUser && <User className="size-3.5 text-sky-400" />}
                            {isAssistant && <Bot className="size-3.5 text-violet-400" />}
                            {isTool && <Wrench className="size-3.5 text-amber-400" />}
                            <span className={isUser ? "text-sky-400 font-semibold" : isAssistant ? "text-violet-400 font-semibold" : "text-amber-400 font-semibold"}>
                              {m.role.toUpperCase()} {m.tool_name ? `(${m.tool_name})` : ""}
                            </span>
                          </div>
                          <span className="num">{new Date(m.timestamp * 1000).toLocaleTimeString("id-ID")}</span>
                        </div>

                        {m.content && (
                          <p className="whitespace-pre-wrap text-sm leading-relaxed text-tx-1 font-sans break-words">
                            {m.content}
                          </p>
                        )}

                        {m.tool_calls && (
                          <pre className="well mt-2 p-3 rounded-xl text-[11px] overflow-x-auto text-tx-2 font-mono leading-relaxed">
                            {m.tool_calls}
                          </pre>
                        )}
                      </div>
                    );
                  })}
                </div>
              </Panel>
            </div>
          ) : (
            /* LIST VIEW */
            <>
              <Panel className="mb-4 flex flex-wrap items-center gap-3 p-4">
                <input
                  value={q}
                  onChange={(e) => { setQ(e.target.value); setPage(1); }}
                  placeholder="Cari sesi, judul, model, ID…"
                  className="well min-w-[16rem] flex-1 rounded-xl px-4 py-2.5 text-sm text-tx-1 placeholder:text-tx-3 outline-none"
                />
                <div className="flex flex-wrap gap-1.5">
                  <button
                    onClick={() => { setSourceFilter(""); setPage(1); }}
                    className={cn(
                      "rounded-full px-3 py-1.5 text-xs transition-colors",
                      sourceFilter === "" ? "raised text-tx-1" : "text-tx-3 hover:bg-sunken"
                    )}
                  >
                    semua
                  </button>
                  {sources.map((s) => (
                    <button
                      key={s.source}
                      onClick={() => { setSourceFilter(s.source); setPage(1); }}
                      className={cn(
                        "rounded-full px-3 py-1.5 text-xs transition-colors",
                        sourceFilter === s.source ? "raised text-tx-1" : "text-tx-3 hover:bg-sunken"
                      )}
                    >
                      {s.source} ({s.count})
                    </button>
                  ))}
                </div>
              </Panel>

              <div className="space-y-2">
                {loading && !sessions.length ? (
                  [...Array(6)].map((_, i) => (
                    <Panel key={i} className="h-20 animate-pulse p-5 opacity-40" />
                  ))
                ) : sessions.length ? (
                  sessions.map((s) => (
                    <div
                      key={s.id}
                      onClick={() => openSessionDetail(s.id)}
                      className="cursor-pointer"
                    >
                      <Panel
                        hover
                        className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
                      >
                        <div className="space-y-1.5 min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded-full bg-idle-tint px-2.5 py-0.5 text-[11px] text-tx-2">
                              {s.source}
                            </span>
                            {s.model && (
                              <span className="num text-[11px] text-tx-3 truncate max-w-[180px]">
                                {s.model}
                              </span>
                            )}
                            <span className="num ml-auto sm:ml-0 text-[11px] text-tx-3">
                              {new Date(s.started_at * 1000).toLocaleString("id-ID")}
                            </span>
                          </div>
                          <h3 className="text-sm font-semibold text-tx-1 truncate group-hover:text-accent-solid transition-colors">
                            {s.title || s.display_name || `Session ${s.id.slice(0, 16)}…`}
                          </h3>
                          <div className="num text-[10px] text-tx-3 truncate">
                            {s.id}
                          </div>
                        </div>

                        <div className="flex items-center gap-4 shrink-0 self-end sm:self-center">
                          <div className="text-right">
                            <span className="num text-sm font-semibold text-tx-1">{s.message_count}</span>
                            <span className="text-[11px] text-tx-3 ml-1">pesan</span>
                          </div>
                          <div className="text-right">
                            <span className="num text-sm font-semibold text-tx-2">{s.tool_call_count}</span>
                            <span className="text-[11px] text-tx-3 ml-1">tools</span>
                          </div>
                        </div>
                      </Panel>
                    </div>
                  ))
                ) : (
                  <Panel className="p-8 text-center text-sm text-tx-3">
                    Tidak ada sesi yang cocok dengan filter
                  </Panel>
                )}
              </div>

              {pages > 1 && (
                <div className="mt-6 flex items-center justify-between text-xs text-tx-3">
                  <span className="num">
                    Halaman {page} dari {pages}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                      className="well flex size-8 items-center justify-center rounded-xl transition-colors hover:text-tx-1 disabled:opacity-30"
                    >
                      <ChevronLeft className="size-4" />
                    </button>
                    <button
                      onClick={() => setPage((p) => Math.min(pages, p + 1))}
                      disabled={page === pages}
                      className="well flex size-8 items-center justify-center rounded-xl transition-colors hover:text-tx-1 disabled:opacity-30"
                    >
                      <ChevronRight className="size-4" />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </Guard>
  );
}
