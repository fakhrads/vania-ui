"use client";

import { useEffect, useState, useCallback } from "react";
import { Sidebar } from "@/components/sidebar";
import { Guard } from "@/components/guard";
import { Glass, Pill, StatusDot } from "@/components/monitor";
import { authFetch } from "@/lib/auth-fetch";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight, Lock, Globe } from "lucide-react";

type Row = {
  id: number; content: string; content_hash: string; scope: string;
  store: string; kind: string; provenance: string; audience?: string;
  created_at: string; updated_at: string;
};

const KIND: Record<string, string> = {
  seed: "text-sky-300 border-sky-400/25 bg-sky-400/10",
  active: "text-emerald-300 border-emerald-400/25 bg-emerald-400/10",
  archive: "text-zinc-400 border-white/10 bg-white/5",
  evicted: "text-amber-300 border-amber-400/25 bg-amber-400/10",
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
    <div className="flex flex-col min-h-screen lg:flex-row">
      <div className="mesh-bg" />
      <Sidebar />

      <main className="flex-1 overflow-y-auto px-6 py-8 lg:px-10">
        <header className="mb-6">
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-100">Korpus</h1>
          <p className="mt-1 text-sm text-zinc-500">
            <span className="num">{total.toLocaleString("id-ID")}</span> baris di{" "}
            <span className="font-mono text-zinc-400">vania_ltm</span> · baca-saja
          </p>
        </header>

        <Glass className="mb-4 flex flex-wrap items-center gap-3 p-4">
          <input
            value={q}
            onChange={(e) => { setQ(e.target.value); setPage(1); }}
            placeholder="Cari isi…"
            className="min-w-[16rem] flex-1 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-2.5 text-sm text-zinc-200 placeholder:text-zinc-600 outline-none transition-colors focus:border-sky-400/40"
          />
          <div className="flex flex-wrap gap-1.5">
            {KINDS.map((k) => (
              <button
                key={k || "all"}
                onClick={() => { setKind(k); setPage(1); }}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-xs transition-colors",
                  kind === k
                    ? "border-white/20 bg-white/10 text-zinc-100"
                    : "border-white/[0.07] text-zinc-500 hover:bg-white/[0.04]"
                )}
              >
                {k || "semua"}
              </button>
            ))}
          </div>
        </Glass>

        <div className="space-y-2">
          {loading && !rows.length ? (
            [...Array(6)].map((_, i) => (
              <Glass key={i} className="h-20 animate-pulse p-5 opacity-40" children={null} />
            ))
          ) : rows.length ? (
            rows.map((r) => (
              <Glass key={r.id} hover className="p-5">
                <div className="mb-2.5 flex flex-wrap items-center gap-2">
                  <span className={cn("rounded-full border px-2.5 py-0.5 text-[11px]", KIND[r.kind])}>
                    {r.kind}
                  </span>
                  <span className="rounded-full border border-white/[0.07] px-2.5 py-0.5 text-[11px] text-zinc-500">
                    {r.scope}
                  </span>
                  {r.audience && (
                    <Pill tone={r.audience === "private" ? "idle" : "ok"}>
                      {r.audience === "private" ? <Lock className="size-3" /> : <Globe className="size-3" />}
                      {r.audience}
                    </Pill>
                  )}
                  <span className="num ml-auto text-[11px] text-zinc-600">
                    #{r.id} · {new Date(r.updated_at).toLocaleDateString("id-ID")}
                  </span>
                </div>
                <p className="text-sm leading-relaxed text-zinc-300">{r.content}</p>
                <div className="mt-2.5 font-mono text-[10px] text-zinc-700">
                  {r.provenance} · {r.content_hash.slice(0, 16)}…
                </div>
              </Glass>
            ))
          ) : (
            <Glass className="p-10 text-center text-sm text-zinc-600">
              Tidak ada baris yang cocok.
            </Glass>
          )}
        </div>

        {pages > 1 && (
          <div className="mt-6 flex items-center justify-center gap-3">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="glass glass-hover rounded-2xl p-2.5 text-zinc-400 disabled:opacity-30"
            >
              <ChevronLeft className="size-4" />
            </button>
            <span className="num text-sm text-zinc-500">
              {page} / {pages}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(pages, p + 1))}
              disabled={page === pages}
              className="glass glass-hover rounded-2xl p-2.5 text-zinc-400 disabled:opacity-30"
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
