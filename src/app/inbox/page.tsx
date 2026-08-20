"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { authFetch } from "@/lib/auth-fetch";
import { Sidebar } from "@/components/sidebar";
import { Guard } from "@/components/guard";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  const { token, loading: authLoading } = useAuth();
  const router = useRouter();
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
    setItems(data.items);
    setTotal(data.pagination.total);
    setLoading(false);
  }, [page, search, token]);

  useEffect(() => {
    if (!authLoading && !token) { router.push("/login"); return; }
    fetchData();
  }, [token, authLoading, router, fetchData]);

  const totalPages = Math.ceil(total / 25);

  return (
    <Guard>
    <div className="flex h-screen overflow-hidden">
      <div className="mesh-bg" />
      <Sidebar />
      <main className="flex-1 overflow-y-auto p-6 lg:p-8">
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold">Inbox</h1>
            <p className="text-sm text-zinc-500 mt-1">
              vania_inbox_legacy — {total} pesan masuk
            </p>
          </div>

          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
            <Input
              placeholder="Cari pesan..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="pl-9 glass border-white/[0.07]"
            />
          </div>

          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-24 glass rounded-2xl animate-pulse" />
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-12 text-zinc-600">Tidak ada data</div>
          ) : (
            <div className="space-y-2">
              {items.map((item) => (
                <Card key={item.id} className="glass border-white/[0.07]">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <Badge variant="secondary" className={
                            item.processed
                              ? "bg-emerald-950 text-emerald-400 text-xs"
                              : "bg-amber-950 text-amber-400 text-xs"
                          }>
                            {item.processed ? "processed" : "pending"}
                          </Badge>
                          {item.max_sim !== null && (
                            <Badge variant="secondary" className="bg-zinc-800 text-zinc-500 text-xs">
                              max_sim: {item.max_sim?.toFixed(3)}
                            </Badge>
                          )}
                          <span className="text-xs text-zinc-600">
                            {new Date(item.created_at).toLocaleString("id-ID")}
                          </span>
                        </div>
                        <p className="text-sm text-zinc-300 whitespace-pre-wrap">{item.turn_text}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-xs text-zinc-600">
                {total} pesan · hal {page} dari {totalPages}
              </p>
              <div className="flex gap-1">
                <Button size="sm" variant="ghost" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button size="sm" variant="ghost" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
    </Guard>
  );
}
