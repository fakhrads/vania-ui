"use client";

import { useEffect, useState, useCallback } from "react";
import { useAuth } from "@/lib/auth-context";
import { authFetch } from "@/lib/auth-fetch";
import { Sidebar } from "@/components/sidebar";
import { Guard } from "@/components/guard";
import { Panel } from "@/components/monitor";
import { StatusDot } from "@/components/monitor";
import { PageHeader } from "@/components/page-header";
import { SearchField, Pager } from "@/components/controls";

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
      <main className="min-w-0 flex-1 px-5 pb-28 pt-7 sm:px-8 lg:px-12 lg:pb-12 lg:pt-10">
        <PageHeader title="Inbox">
          <span className="num text-tx-2">{total.toLocaleString("id-ID")}</span> pesan masuk di{" "}
          <span className="num text-tx-2">vania_inbox_legacy</span>
        </PageHeader>

        <div className="mb-5 flex max-w-md">
          <SearchField
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Cari pesan…"
          />
        </div>

        <Panel className="divide-y divide-line-soft overflow-hidden">
          {loading && !items.length ? (
            Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-20 animate-pulse bg-sunken/50" />)
          ) : items.length ? (
            items.map((item) => (
              <article key={item.id} className="grid gap-x-6 gap-y-2 px-5 py-4 transition-colors hover:bg-sunken/60 md:grid-cols-[150px_1fr]">
                <div className="flex flex-wrap items-center gap-2 md:flex-col md:items-start">
                  <span className="num text-[11px] text-tx-3">
                    {new Date(item.created_at).toLocaleString("id-ID", {
                      day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
                    })}
                  </span>
                  <span className="flex items-center gap-1.5 text-[12px] text-tx-2">
                    <StatusDot tone={item.processed ? "ok" : "warn"} size={7} />
                    {item.processed ? "terproses" : "menunggu"}
                  </span>
                  {item.max_sim !== null && (
                    <span className="num text-[11px] text-tx-3">
                      sim <span className="text-tx-1">{item.max_sim?.toFixed(3)}</span>
                    </span>
                  )}
                </div>
                <p className="whitespace-pre-wrap text-[14px] leading-relaxed text-tx-1">{item.turn_text}</p>
              </article>
            ))
          ) : (
            <div className="p-10 text-center text-sm text-tx-3">Tidak ada pesan yang cocok.</div>
          )}
        </Panel>

        <Pager page={page} pages={totalPages} onPage={setPage} total={total} />
      </main>
    </div>
    </Guard>
  );
}
