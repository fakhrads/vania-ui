"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { authFetch } from "@/lib/auth-fetch";
import { Sidebar } from "@/components/sidebar";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";

interface InboxItem {
  id: string;
  source: string;
  message: string;
  meta: any;
  has_embedding: boolean;
  embedding_size: number;
  created_at: string;
}

export default function InboxPage() {
  const { token, loading: authLoading } = useAuth();
  const router = useRouter();
  const [items, setItems] = useState<InboxItem[]>([]);
  const [sources, setSources] = useState<{ source: string; count: number }[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [sourceFilter, setSourceFilter] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    const sp = new URLSearchParams({ page: String(page), per_page: "25" });
    if (sourceFilter) sp.set("source", sourceFilter);
    if (search) sp.set("q", search);

    const res = await authFetch(`/api/inbox?${sp}`);
    const data = await res.json();
    setItems(data.items);
    setSources(data.sources || []);
    setTotal(data.pagination.total);
    setLoading(false);
  }, [page, sourceFilter, search, token]);

  useEffect(() => {
    if (!authLoading && !token) { router.push("/login"); return; }
    fetchData();
  }, [token, authLoading, router, fetchData]);

  if (authLoading || !token) return null;

  const totalPages = Math.ceil(total / 25);

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto p-6 lg:p-8">
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold">Inbox</h1>
            <p className="text-sm text-zinc-500 mt-1">
              vania_inbox_legacy — {total} pesan masuk
            </p>
          </div>

          {/* Filters */}
          <div className="flex gap-2 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
              <Input
                placeholder="Cari pesan..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="pl-9 bg-zinc-900 border-zinc-800"
              />
            </div>
            <div className="flex gap-1 flex-wrap">
              <Button
                size="sm"
                variant={!sourceFilter ? "default" : "ghost"}
                className={!sourceFilter ? "bg-blue-600" : "text-zinc-500"}
                onClick={() => { setSourceFilter(""); setPage(1); }}
              >
                All
              </Button>
              {sources.map((s) => (
                <Button
                  key={s.source}
                  size="sm"
                  variant={sourceFilter === s.source ? "default" : "ghost"}
                  className={sourceFilter === s.source ? "bg-blue-600" : "text-zinc-500"}
                  onClick={() => { setSourceFilter(s.source); setPage(1); }}
                >
                  {s.source} ({s.count})
                </Button>
              ))}
            </div>
          </div>

          {/* Items */}
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-24 bg-zinc-900 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-12 text-zinc-600">Tidak ada data</div>
          ) : (
            <div className="space-y-2">
              {items.map((item) => (
                <Card key={item.id} className="bg-zinc-900 border-zinc-800">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <Badge variant="secondary" className="bg-zinc-800 text-zinc-400 text-xs">
                            {item.source || "unknown"}
                          </Badge>
                          {item.has_embedding ? (
                            <Badge className="bg-emerald-950 text-emerald-400 text-xs">
                              embed
                            </Badge>
                          ) : (
                            <Badge className="bg-amber-950 text-amber-400 text-xs">
                              no embed
                            </Badge>
                          )}
                          <span className="text-xs text-zinc-600">
                            {new Date(item.created_at).toLocaleString("id-ID")}
                          </span>
                        </div>
                        <p className="text-sm text-zinc-300 whitespace-pre-wrap">{item.message}</p>
                        {item.meta && Object.keys(item.meta).length > 0 && (
                          <p className="text-xs text-zinc-600 mt-1">
                            meta: {JSON.stringify(item.meta).slice(0, 80)}
                          </p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {/* Pagination */}
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
  );
}
