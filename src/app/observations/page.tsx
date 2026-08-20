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
import { ChevronLeft, ChevronRight, Search, CheckCircle2, XCircle, AlertCircle } from "lucide-react";

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

export default function ObservationsPage() {
  const { token, loading: authLoading } = useAuth();
  const router = useRouter();
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
    setItems(data.items);
    setTotal(data.pagination.total);
    setLoading(false);
  }, [page, statusFilter, search, token]);

  useEffect(() => {
    if (!authLoading && !token) { router.push("/login"); return; }
    fetchData();
  }, [token, authLoading, router, fetchData]);

  if (authLoading || !token) return null;

  const totalPages = Math.ceil(total / 25);

  const getStatusBadge = (item: ObsItem) => {
    if (item.confirmed_at) {
      return <Badge className="bg-emerald-950 text-emerald-400 text-xs"><CheckCircle2 className="h-3 w-3 mr-1" />Confirmed</Badge>;
    }
    if (item.contradicted_count > 0) {
      return <Badge className="bg-red-950 text-red-400 text-xs"><XCircle className="h-3 w-3 mr-1" />Contradicted ({item.contradicted_count})</Badge>;
    }
    return <Badge className="bg-zinc-800 text-zinc-400 text-xs"><AlertCircle className="h-3 w-3 mr-1" />Pending</Badge>;
  };

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto p-6 lg:p-8">
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold">Observations</h1>
            <p className="text-sm text-zinc-500 mt-1">
              vania_obs_active — {total} fakta dari percakapan
            </p>
          </div>

          <div className="flex gap-2 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
              <Input
                placeholder="Cari claim..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="pl-9 bg-zinc-900 border-zinc-800"
              />
            </div>
            <div className="flex gap-1">
              {["", "confirmed", "contradicted", "pending"].map((f) => (
                <Button
                  key={f}
                  size="sm"
                  variant={statusFilter === f ? "default" : "ghost"}
                  className={statusFilter === f ? "bg-blue-600" : "text-zinc-500"}
                  onClick={() => { setStatusFilter(f); setPage(1); }}
                >
                  {f || "All"}
                </Button>
              ))}
            </div>
          </div>

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
                          {getStatusBadge(item)}
                          <Badge variant="secondary" className="bg-zinc-800 text-zinc-400 text-xs">
                            {item.kind}
                          </Badge>
                          <Badge variant="secondary" className="bg-zinc-800 text-zinc-500 text-xs">
                            conf: {item.confidence?.toFixed(2) || "?"}
                          </Badge>
                          <span className="text-xs text-zinc-600">
                            {new Date(item.created_at).toLocaleDateString("id-ID")}
                          </span>
                        </div>
                        <p className="text-sm text-zinc-300">{item.claim}</p>
                        {item.evidence && (
                          <p className="text-xs text-zinc-600 mt-1">
                            Evidence: {item.evidence.slice(0, 150)}
                          </p>
                        )}
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
                {total} item · hal {page} dari {totalPages}
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
