"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { authFetch } from "@/lib/auth-fetch";
import { Sidebar } from "@/components/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Brain, Shield, Zap, AlertTriangle } from "lucide-react";

interface Stats {
  total: number;
  byKind: Record<string, number>;
  embeddingByKind: Record<string, number>;
  byProvenance: { provenance: string; count: number }[];
}

export default function DashboardPage() {
  const { token, loading: authLoading } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!token) {
      router.replace("/login");
      return;
    }
    authFetch("/api/stats")
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then(setStats)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [token, authLoading, router]);

  // Show nothing while checking auth
  if (authLoading || !token) return null;

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto p-6 lg:p-8">
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold">Dashboard</h1>
            <p className="text-sm text-zinc-500 mt-1">vania_ltm — memori Vania</p>
          </div>

          {loading && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Card key={i} className="bg-zinc-900 border-zinc-800">
                  <CardContent className="p-6"><div className="h-20 bg-zinc-800 rounded animate-pulse" /></CardContent>
                </Card>
              ))}
            </div>
          )}

          {error && (
            <Card className="bg-red-950/30 border-red-900/50">
              <CardContent className="p-4 text-sm text-red-400">Gagal memuat: {error}</CardContent>
            </Card>
          )}

          {stats && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard icon={<Brain className="h-5 w-5 text-blue-400" />} label="LTM Total" value={stats.total} />
                <StatCard icon={<Shield className="h-5 w-5 text-emerald-400" />} label="Active" value={stats.byKind.active || 0} sub="READ-ONLY" />
                <StatCard icon={<Zap className="h-5 w-5 text-amber-400" />} label="Seed" value={stats.byKind.seed || 0} sub="editable" />
                <StatCard icon={<AlertTriangle className="h-5 w-5 text-purple-400" />} label="Archive" value={stats.byKind.archive || 0} sub="editable" />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Card className="bg-zinc-900 border-zinc-800">
                  <CardHeader><CardTitle className="text-sm text-zinc-400">Embedding Status</CardTitle></CardHeader>
                  <CardContent>
                    {Object.entries(stats.embeddingByKind).map(([kind, count]) => (
                      <div key={kind} className="flex justify-between py-1 text-sm">
                        <span className="text-zinc-400">{kind}</span>
                        <span className="text-zinc-300">{count}/{stats.byKind[kind]} ter-embed</span>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                <Card className="bg-zinc-900 border-zinc-800">
                  <CardHeader><CardTitle className="text-sm text-zinc-400">Provenance</CardTitle></CardHeader>
                  <CardContent>
                    {stats.byProvenance.map((p) => (
                      <div key={p.provenance} className="flex justify-between py-1 text-sm">
                        <Badge variant="secondary" className="bg-zinc-800 text-zinc-400 text-xs">{p.provenance}</Badge>
                        <span className="text-zinc-300">{p.count}</span>
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
