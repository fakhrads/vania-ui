"use client";

import { useEffect, useState, useCallback } from "react";
import { Sidebar } from "@/components/sidebar";
import { Guard } from "@/components/guard";
import { Panel } from "@/components/monitor";
import { authFetch } from "@/lib/auth-fetch";
import { cn } from "@/lib/utils";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Segmented, SearchField, Pager } from "@/components/controls";

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

        <main className="min-w-0 flex-1 px-5 pb-28 pt-7 sm:px-8 lg:px-12 lg:pb-12 lg:pt-10">
          <PageHeader title="Sessions">
            <span className="num text-tx-2">{total.toLocaleString("id-ID")}</span> sesi tercatat di{" "}
            <span className="num text-tx-2">hermes_state_sessions</span> · mirror state.db
          </PageHeader>

          {selectedSessionId && detailData ? (
            /* DETAIL — dibaca seperti transkrip: kolom kiri siapa, kanan isi. */
            <div className="space-y-5">
              <button
                onClick={() => { setSelectedSessionId(null); setDetailData(null); }}
                className="flex items-center gap-2 text-[12.5px] text-tx-2 hover:text-tx-1"
              >
                <ArrowLeft className="size-4" /> Kembali ke daftar sesi
              </button>

              <Panel className="overflow-hidden">
                <div className="flex flex-col gap-4 border-b border-line p-6 sm:flex-row sm:items-end sm:justify-between">
                  <div className="min-w-0 space-y-2">
                    <div className="kicker flex flex-wrap items-center gap-x-3 gap-y-1 !normal-case !tracking-normal">
                      <span className="text-tx-2">{detailData.session.source}</span>
                      {detailData.session.model && <span>{detailData.session.model}</span>}
                      <span className="truncate">{detailData.session.id}</span>
                    </div>
                    <h2 className="display text-[30px] text-tx-1">
                      {detailData.session.title || detailData.session.display_name || "Sesi tanpa judul"}
                    </h2>
                    <p className="num text-[12px] text-tx-3">
                      {new Date(detailData.session.started_at * 1000).toLocaleString("id-ID")}
                      {detailData.session.ended_at &&
                        ` → ${new Date(detailData.session.ended_at * 1000).toLocaleString("id-ID")}`}
                    </p>
                  </div>
                  <div className="flex gap-6">
                    <div>
                      <p className="kicker">pesan</p>
                      <p className="num mt-1 text-[24px] font-medium leading-none text-tx-1">{detailData.messages.length}</p>
                    </div>
                    <div>
                      <p className="kicker">tool calls</p>
                      <p className="num mt-1 text-[24px] font-medium leading-none text-tx-1">{detailData.session.tool_call_count || 0}</p>
                    </div>
                  </div>
                </div>

                <div className="divide-y divide-line-soft">
                  {detailData.messages.map((m) => {
                    const isUser = m.role === "user";
                    const isTool = m.role === "tool";
                    return (
                      <div
                        key={m.id}
                        className={cn(
                          "grid gap-x-6 gap-y-1.5 px-6 py-4 md:grid-cols-[120px_1fr]",
                          isUser && "bg-sunken/60"
                        )}
                      >
                        <div className="flex items-baseline gap-2 md:flex-col md:gap-1">
                          <span
                            className={cn(
                              "kicker !text-[10px]",
                              isUser ? "!text-read" : isTool ? "!text-warn" : "!text-tx-1"
                            )}
                          >
                            {m.role}
                          </span>
                          {m.tool_name && <span className="num truncate text-[11px] text-tx-3">{m.tool_name}</span>}
                          <span className="num text-[11px] text-tx-3">
                            {new Date(m.timestamp * 1000).toLocaleTimeString("id-ID")}
                          </span>
                        </div>
                        <div className="min-w-0">
                          {m.content && (
                            <p
                              className={cn(
                                "whitespace-pre-wrap break-words leading-relaxed text-tx-1",
                                isTool ? "num text-[12px] text-tx-2" : "text-[14px]"
                              )}
                            >
                              {m.content}
                            </p>
                          )}
                          {m.tool_calls && (
                            <pre className="num mt-2 overflow-x-auto rounded-md border border-line-soft bg-sunken p-3 text-[11.5px] leading-relaxed text-tx-2">
                              {m.tool_calls}
                            </pre>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Panel>
            </div>
          ) : (
            <>
              <div className="mb-5 flex flex-wrap items-center gap-3">
                <SearchField
                  value={q}
                  onChange={(e) => { setQ(e.target.value); setPage(1); }}
                  placeholder="Cari sesi, judul, model, ID…"
                />
                <Segmented
                  value={sourceFilter}
                  onChange={(v) => { setSourceFilter(v); setPage(1); }}
                  options={[
                    { value: "", label: "semua" },
                    ...sources.map((x) => ({
                      value: x.source,
                      label: <>{x.source} <span className="num opacity-60">{x.count}</span></>,
                    })),
                  ]}
                />
              </div>

              <Panel className="divide-y divide-line-soft overflow-hidden">
                {loading && !sessions.length ? (
                  [...Array(6)].map((_, i) => <div key={i} className="h-16 animate-pulse bg-sunken/50" />)
                ) : sessions.length ? (
                  sessions.map((x) => (
                    <button
                      key={x.id}
                      onClick={() => openSessionDetail(x.id)}
                      className="group grid w-full items-center gap-x-6 gap-y-1 px-5 py-3.5 text-left transition-colors hover:bg-sunken/60 md:grid-cols-[150px_1fr_auto]"
                    >
                      <div className="flex items-baseline gap-2 md:flex-col md:gap-0.5">
                        <span className="num text-[11.5px] text-tx-2">
                          {new Date(x.started_at * 1000).toLocaleString("id-ID", {
                            day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
                          })}
                        </span>
                        <span className="kicker !text-[9.5px]">{x.source}</span>
                      </div>
                      <div className="min-w-0">
                        <h3 className="truncate text-[14px] font-medium text-tx-1">
                          {x.title || x.display_name || `Session ${x.id.slice(0, 16)}…`}
                        </h3>
                        <p className="num mt-0.5 truncate text-[11px] text-tx-3">
                          {x.model ? `${x.model} · ` : ""}{x.id}
                        </p>
                      </div>
                      <div className="flex items-center gap-5 text-[11.5px] text-tx-3">
                        <span><b className="num font-medium text-tx-1">{x.message_count}</b> pesan</span>
                        <span><b className="num font-medium text-tx-1">{x.tool_call_count}</b> tools</span>
                        <ArrowUpRight className="hidden size-4 text-tx-3 transition-colors group-hover:text-tx-1 md:block" />
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="p-8 text-center text-sm text-tx-3">Tidak ada sesi yang cocok dengan filter.</div>
                )}
              </Panel>

              <Pager page={page} pages={pages} onPage={setPage} total={total} />
            </>
          )}
        </main>
      </div>
    </Guard>
  );
}
