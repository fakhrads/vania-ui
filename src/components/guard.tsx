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
      <div className="flex min-h-screen items-center justify-center bg-bg p-4">
        <div className="panel flex items-center gap-3.5 rounded-2xl px-6 py-5">
          <div className="raised flex size-10 items-center justify-center rounded-xl text-accent-solid">
            <Brain className="size-4 animate-pulse" />
          </div>
          <div>
            <p className="text-sm font-medium text-tx-1">Fakhri&apos;s Agentic Memory</p>
            <p className="text-xs text-tx-3">
              {loading ? "Memeriksa sesi…" : "Mengarahkan ke masuk…"}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
