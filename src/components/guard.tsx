"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { CaduceusMark } from "@/components/brand";

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
        <div className="flex flex-col items-center text-center">
          <CaduceusMark className="size-10 text-brass" />
          <p className="display mt-4 text-[30px] text-tx-1">Caduceus</p>
          <p className="kicker mt-3 flex items-center gap-2">
            <span className="mark mark-idle size-[7px] text-tx-3" />
            {loading ? "Memeriksa sesi…" : "Mengarahkan ke masuk…"}
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
