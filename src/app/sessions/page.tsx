"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { authFetch } from "@/lib/auth-fetch";
import { Guard } from "@/components/guard";
import { StatusDot, Pill, Stat } from "@/components/monitor";
import { MessagesSquare, Search, Terminal, ArrowLeft, Bot, User, Wrench, Shield, Clock, Coins, Cpu } from "lucide-react";
import Link from "next/link";

interface SessionSummary {
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
}

interface MessageItem {
  id: number;
  role: string;
  content: string | null;
  tool_call_id: string | null;
  tool_calls: string | null;
  tool_name: string | null;
  timestamp: number;
  token_count: number | null;
}

function SessionsContent() {
  const searchParams = useSearchParams();
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [sourceFilter, setSourceFilter] = useState("");
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [detailData, setDetailData] = useState<{ session: any; messages: MessageItem[]; model_usage: any[] } | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const fetchSessions = async () => {
    setLoading(true);
    try {
      const res = await authFetch(`/api/sessions?page=${page}&per_page=20&source=${sourceFilter}&q=${encodeURIComponent(q)}`);
      if (res.ok) {
        const data = await res.json();
        setSessions(data.sessions || []);
        setTotal(data.total || 0);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, [page, sourceFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchSessions();
  };

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-semibold text-tx-1">Hermes Sessions</h1>
            <Pill tone="ok">{total} total</Pill>
          </div>
          <p className="mt-1 text-xs text-tx-3">
            Mirror live dari SQLite state.db ke PostgreSQL untuk audit transkrip & history sesi agent
          </p>
        </div>

        {/* Filter / Search */}
        <form onSubmit={handleSearchSubmit} className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 size-4 text-tx-3" />
            <input
              type="text"
              placeholder="Cari session, title, ID..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="well rounded-xl pl-9 pr-3 py-1.5 text-xs text-tx-1 placeholder-tx-3 focus:outline-none focus:ring-1 focus:ring-accent-solid w-56 sm:w-64"
            />
          </div>
          <button type="submit" className="raised rounded-xl px-3 py-1.5 text-xs font-medium text-tx-1">
            Cari
          </button>
        </form>
      </div>

      {selectedSessionId && detailData ? (
        /* DETAIL VIEW */
        <div className="space-y-4">
          <button
            onClick={() => { setSelectedSessionId(null); setDetailData(null); }}
            className="flex items-center gap-2 text-xs text-tx-2 hover:text-tx-1"
          >
            <ArrowLeft className="size-4" /> Kembali ke daftar
          </button>

          <div className="raised rounded-2xl p-4 sm:p-5 space-y-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between border-b border-border/40 pb-4">
              <div>
                <span className="text-[11px] font-mono text-accent-solid">{detailData.session.id}</span>
                <h2 className="text-base font-semibold text-tx-1 mt-0.5">
                  {detailData.session.title || detailData.session.display_name || "Untitled Session"}
                </h2>
                <div className="flex flex-wrap items-center gap-2 mt-2 text-xs text-tx-3">
                  <span className="font-medium text-tx-2">Source: {detailData.session.source}</span>
                  <span>•</span>
                  <span>Model: {detailData.session.model || "-"}</span>
                  <span>•</span>
                  <span>Mulai: {new Date(detailData.session.started_at * 1000).toLocaleString("id-ID")}</span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="text-right text-xs">
                  <div className="text-tx-1 font-mono font-medium">{detailData.messages.length} messages</div>
                  <div className="text-tx-3">{detailData.session.tool_call_count || 0} tool calls</div>
                </div>
              </div>
            </div>

            {/* Messages Stream */}
            <div className="space-y-3 pt-2">
              {detailData.messages.map((m) => {
                const isUser = m.role === "user";
                const isAssistant = m.role === "assistant";
                const isTool = m.role === "tool";

                return (
                  <div
                    key={m.id}
                    className={`rounded-xl p-3 text-xs space-y-1.5 ${
                      isUser
                        ? "bg-accent-solid/10 border border-accent-solid/20"
                        : isTool
                        ? "well border border-border/40 font-mono text-[11.5px]"
                        : "raised border border-border/50"
                    }`}
                  >
                    <div className="flex items-center justify-between text-[11px] text-tx-3">
                      <div className="flex items-center gap-1.5 font-medium">
                        {isUser && <User className="size-3.5 text-sky-400" />}
                        {isAssistant && <Bot className="size-3.5 text-violet-400" />}
                        {isTool && <Wrench className="size-3.5 text-amber-400" />}
                        <span className={isUser ? "text-sky-400 font-semibold" : isAssistant ? "text-violet-400 font-semibold" : "text-amber-400"}>
                          {m.role.toUpperCase()} {m.tool_name ? `(${m.tool_name})` : ""}
                        </span>
                      </div>
                      <span>{new Date(m.timestamp * 1000).toLocaleTimeString("id-ID")}</span>
                    </div>

                    {m.content && (
                      <div className="whitespace-pre-wrap text-tx-1 break-words font-sans leading-relaxed">
                        {m.content}
                      </div>
                    )}

                    {m.tool_calls && (
                      <pre className="well p-2 rounded-lg text-[10.5px] overflow-x-auto text-tx-2 font-mono">
                        {m.tool_calls}
                      </pre>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        /* LIST VIEW */
        <div className="space-y-3">
          {loading ? (
            <div className="p-8 text-center text-xs text-tx-3">Memuat riwayat session...</div>
          ) : sessions.length === 0 ? (
            <div className="well rounded-2xl p-8 text-center text-xs text-tx-3">Tidak ada session ditemukan.</div>
          ) : (
            <div className="grid gap-2.5">
              {sessions.map((s) => (
                <div
                  key={s.id}
                  onClick={() => openSessionDetail(s.id)}
                  className="raised hover:border-accent-solid/40 transition-all rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer group"
                >
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] text-accent-solid">{s.id.slice(0, 18)}...</span>
                      <Pill tone="idle">{s.source}</Pill>
                      {s.model && <span className="text-[11px] text-tx-3 truncate max-w-[150px]">{s.model}</span>}
                    </div>
                    <h3 className="text-xs font-semibold text-tx-1 truncate group-hover:text-accent-solid transition-colors">
                      {s.title || s.display_name || "Session " + s.id.slice(0, 8)}
                    </h3>
                    <p className="text-[11px] text-tx-3">
                      {new Date(s.started_at * 1000).toLocaleString("id-ID")}
                    </p>
                  </div>

                  <div className="flex items-center gap-4 text-xs shrink-0 self-end sm:self-center">
                    <div className="text-right">
                      <span className="font-mono font-medium text-tx-1">{s.message_count}</span>
                      <span className="text-[10px] text-tx-3 ml-1">pesan</span>
                    </div>
                    <div className="text-right">
                      <span className="font-mono font-medium text-tx-2">{s.tool_call_count}</span>
                      <span className="text-[10px] text-tx-3 ml-1">tools</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          <div className="flex items-center justify-between pt-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="raised rounded-xl px-3 py-1.5 text-xs text-tx-2 disabled:opacity-40"
            >
              Sebelumnya
            </button>
            <span className="text-xs text-tx-3">Halaman {page}</span>
            <button
              disabled={sessions.length < 20}
              onClick={() => setPage((p) => p + 1)}
              className="raised rounded-xl px-3 py-1.5 text-xs text-tx-2 disabled:opacity-40"
            >
              Berikutnya
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function SessionsPage() {
  return (
    <Guard>
      <Suspense fallback={<div className="p-8 text-center text-xs text-tx-3">Memuat...</div>}>
        <SessionsContent />
      </Suspense>
    </Guard>
  );
}
