"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/lib/auth-context";
import { authFetch } from "@/lib/auth-fetch";
import { Sidebar } from "@/components/sidebar";
import { Guard } from "@/components/guard";
import { Panel, Pill, type Tone } from "@/components/monitor";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";

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
      <main className="flex-1 overflow-y-auto px-6 py-8 lg:px-10">
        <header className="mb-6">
          <h1 className="text-[25px] font-semibold tracking-[-0.025em] text-tx-1">Observasi</h1>
          <p className="mt-1 text-sm text-tx-3">
            <span className="num">{total.toLocaleString("id-ID")}</span> fakta dari percakapan ·{" "}
            <span className="num text-tx-2">vania_obs_active</span>
          </p>
        </header>

        <Panel className="mb-4 flex flex-wrap items-center gap-3 p-4">
          <div className="well flex min-w-[16rem] flex-1 items-center gap-3 rounded-xl px-4 py-2.5">
            <Search className="size-4 shrink-0 text-tx-3" />
            <input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Cari claim…"
              className="w-full bg-transparent text-sm text-tx-1 outline-none placeholder:text-tx-3"
            />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {FILTERS.map((f) => (
              <button
                key={f.v || "all"}
                onClick={() => { setStatusFilter(f.v); setPage(1); }}
                className={cn(
                  "rounded-full px-3 py-1.5 text-xs transition-colors",
                  statusFilter === f.v ? "raised text-tx-1" : "text-tx-3 hover:bg-sunken"
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
        </Panel>

        <div className="space-y-2">
          {loading && !items.length ? (
            Array.from({ length: 5 }).map((_, i) => (
              <Panel key={i} className="h-24 animate-pulse opacity-40" />
            ))
          ) : items.length ? (
            items.map((item) => {
              const st = status(item);
              return (
                <Panel key={item.id} hover className="p-4">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <Pill tone={st.tone}>{st.label}</Pill>
                    <span className="num rounded-full bg-idle-tint px-2.5 py-0.5 text-[11px] text-tx-2">
                      {item.kind}
                    </span>
                    <span className="num rounded-full bg-idle-tint px-2.5 py-0.5 text-[11px] text-tx-2">
                      conf {item.confidence?.toFixed(2) ?? "?"}
                    </span>
                    <span className="num ml-auto text-[11px] text-tx-3">
                      {new Date(item.created_at).toLocaleDateString("id-ID")}
                    </span>
                  </div>
                  <p className="text-sm leading-relaxed text-tx-1">{item.claim}</p>
                  {item.evidence && (
                    <p className="mt-1.5 text-xs leading-relaxed text-tx-3">
                      Bukti: {item.evidence.slice(0, 150)}
                    </p>
                  )}
                </Panel>
              );
            })
          ) : (
            <Panel className="p-10 text-center text-sm text-tx-3">Tidak ada observasi yang cocok.</Panel>
          )}
        </div>

        {totalPages > 1 && (
          <div className="mt-6 flex items-center justify-center gap-3.5">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="raised rounded-xl p-2.5 text-tx-1 disabled:opacity-40 disabled:shadow-none"
            >
              <ChevronLeft className="size-4" />
            </button>
            <span className="num text-sm text-tx-2">{page} / {totalPages}</span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
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
