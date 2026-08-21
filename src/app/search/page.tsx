"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { authFetch } from "@/lib/auth-fetch";
import { Sidebar } from "@/components/sidebar";
import { Guard } from "@/components/guard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Loader2, Inbox, Eye, Brain } from "lucide-react";

interface SearchResults {
  inbox: any[];
  observations: any[];
  ltm: any[];
  total: number;
}

export default function SearchPage() {
  const { token, loading: authLoading } = useAuth();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResults | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSearch = async () => {
    if (!query.trim()) return;
    setLoading(true);
    try {
      const res = await authFetch("/api/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, limit: 10 }),
      });
      const data = await res.json();
      setResults(data.results);
    } catch {
      setResults(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Guard>
    <div className="flex flex-col h-screen overflow-hidden lg:flex-row">
      <div className="mesh-bg" />
      <Sidebar />
      <main className="flex-1 overflow-y-auto p-6 lg:p-8">
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold">Semantic Search</h1>
            <p className="text-sm text-zinc-500 mt-1">Cari di semua tabel: inbox, observations, LTM</p>
          </div>

          <div className="flex gap-2">
            <Input
              placeholder="Tulis pertanyaan..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              className="flex-1 glass border-white/[0.07] text-base"
            />
            <Button onClick={handleSearch} disabled={loading} className="bg-blue-600 hover:bg-blue-700">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            </Button>
          </div>

          {results && (
            <div className="space-y-6">
              <p className="text-sm text-zinc-500">{results.total} hasil ditemukan</p>

              {/* Inbox Results */}
              {results.inbox.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Inbox className="h-4 w-4 text-blue-400" />
                    <h2 className="text-sm font-medium text-zinc-400">Inbox ({results.inbox.length})</h2>
                  </div>
                  <div className="space-y-2">
                    {results.inbox.map((r, i) => (
                      <Card key={`inbox-${i}`} className="glass border-white/[0.07]">
                        <CardContent className="p-3">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge className="bg-blue-950 text-blue-400 text-xs">inbox</Badge>
                            <Badge variant="secondary" className="bg-zinc-800 text-zinc-400 text-xs">{r.source}</Badge>
                            <span className="text-xs text-zinc-600">{new Date(r.created_at).toLocaleDateString("id-ID")}</span>
                          </div>
                          <p className="text-sm text-zinc-300 whitespace-pre-wrap">{r.preview}</p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {/* Observations Results */}
              {results.observations.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Eye className="h-4 w-4 text-purple-400" />
                    <h2 className="text-sm font-medium text-zinc-400">Observations ({results.observations.length})</h2>
                  </div>
                  <div className="space-y-2">
                    {results.observations.map((r, i) => (
                      <Card key={`obs-${i}`} className="glass border-white/[0.07]">
                        <CardContent className="p-3">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge className="bg-purple-950 text-purple-400 text-xs">observations</Badge>
                            <Badge variant="secondary" className="bg-zinc-800 text-zinc-400 text-xs">{r.source}</Badge>
                            {r.confidence && <Badge variant="secondary" className="bg-zinc-800 text-zinc-500 text-xs">conf: {r.confidence.toFixed(2)}</Badge>}
                            <span className="text-xs text-zinc-600">{new Date(r.created_at).toLocaleDateString("id-ID")}</span>
                          </div>
                          <p className="text-sm text-zinc-300 whitespace-pre-wrap">{r.preview}</p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {/* LTM Results */}
              {results.ltm.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <Brain className="h-4 w-4 text-amber-400" />
                    <h2 className="text-sm font-medium text-zinc-400">LTM ({results.ltm.length})</h2>
                  </div>
                  <div className="space-y-2">
                    {results.ltm.map((r, i) => (
                      <Card key={`ltm-${i}`} className="glass border-white/[0.07]">
                        <CardContent className="p-3">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge className="bg-amber-950 text-amber-400 text-xs">ltm</Badge>
                            <Badge variant="secondary" className="bg-zinc-800 text-zinc-400 text-xs">{r.kind}</Badge>
                            <Badge variant="secondary" className="bg-zinc-800 text-zinc-500 text-xs">{r.provenance}</Badge>
                            <span className="text-xs text-zinc-600">{new Date(r.created_at).toLocaleDateString("id-ID")}</span>
                          </div>
                          <p className="text-sm text-zinc-300 whitespace-pre-wrap">{r.preview}</p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {results.total === 0 && (
                <div className="text-center py-12 text-zinc-600">
                  Tidak ada hasil untuk &quot;{query}&quot;
                </div>
              )}
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
    </Guard>
  );
}
