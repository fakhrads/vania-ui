"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { authFetch } from "@/lib/auth-fetch";
import { Sidebar } from "@/components/sidebar";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface OpsRow {
  id: number;
  ts: string;
  action: string;
  target: string;
  status: string;
  error_msg: string;
  content_hash: string;
  matched_row_id: number;
  rows_added: number;
  rows_evicted: number;
  scope: string;
  session_id: string;
}

export default function OpsPage() {
  const { token, loading: authLoading } = useAuth();
  const router = useRouter();
  const [items, setItems] = useState<OpsRow[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    const res = await authFetch(`/api/ops?page=${page}&per_page=30`);
    const data = await res.json();
    setItems(data.items);
    setTotal(data.pagination.total);
    setLoading(false);
  }, [page, token]);

  useEffect(() => {
    if (!authLoading && !token) { router.push("/login"); return; }
    fetchData();
  }, [token, authLoading, router, fetchData]);

  if (authLoading || !token) return null;

  const totalPages = Math.ceil(total / 30);

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto p-6 lg:p-8">
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold">Audit Log</h1>
            <p className="text-sm text-zinc-500 mt-1">vania_ltm_ops — semua operasi yang tercatat</p>
          </div>

          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="h-14 bg-zinc-900 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {items.map((item) => (
                <Card key={item.id} className="bg-zinc-900 border-zinc-800">
                  <CardContent className="p-3">
                    <div className="flex items-center gap-3 flex-wrap">
                      <Badge variant="secondary" className={
                        item.action === "promote" ? "bg-blue-950 text-blue-400 text-xs" :
                        item.action === "edit" ? "bg-amber-950 text-amber-400 text-xs" :
                        item.action === "delete" ? "bg-red-950 text-red-400 text-xs" :
                        "bg-zinc-800 text-zinc-400 text-xs"
                      }>
                        {item.action}
                      </Badge>
                      <Badge variant="secondary" className={
                        item.status === "ok" ? "bg-emerald-950 text-emerald-400 text-xs" :
                        item.status === "error" ? "bg-red-950 text-red-400 text-xs" :
                        "bg-zinc-800 text-zinc-500 text-xs"
                      }>
                        {item.status}
                      </Badge>
                      {item.target && <span className="text-xs text-zinc-600">→ {item.target}</span>}
                      <span className="text-xs text-zinc-600">scope: {item.scope}</span>
                      {item.rows_added > 0 && <span className="text-xs text-emerald-500">+{item.rows_added}</span>}
                      {item.rows_evicted > 0 && <span className="text-xs text-red-500">-{item.rows_evicted}</span>}
                      {item.error_msg && <span className="text-xs text-red-400">{item.error_msg}</span>}
                      <span className="text-xs text-zinc-600 ml-auto">
                        {new Date(item.ts).toLocaleString("id-ID")}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-xs text-zinc-600">{total} entry · hal {page}/{totalPages}</p>
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
