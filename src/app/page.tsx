"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { authFetch } from "@/lib/auth-fetch";
import { Sidebar } from "@/components/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Brain, Inbox, Eye, Zap, CheckCircle2, AlertTriangle, Shield } from "lucide-react";

interface Stats {
  inbox: { total: number };
  observations: { total: number };
  ltm: { total: number };
  embedding: { total: number; has: number; missing: number };
  obsStatus: { total: number; hasEmbedding: number };
  daily: { day: string; count: number }[];
  sources: { source: string; count: number }[];
  recentInbox: { id: string; source: string; preview: string; created_at: string }[];
}

export default function DashboardPage() {
  const { token, loading: authLoading } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !token) {
      router.push("/login");
      return;
    }
    if (token) {
      authFetch("/api/stats")
        .then((r) => r.json())
        .then(setStats)
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [token, authLoading, router]);

  if (authLoading || !token) return null;

  if (loading) {
    return (
      <div className="flex h-screen overflow-hidden">
        <Sidebar />
        <main className="flex-1 p-6 lg:p-8">
          <div className="space-y-6">
            <h1 className="text-2xl font-bold">Dashboard</h1>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <Card key={i} className="bg-zinc-900 border-zinc-800">
                  <CardContent className="p-6"><div className="h-20 bg-zinc-800 rounded animate-pulse" /></CardContent>
                </Card>
              ))}
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (!stats) return <div className="p-8 text-center text-zinc-500">Gagal memuat</div>;

  const embedPct = stats.embedding.total > 0
    ? Math.round((stats.embedding.has / stats.embedding.total) * 100)
    : 0;

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto p-6 lg:p-8">
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold">Dashboard</h1>
            <p className="text-sm text-zinc-500 mt-1">vania_ltm — {stats.ltm.total} baris total</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard icon={<Brain className="h-5 w-5 text-blue-400" />} label="LTM Total" value={stats.ltm.total} />
            <StatCard icon={<Zap className="h-5 w-5 text-amber-400" />} label="Embeddings" value={`${embedPct}%`} sub={`${stats.embedding.has}/${stats.embedding.total}`} />
            <StatCard icon={<Shield className="h-5 w-5 text-purple-400" />} label="Active (Read-Only)" value={11} sub="MEMORY.md sync" />
            <StatCard icon={<Eye className="h-5 w-5 text-emerald-400" />} label="Seed / Archive" value={234} sub="editable" />
          </div>

          {stats.embedding.missing > 0 && (
            <Card className="bg-amber-950/30 border-amber-900/50">
              <CardContent className="p-4 flex items-center gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0" />
                <p className="text-sm text-amber-200">
                  <strong>{stats.embedding.missing}</strong> baris belum punya embedding.
                </p>
              </CardContent>
            </Card>
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
