"use client";

import { useEffect, useState, useCallback } from "react";
import { Sidebar } from "@/components/sidebar";
import { Guard } from "@/components/guard";
import { Panel, Pill, KIND_CLASS } from "@/components/monitor";
import { authFetch } from "@/lib/auth-fetch";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight, Lock, Globe } from "lucide-react";

type Row = {
  id: number; content: string; content_hash: string; scope: string;
  store: string; kind: string; provenance: string; audience?: string;
  created_at: string; updated_at: string;
};

const KINDS = ["", "seed", "active", "evicted", "archive"];

export default function Korpus() {
  const [rows, setRows] = useState<Row[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [kind, setKind] = useState("");
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const perPage = 25;

  const load = useCallback(async () => {
    setLoading(true);
    const p = new URLSearchParams({ page: String(page), per_page: String(perPage) });
    if (kind) p.set("kind", kind);
    if (q.trim()) p.set("q", q.trim());
    try {
      const res = await authFetch(`/api/ltm?${p}`);
      const j = await res.json();
      setRows(j.items ?? []);
      setTotal(j.pagination?.total ?? 0);
    } finally {
      setLoading(false);
    }
  }, [page, kind, q]);

  useEffect(() => {
    const t = setTimeout(load, q ? 300 : 0);
    return () => clearTimeout(t);
  }, [load, q]);

  const pages = Math.max(1, Math.ceil(total / perPage));

  return (
    <Guard>
    <div className="flex min-h-screen flex-col lg:flex-row">
      <Sidebar />

      <main className="flex-1 overflow-y-auto px-6 py-8 lg:px-10">
        <header className="mb-6">
          <h1 className="text-[25px] font-semibold tracking-[-0.025em] text-tx-1">Korpus</h1>
          <p className="mt-1 text-sm text-tx-3">
            <span className="num">{total.toLocaleString("id-ID")}</span> baris di{" "}
            <span className="num text-tx-2">vania_ltm</span> · baca-saja
          </p>
        </header>

        <Panel className="mb-4 flex flex-wrap items-center gap-3 p-4">
          <input
            value={q}
            onChange={(e) => { setQ(e.target.value); setPage(1); }}
            placeholder="Cari isi…"
            className="well min-w-[16rem] flex-1 rounded-xl px-4 py-2.5 text-sm text-tx-1 placeholder:text-tx-3 outline-none"
          />
          <div className="flex flex-wrap gap-1.5">
            {KINDS.map((k) => (
              <button
                key={k || "all"}
                onClick={() => { setKind(k); setPage(1); }}
                className={cn(
                  "rounded-full px-3 py-1.5 text-xs transition-colors",
                  kind === k
                    ? "raised text-tx-1"
                    : "text-tx-3 hover:bg-sunken"
                )}
              >
                {k || "semua"}
              </button>
            ))}
          </div>
        </Panel>

        <div className="space-y-2">
          {loading && !rows.length ? (
            [...Array(6)].map((_, i) => (
              <Panel key={i} className="h-20 animate-pulse p-5 opacity-40" />
            ))
          ) : rows.length ? (
            rows.map((r) => (
              <Panel key={r.id} hover className="p-5">
                <div className="mb-2.5 flex flex-wrap items-center gap-2">
                  <span className={cn("num rounded-full px-2.5 py-0.5 text-[11px]", KIND_CLASS[r.kind])}>
                    {r.kind}
                  </span>
                  <span className="rounded-full bg-idle-tint px-2.5 py-0.5 text-[11px] text-tx-2">
                    {r.scope}
                  </span>
                  {r.audience && (
                    <Pill tone={r.audience === "private" ? "idle" : "ok"}>
                      {r.audience === "private" ? <Lock className="size-3" /> : <Globe className="size-3" />}
                      {r.audience}
                    </Pill>
                  )}
                  <span className="num ml-auto text-[11px] text-tx-3">
                    #{r.id} · {new Date(r.updated_at).toLocaleDateString("id-ID")}
                  </span>
                </div>
                <p className="text-sm leading-relaxed text-tx-1">{r.content}</p>
                <div className="num mt-2.5 text-[10px] text-tx-3">
                  {r.provenance} · {r.content_hash.slice(0, 16)}…
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
