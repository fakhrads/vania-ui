"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/lib/auth-context";
import { authFetch } from "@/lib/auth-fetch";
import { Sidebar } from "@/components/sidebar";
import { Guard } from "@/components/guard";
import { Panel, Pill } from "@/components/monitor";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";

interface InboxItem {
  id: number;
  turn_text: string;
  turn_at: string;
  processed: boolean;
  max_sim: number;
  created_at: string;
}

export default function InboxPage() {
  const { token } = useAuth();
  const [items, setItems] = useState<InboxItem[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    const sp = new URLSearchParams({ page: String(page), per_page: "25" });
    if (search) sp.set("q", search);

    const res = await authFetch(`/api/inbox?${sp}`);
    const data = await res.json();
    setItems(data.items ?? []);
    setTotal(data.pagination?.total ?? 0);
    setLoading(false);
  }, [page, search, token]);

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
          <h1 className="text-[25px] font-semibold tracking-[-0.025em] text-tx-1">Inbox</h1>
          <p className="mt-1 text-sm text-tx-3">
            <span className="num">{total.toLocaleString("id-ID")}</span> pesan masuk di{" "}
            <span className="num text-tx-2">vania_inbox_legacy</span>
          </p>
        </header>

        <div className="well mb-4 flex max-w-md items-center gap-3 rounded-xl px-4 py-2.5">
          <Search className="size-4 shrink-0 text-tx-3" />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Cari pesan…"
            className="w-full bg-transparent text-sm text-tx-1 outline-none placeholder:text-tx-3"
          />
        </div>

        <div className="space-y-2">
          {loading && !items.length ? (
            Array.from({ length: 5 }).map((_, i) => (
              <Panel key={i} className="h-24 animate-pulse opacity-40" />
            ))
          ) : items.length ? (
            items.map((item) => (
              <Panel key={item.id} hover className="p-4">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <Pill tone={item.processed ? "ok" : "warn"}>
                    {item.processed ? "terproses" : "menunggu"}
                  </Pill>
                  {item.max_sim !== null && (
                    <span className="num rounded-full bg-idle-tint px-2.5 py-0.5 text-[11px] text-tx-2">
                      max_sim {item.max_sim?.toFixed(3)}
                    </span>
                  )}
                  <span className="num ml-auto text-[11px] text-tx-3">
                    {new Date(item.created_at).toLocaleString("id-ID")}
                  </span>
                </div>
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-tx-1">{item.turn_text}</p>
              </Panel>
            ))
          ) : (
            <Panel className="p-10 text-center text-sm text-tx-3">Tidak ada pesan yang cocok.</Panel>
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
