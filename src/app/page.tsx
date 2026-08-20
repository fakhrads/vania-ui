"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { authFetch } from "@/lib/auth-fetch";
import { Sidebar } from "@/components/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Brain, Shield, Zap, Mail, Eye, AlertTriangle } from "lucide-react";

interface Stats {
  ltm: {
    total: number;
    byKind: Record<string, number>;
    embeddingByKind: Record<string, number>;
  };
  inbox: { total: number };
  observations: { total: number };
}

export default function DashboardPage() {
  const { token, loading: authLoading } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!token) { router.replace("/login"); return; }
    authFetch("/api/stats")
      .then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then(setStats)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [token, authLoading, router]);

  if (authLoading || !token) return null;

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto p-6 lg:p-8">
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold">Dashboard</h1>
            <p className="text-sm text-zinc-500 mt-1">Overview memori Vania</p>
          </div>

          {error && (
            <Card className="bg-red-950/30 border-red-900/50">
              <CardContent className="p-4 text-sm text-red-400">Error: {error}</CardContent>
            </Card>
          )}

          {loading && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Card key={i} className="bg-zinc-900 border-zinc-800">
                  <CardContent className="p-6"><div className="h-20 bg-zinc-800 rounded animate-pulse" /></CardContent>
                </Card>
              ))}
            </div>
          )}

          {stats && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard icon={<Mail className="h-5 w-5 text-blue-400" />} label="Inbox" value={stats.inbox.total} sub="pesan masuk" />
                <StatCard icon={<Eye className="h-5 w-5 text-purple-400" />} label="Observations" value={stats.observations.total} sub="fakta" />
                <StatCard icon={<Brain className="h-5 w-5 text-amber-400" />} label="LTM" value={stats.ltm.total} sub="long-term memory" />
                <StatCard icon={<Shield className="h-5 w-5 text-emerald-400" />} label="Active" value={stats.ltm.byKind.active || 0} sub="READ-ONLY" />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Card className="bg-zinc-900 border-zinc-800">
                  <CardHeader><CardTitle className="text-sm text-zinc-400">LTM by Kind</CardTitle></CardHeader>
                  <CardContent className="space-y-2">
                    {Object.entries(stats.ltm.byKind).map(([kind, count]) => (
                      <div key={kind} className="flex justify-between text-sm">
                        <Badge variant="secondary" className="bg-zinc-800 text-zinc-400 text-xs">{kind}</Badge>
                        <span className="text-zinc-300 font-mono">{count}</span>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                <Card className="bg-zinc-900 border-zinc-800">
                  <CardHeader><CardTitle className="text-sm text-zinc-400">Embedding Status</CardTitle></CardHeader>
                  <CardContent className="space-y-2">
                    {Object.entries(stats.ltm.embeddingByKind).map(([kind, count]) => (
                      <div key={kind} className="flex justify-between text-sm">
                        <span className="text-zinc-400">{kind}</span>
                        <span className="text-zinc-300 font-mono">{count}/{stats.ltm.byKind[kind]} embedded</span>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}

function StatCard({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string | number; sub?: string }) {
  return (
    <Card className="bg-zinc-900 border-zinc-800">
      <CardContent className="p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-zinc-800">{icon}</div>
          <div>
            <p className="text-xs text-zinc-500">{label}</p>
            <p className="text-2xl font-bold text-zinc-100">{value}</p>
            {sub && <p className="text-xs text-zinc-600">{sub}</p>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
