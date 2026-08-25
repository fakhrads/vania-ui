"use client";

import { useEffect, useState, useCallback } from "react";
import { Sidebar } from "@/components/sidebar";
import { Guard } from "@/components/guard";
import { Panel, Pill, KIND_CLASS } from "@/components/monitor";
import { authFetch } from "@/lib/auth-fetch";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight, Lock, Globe, Zap, AlertTriangle, Lightbulb, RefreshCw } from "lucide-react";

type Row = {
  id: number; content: string; content_hash: string; scope: string;
  store: string; kind: string; provenance: string; audience?: string;
  created_at: string; updated_at: string;
  fitness: number;
  retrieval_count: number;
  success_count: number;
  contradiction_count: number;
  human_reward: number;
  last_used_at: string | null;
  resampled_at: string | null;
};

const KINDS = ["", "seed", "active", "resampled", "reasoning", "quarantine", "evicted", "archive"];

export default function Korpus() {
  const [rows, setRows] = useState<Row[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [kind, setKind] = useState("");
  const [scope, setScope] = useState("");
  const [sort, setSort] = useState<"created_at" | "fitness">("created_at");
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const perPage = 25;

  const load = useCallback(async () => {
    setLoading(true);
    const p = new URLSearchParams({ page: String(page), per_page: String(perPage) });
    if (kind) p.set("kind", kind);
    if (scope) p.set("scope", scope);
    if (sort) p.set("sort", sort);
    if (q.trim()) p.set("q", q.trim());
    try {
      const res = await authFetch(`/api/ltm?${p}`);
      const j = await res.json();
      setRows(j.items ?? []);
      setTotal(j.pagination?.total ?? 0);
    } finally {
      setLoading(false);
    }
  }, [page, kind, scope, sort, q]);

  useEffect(() => {
    const t = setTimeout(load, q ? 300 : 0);
    return () => clearTimeout(t);
  }, [load, q]);

  const pages = Math.max(1, Math.ceil(total / perPage));

  return (
    <Guard>
    <div className="flex min-h-screen flex-col lg:flex-row">
      <Sidebar />

      <main className="flex-1 overflow-y-auto px-6 pb-28 pt-8 lg:px-10 lg:pb-8">
        <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-[25px] font-semibold tracking-[-0.025em] text-tx-1">Korpus Memori</h1>
            <p className="mt-1 text-sm text-tx-3">
              <span className="num">{total.toLocaleString("id-ID")}</span> baris di{" "}
              <span className="num text-tx-2">vania_ltm</span> · dilengkapi Lapis Fitness & MemRL
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSort(s => s === "created_at" ? "fitness" : "created_at")}
              className={cn(
                "flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-medium transition-all",
                sort === "fitness"
                  ? "bg-accent text-white shadow-sm"
                  : "panel text-tx-2 hover:text-tx-1"
              )}
            >
              <Zap className="size-3.5" />
              {sort === "fitness" ? "Urut: Fitness Tertinggi" : "Urut: Terbaru"}
            </button>
          </div>
        </header>

        <Panel className="mb-4 flex flex-col gap-3 p-4">
          <div className="flex flex-wrap items-center gap-3">
            <input
              value={q}
              onChange={(e) => { setQ(e.target.value); setPage(1); }}
              placeholder="Cari isi memori…"
              className="well min-w-[16rem] flex-1 rounded-xl px-4 py-2.5 text-sm text-tx-1 placeholder:text-tx-3 outline-none"
            />
            <div className="flex items-center gap-1">
              {["", "fakhri", "abiane"].map((s) => (
                <button
                  key={s || "all"}
                  onClick={() => { setScope(s); setPage(1); }}
                  className={cn(
                    "rounded-xl px-3 py-2 text-xs font-medium transition-colors",
                    scope === s ? "raised text-tx-1" : "text-tx-3 hover:bg-sunken"
                  )}
                >
                  {s || "semua scope"}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-border/40">
            <span className="text-[11px] font-medium text-tx-3 mr-2">Tier:</span>
            {KINDS.map((k) => (
              <button
                key={k || "all"}
                onClick={() => { setKind(k); setPage(1); }}
                className={cn(
                  "rounded-full px-3 py-1 text-xs transition-colors",
                  kind === k
                    ? "raised text-tx-1 font-medium"
                    : "text-tx-3 hover:bg-sunken"
                )}
              >
                {k || "semua tier"}
              </button>
            ))}
          </div>
        </Panel>

        <div className="space-y-2">
          {loading && !rows.length ? (
            [...Array(6)].map((_, i) => (
              <Panel key={i} className="h-24 animate-pulse p-5 opacity-40" />
            ))
          ) : rows.length ? (
            rows.map((r) => (
              <Panel key={r.id} hover className="p-5">
                <div className="mb-2.5 flex flex-wrap items-center gap-2">
                  <span className={cn("num rounded-full px-2.5 py-0.5 text-[11px] font-medium", KIND_CLASS[r.kind] || "text-tx-2 bg-idle-tint")}>
                    {r.kind}
                  </span>
                  <span className="rounded-full bg-idle-tint px-2.5 py-0.5 text-[11px] text-tx-2">
                    {r.scope}
                  </span>

                  {r.kind === "quarantine" && (
                    <Pill tone="bad" className="text-[10.5px]">
                      <AlertTriangle className="size-3" />
                      BELUM TERVERIFIKASI
                    </Pill>
                  )}

                  {r.kind === "reasoning" && (
                    <Pill tone="purple" className="text-[10.5px]">
                      <Lightbulb className="size-3" />
                      Pelajaran/Strategi
                    </Pill>
                  )}

                  {r.kind === "resampled" && (
                    <Pill tone="accent" className="text-[10.5px]">
                      <RefreshCw className="size-3" />
                      Resampled
                    </Pill>
                  )}

                  {r.audience && (
                    <Pill tone={r.audience === "private" ? "idle" : "ok"}>
                      {r.audience === "private" ? <Lock className="size-3" /> : <Globe className="size-3" />}
                      {r.audience}
                    </Pill>
                  )}

                  {/* Fitness Badge */}
                  <div className="flex items-center gap-1.5 rounded-full bg-surface-2 px-2.5 py-0.5 border border-border/50">
                    <Zap className="size-3 text-amber-400" />
                    <span className="num text-[11px] font-semibold text-tx-1">
                      {Number(r.fitness).toFixed(3)}
                    </span>
                    <span className="text-[10px] text-tx-3">fit</span>
                  </div>

                  <span className="num ml-auto text-[11px] text-tx-3">
                    #{r.id} · {new Date(r.updated_at).toLocaleDateString("id-ID")}
                  </span>
                </div>

                <p className="text-sm leading-relaxed text-tx-1">{r.content}</p>

                <div className="mt-3.5 flex flex-wrap items-center justify-between gap-2 border-t border-border/30 pt-2.5 text-[11px] text-tx-3">
                  <div className="flex flex-wrap items-center gap-3">
                    <span>
                      Recall: <strong className="text-tx-2 num">{r.retrieval_count}</strong>
                    </span>
                    <span>
                      Success: <strong className="text-ok num">{r.success_count}</strong>
                    </span>
                    <span>
                      Reward: <strong className="text-sky-400 num">{r.human_reward}</strong>
                    </span>
                    <span>
                      Contradiction: <strong className={cn("num", r.contradiction_count > 0 ? "text-bad" : "text-tx-3")}>{r.contradiction_count}</strong>
                    </span>
                    {r.last_used_at && (
                      <span className="text-[10px] text-tx-3">
                        Dipakai: {new Date(r.last_used_at).toLocaleDateString("id-ID")}
                      </span>
                    )}
                  </div>
                  <div className="num text-[10px] text-tx-3">
                    {r.provenance} · {r.content_hash?.slice(0, 12)}…
                  </div>
                </div>
              </Panel>
            ))
          ) : (
            <Panel className="p-10 text-center text-sm text-tx-3">
              Tidak ada baris yang cocok.
            </Panel>
          )}
        </div>

        {pages > 1 && (
          <div className="mt-6 flex items-center justify-center gap-3">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="raised rounded-xl p-2.5 text-tx-1 disabled:opacity-40 disabled:shadow-none"
            >
              <ChevronLeft className="size-4" />
            </button>
            <span className="num text-sm text-tx-2">
              {page} / {pages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(pages, p + 1))}
              disabled={page === pages}
              className="raised rounded-xl p-2.5 text-tx-1 disabled:opacity-40 disabled:shadow-none"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>
        )}
      </main>
    </div>
    </Guard>
  );
}
