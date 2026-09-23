"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/lib/auth-context";
import { authFetch } from "@/lib/auth-fetch";
import { Sidebar } from "@/components/sidebar";
import { Guard } from "@/components/guard";
import { Panel, StatusDot, type Tone } from "@/components/monitor";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/page-header";
import { Segmented, SearchField, Pager } from "@/components/controls";

interface ObsItem {
  id: number;
  kind: string;
  claim: string;
  evidence: string;
  confidence: number;
  confirmed_at: string | null;
  contradicted_count: number;
  created_at: string;
}

const FILTERS: { v: string; label: string }[] = [
  { v: "", label: "semua" },
  { v: "confirmed", label: "terkonfirmasi" },
  { v: "contradicted", label: "terbantah" },
  { v: "pending", label: "menunggu" },
];

function status(item: ObsItem): { tone: Tone; label: string } {
  if (item.confirmed_at) return { tone: "ok", label: "terkonfirmasi" };
  if (item.contradicted_count > 0) {
    return { tone: "bad", label: `terbantah ${item.contradicted_count}×` };
  }
  return { tone: "idle", label: "menunggu" };
}

export default function ObservationsPage() {
  const { token } = useAuth();
  const [items, setItems] = useState<ObsItem[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    const sp = new URLSearchParams({ page: String(page), per_page: "25" });
    if (statusFilter) sp.set("status", statusFilter);
    if (search) sp.set("q", search);

    const res = await authFetch(`/api/observations?${sp}`);
    const data = await res.json();
    setItems(data.items ?? []);
    setTotal(data.pagination?.total ?? 0);
    setLoading(false);
  }, [page, statusFilter, search, token]);

  useEffect(() => {
    const t = setTimeout(fetchData, search ? 300 : 0);
    return () => clearTimeout(t);
  }, [fetchData, search]);

  const totalPages = Math.max(1, Math.ceil(total / 25));

  return (
    <Guard>
    <div className="flex min-h-screen flex-col lg:flex-row">
      <Sidebar />
      <main className="min-w-0 flex-1 px-5 pb-28 pt-7 sm:px-8 lg:px-12 lg:pb-12 lg:pt-10">
        <PageHeader title="Observasi">
          <span className="num text-tx-2">{total.toLocaleString("id-ID")}</span> fakta dari percakapan ·{" "}
          <span className="num text-tx-2">vania_obs_active</span>
        </PageHeader>

        <div className="mb-5 flex flex-wrap items-center gap-3">
          <SearchField
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Cari claim…"
          />
          <Segmented
            value={statusFilter}
            onChange={(v) => { setStatusFilter(v); setPage(1); }}
            options={FILTERS.map((f) => ({ value: f.v, label: f.label }))}
          />
        </div>

        <Panel className="divide-y divide-line-soft overflow-hidden">
          {loading && !items.length ? (
            Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-20 animate-pulse bg-sunken/50" />)
          ) : items.length ? (
            items.map((item) => {
              const st = status(item);
              return (
                <article key={item.id} className="grid gap-x-6 gap-y-2 px-5 py-4 transition-colors hover:bg-sunken/60 md:grid-cols-[150px_1fr]">
                  <div className="flex flex-wrap items-center gap-2 md:flex-col md:items-start">
                    <span className={cn("flex items-center gap-1.5 text-[12px] font-medium",
                      st.tone === "ok" ? "text-ok" : st.tone === "bad" ? "text-bad" : st.tone === "warn" ? "text-warn" : "text-tx-2")}>
                      <StatusDot tone={st.tone} size={7} />
                      {st.label}
                    </span>
                    <span className="num text-[11px] text-tx-3">
                      {item.kind} · conf <span className="text-tx-1">{item.confidence?.toFixed(2) ?? "?"}</span>
                    </span>
                    <span className="num text-[11px] text-tx-3">
                      {new Date(item.created_at).toLocaleDateString("id-ID")}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-[14px] leading-relaxed text-tx-1">{item.claim}</p>
                    {item.evidence && (
                      <p className="mt-2 border-l-2 border-line pl-3 text-[12.5px] leading-relaxed text-tx-3">
                        {item.evidence.slice(0, 150)}
                      </p>
                    )}
                  </div>
                </article>
              );
            })
          ) : (
            <div className="p-10 text-center text-sm text-tx-3">Tidak ada observasi yang cocok.</div>
          )}
        </Panel>

        <Pager page={page} pages={totalPages} onPage={setPage} total={total} />
      </main>
    </div>
    </Guard>
  );
}
