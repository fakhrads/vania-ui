"use client";

import { useEffect, useState, useCallback } from "react";
import { Sidebar } from "@/components/sidebar";
import { Guard } from "@/components/guard";
import { Panel, Pill, KIND_CLASS } from "@/components/monitor";
import { authFetch } from "@/lib/auth-fetch";
import { cn } from "@/lib/utils";
import { Lock, Globe, AlertTriangle, Lightbulb, RefreshCw } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Segmented, SearchField, Pager } from "@/components/controls";

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

      <main className="min-w-0 flex-1 px-5 pb-28 pt-7 sm:px-8 lg:px-12 lg:pb-12 lg:pt-10">
        <PageHeader
          title="Korpus memori"
          actions={
            <Segmented
              label="Urut"
              value={sort}
              onChange={(v) => { setSort(v); setPage(1); }}
              options={[
                { value: "created_at", label: "Terbaru" },
                { value: "fitness", label: "Fitness" },
              ]}
            />
          }
        >
          <span className="num text-tx-2">{total.toLocaleString("id-ID")}</span> baris di{" "}
          <span className="num text-tx-2">vania_ltm</span> · dilengkapi Lapis Fitness &amp; MemRL
        </PageHeader>

        <div className="mb-5 space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <SearchField
              value={q}
              onChange={(e) => { setQ(e.target.value); setPage(1); }}
              placeholder="Cari isi memori…"
            />
            <Segmented
              value={scope}
              onChange={(v) => { setScope(v); setPage(1); }}
              options={["", "fakhri", "abiane"].map((s) => ({ value: s, label: s || "semua" }))}
            />
          </div>
          <Segmented
            label="Tier"
            value={kind}
            onChange={(v) => { setKind(v); setPage(1); }}
            options={KINDS.map((k) => ({ value: k, label: k || "semua" }))}
          />
        </div>

        {/* Satu buku besar, baris dipisah garis — bukan kartu per baris.
            Dua puluh lima entri jadi muat lebih banyak per layar. */}
        <Panel className="divide-y divide-line-soft overflow-hidden">
          {loading && !rows.length ? (
            [...Array(6)].map((_, i) => <div key={i} className="h-24 animate-pulse bg-sunken/50" />)
          ) : rows.length ? (
            rows.map((r) => (
              <article key={r.id} className="grid gap-x-6 gap-y-2 px-5 py-4 transition-colors hover:bg-sunken/60 md:grid-cols-[150px_1fr]">
                <div className="flex flex-wrap items-start gap-1.5 md:flex-col md:gap-2">
                  <span className="num text-[11px] text-tx-3">
                    #{r.id} · {new Date(r.updated_at).toLocaleDateString("id-ID")}
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    <span className={cn("num rounded-[4px] px-1.5 py-px text-[11px] font-medium", KIND_CLASS[r.kind] || "bg-idle-tint text-tx-2")}>
                      {r.kind}
                    </span>
                    <span className="num rounded-[4px] border border-line px-1.5 py-px text-[11px] text-tx-2">
                      {r.scope}
                    </span>
                  </div>
                  <span className="num flex items-baseline gap-1 text-[11px] text-tx-3">
                    fit <span className="text-[13px] font-medium text-tx-1">{Number(r.fitness).toFixed(3)}</span>
                  </span>
                </div>

                <div className="min-w-0">
                  <p className="text-[14px] leading-relaxed text-tx-1">{r.content}</p>

                  <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11.5px] text-tx-3">
                    {r.kind === "quarantine" && (
                      <Pill tone="bad"><AlertTriangle className="size-3" /> belum terverifikasi</Pill>
                    )}
                    {r.kind === "reasoning" && (
                      <Pill tone="purple"><Lightbulb className="size-3" /> pelajaran/strategi</Pill>
                    )}
                    {r.kind === "resampled" && (
                      <Pill tone="accent"><RefreshCw className="size-3" /> resampled</Pill>
                    )}
                    {r.audience && (
                      <span className="flex items-center gap-1">
                        {r.audience === "private" ? <Lock className="size-3" /> : <Globe className="size-3 text-ok" />}
                        {r.audience}
                      </span>
                    )}
                    <span>recall <b className="num font-medium text-tx-2">{r.retrieval_count}</b></span>
                    <span>sukses <b className="num font-medium text-ok">{r.success_count}</b></span>
                    <span>reward <b className="num font-medium text-read">{r.human_reward}</b></span>
                    <span>
                      kontradiksi{" "}
                      <b className={cn("num font-medium", r.contradiction_count > 0 ? "text-bad" : "text-tx-2")}>
                        {r.contradiction_count}
                      </b>
                    </span>
                    {r.last_used_at && (
                      <span>dipakai <span className="num">{new Date(r.last_used_at).toLocaleDateString("id-ID")}</span></span>
                    )}
                    <span className="num ml-auto text-[10.5px]">
                      {r.provenance} · {r.content_hash?.slice(0, 12)}…
                    </span>
                  </div>
                </div>
              </article>
            ))
          ) : (
            <div className="p-10 text-center text-sm text-tx-3">Tidak ada baris yang cocok.</div>
          )}
        </Panel>

        <Pager page={page} pages={pages} onPage={setPage} total={total} />
      </main>
    </div>
    </Guard>
  );
}
