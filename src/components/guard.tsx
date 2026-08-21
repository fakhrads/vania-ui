"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { Brain } from "lucide-react";

/**
 * Gerbang auth seragam.
 *
 * Sebelumnya tiap halaman menangani ini sendiri: sebagian `return null`
 * (layar kosong), sebagian merender cangkang tanpa data. Hasilnya kedip
 * putih di sebagian rute dan panel kosong di rute lain. Di sini satu
 * perilaku untuk semuanya — layar tunggu bergaya, lalu arahkan ke /login.
 */
export function Guard({ children }: { children: React.ReactNode }) {
  const { token, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !token) router.replace("/login");
  }, [loading, token, router]);

  if (loading || !token) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="mesh-bg" />
        <div className="glass flex items-center gap-3 rounded-3xl px-6 py-5">
          <div className="flex size-9 items-center justify-center rounded-2xl border border-white/10 bg-gradient-to-br from-sky-400/25 to-violet-500/20">
            <Brain className="size-4 animate-pulse text-sky-300" />
          </div>
          <div>
            <p className="text-sm font-medium text-zinc-200">Fakhri&apos;s Agentic Memory</p>
            <p className="text-xs text-zinc-500">
              {loading ? "Memeriksa sesi…" : "Mengarahkan ke masuk…"}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
