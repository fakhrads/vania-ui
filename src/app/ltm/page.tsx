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
import { ChevronLeft, ChevronRight, Search, Trash2, Edit3, Check, X, ArrowUp, Shield, ShieldOff } from "lucide-react";

interface LtmRow {
  id: number;
  content: string;
  content_hash: string;
  scope: string;
  store: string;
  kind: string;
  provenance: string;
  session_id: string;
  write_origin: string;
  created_at: string;
  updated_at: string;
  has_embedding: boolean;
}

export default function LtmPage() {
  const { token, loading: authLoading } = useAuth();
  const router = useRouter();
  const [items, setItems] = useState<LtmRow[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [kindFilter, setKindFilter] = useState<string>("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editValue, setEditValue] = useState("");
  const [promotingId, setPromotingId] = useState<number | null>(null);

  const fetchData = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    const sp = new URLSearchParams({ page: String(page), per_page: "25" });
    if (kindFilter) sp.set("kind", kindFilter);
    if (search) sp.set("q", search);

    const res = await authFetch(`/api/ltm?${sp}`);
    const data = await res.json();
    setItems(data.items);
    setTotal(data.pagination.total);
    setLoading(false);
  }, [page, kindFilter, search, token]);

  useEffect(() => {
    if (!authLoading && !token) { router.push("/login"); return; }
    fetchData();
  }, [token, authLoading, router, fetchData]);

  const isEditable = (kind: string) => ["seed", "archive", "evicted"].includes(kind);
  const isReadOnly = (kind: string) => kind === "active";

  const handleSave = async (id: number) => {
    await authFetch(`/api/ltm/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: editValue }),
    });
    setEditingId(null);
    fetchData();
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Yakin hapus baris ini?")) return;
    await authFetch(`/api/ltm/${id}`, { method: "DELETE" });
    fetchData();
  };

  const handlePromote = async (id: number) => {
    setPromotingId(id);
    const res = await authFetch("/api/ltm/promote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    const data = await res.json();
    if (data.ok) {
      alert(`✓ Dipromosikan ke MEMORY.md`);
    } else {
      alert(`Gagal: ${data.error}`);
    }
    setPromotingId(null);
  };

  const totalPages = Math.ceil(total / 25);

  const getKindBadge = (kind: string) => {
    switch (kind) {
      case "active":
        return <Badge className="bg-emerald-950 text-emerald-400 text-xs"><Shield className="h-3 w-3 mr-1" />active</Badge>;
      case "seed":
        return <Badge className="bg-blue-950 text-blue-400 text-xs">seed</Badge>;
      case "archive":
        return <Badge className="bg-zinc-800 text-zinc-400 text-xs">archive</Badge>;
      case "evicted":
        return <Badge className="bg-red-950 text-red-400 text-xs">evicted</Badge>;
      default:
        return <Badge variant="secondary" className="text-xs">{kind}</Badge>;
    }
  };

  if (authLoading || !token) return null;

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto p-6 lg:p-8">
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold">Long-Term Memory</h1>
            <p className="text-sm text-zinc-500 mt-1">
              vania_ltm — {total} baris · active=read-only, seed/archive/evicted=editable
            </p>
          </div>

          {/* Filters */}
          <div className="flex gap-2 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
              <Input
                placeholder="Cari konten..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="pl-9 bg-zinc-900 border-zinc-800"
              />
            </div>
            <div className="flex gap-1">
              {["", "active", "seed", "archive", "evicted"].map((k) => (
                <Button
                  key={k}
                  size="sm"
                  variant={kindFilter === k ? "default" : "ghost"}
                  className={kindFilter === k ? "bg-blue-600" : "text-zinc-500"}
                  onClick={() => { setKindFilter(k); setPage(1); }}
                >
                  {k || "All"}
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
                          {getKindBadge(item.kind)}
                          <Badge variant="secondary" className="bg-zinc-800 text-zinc-400 text-xs">
                            {item.provenance}
                          </Badge>
                          {item.has_embedding && (
                            <Badge variant="secondary" className="bg-emerald-950 text-emerald-400 text-xs">embed</Badge>
                          )}
                          <span className="text-xs text-zinc-600">
                            #{item.id} · {new Date(item.created_at).toLocaleDateString("id-ID")}
                          </span>
                        </div>

                        {editingId === item.id ? (
                          <div className="flex gap-2 mt-2">
                            <textarea
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              className="flex-1 bg-zinc-800 border border-zinc-700 rounded p-2 text-sm text-zinc-300 resize-y min-h-[60px]"
                              autoFocus
                            />
                            <div className="flex flex-col gap-1">
                              <Button size="sm" onClick={() => handleSave(item.id)} className="bg-emerald-600 hover:bg-emerald-700 h-8">
                                <Check className="h-4 w-4" />
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => setEditingId(null)} className="h-8">
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <p className="text-sm text-zinc-300 mt-1 whitespace-pre-wrap">{item.content}</p>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex gap-1 shrink-0">
                        {isEditable(item.kind) && (
                          <>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0 text-zinc-500 hover:text-blue-400"
                              title="Promote ke MEMORY.md"
                              disabled={promotingId === item.id}
                              onClick={() => handlePromote(item.id)}
                            >
                              <ArrowUp className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0 text-zinc-500 hover:text-zinc-300"
                              title="Edit"
                              onClick={() => { setEditingId(item.id); setEditValue(item.content); }}
                            >
                              <Edit3 className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0 text-zinc-500 hover:text-red-400"
                              title="Hapus"
                              onClick={() => handleDelete(item.id)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </>
                        )}
                        {isReadOnly(item.kind) && (
                          <div className="flex items-center gap-1 text-xs text-zinc-600">
                            <ShieldOff className="h-3 w-3" />
                            read-only
                          </div>
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
                {total} baris · halaman {page} dari {totalPages}
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
