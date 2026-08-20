"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { authFetch } from "@/lib/auth-fetch";
import { Sidebar } from "@/components/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Loader2, ArrowRight } from "lucide-react";

interface SearchResults {
  query: string;
  ilike: any[];
  vector: any[];
  vectorError: string | null;
}

export default function SearchPage() {
  const { token, loading: authLoading } = useAuth();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResults | null>(null);
  const [loading, setLoading] = useState(false);

  if (authLoading || !token) return null;

  const handleSearch = async () => {
    if (!query.trim()) return;
    setLoading(true);
    try {
      const res = await authFetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, limit: 10 }),
      });
      setResults(await res.json());
    } catch {
      setResults(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto p-6 lg:p-8">
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold">Semantic Search</h1>
            <p className="text-sm text-zinc-500 mt-1">pgvector cosine similarity vs ILIKE — berdampingan</p>
          </div>

          <div className="flex gap-2">
            <Input
              placeholder="Tulis pertanyaan... (contoh: 'siapa pacar fakhri')"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              className="flex-1 bg-zinc-900 border-zinc-800 text-base"
            />
            <Button onClick={handleSearch} disabled={loading} className="bg-blue-600 hover:bg-blue-700">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            </Button>
          </div>

          {results && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* pgvector */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Badge className="bg-blue-950 text-blue-400">pgvector</Badge>
                  <span className="text-xs text-zinc-500">cosine similarity</span>
                </div>
                {results.vectorError ? (
                  <Card className="bg-zinc-900 border-zinc-800">
                    <CardContent className="p-4 text-sm text-amber-400">{results.vectorError}</CardContent>
                  </Card>
                ) : results.vector.length === 0 ? (
                  <p className="text-sm text-zinc-600 py-4">Tidak ada hasil</p>
                ) : (
                  <div className="space-y-2">
                    {results.vector.map((r: any, i: number) => (
                      <Card key={r.id || i} className="bg-zinc-900 border-zinc-800">
                        <CardContent className="p-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5 mb-1">
                                <Badge variant="secondary" className="bg-zinc-800 text-zinc-400 text-xs">{r.kind}</Badge>
                                <Badge variant="secondary" className="bg-zinc-800 text-zinc-500 text-xs">{r.provenance}</Badge>
                              </div>
                              <p className="text-sm text-zinc-300 whitespace-pre-wrap">{r.preview}</p>
                            </div>
                            <div className="shrink-0 text-right">
                              <div className="text-lg font-mono font-bold text-blue-400">
                                {(r.similarity * 100).toFixed(1)}%
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>

              {/* ILIKE */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Badge className="bg-zinc-800 text-zinc-300">ILIKE</Badge>
                  <span className="text-xs text-zinc-500">exact text search</span>
                </div>
                {results.ilike.length === 0 ? (
                  <p className="text-sm text-zinc-600 py-4">Tidak ada hasil</p>
                ) : (
                  <div className="space-y-2">
                    {results.ilike.map((r: any, i: number) => (
                      <Card key={r.id || i} className="bg-zinc-900 border-zinc-800">
                        <CardContent className="p-3">
                          <div className="flex items-center gap-1.5 mb-1">
                            <Badge variant="secondary" className="bg-zinc-800 text-zinc-400 text-xs">{r.kind}</Badge>
                            <Badge variant="secondary" className="bg-zinc-800 text-zinc-500 text-xs">{r.provenance}</Badge>
                          </div>
                          <p className="text-sm text-zinc-300 whitespace-pre-wrap">{r.preview}</p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {!results && (
            <div className="text-center py-12 text-zinc-700">
              <Search className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="text-sm">Ketik pertanyaan lalu tekan Enter</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
