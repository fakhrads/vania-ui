"use client";

import { usePathname } from "next/navigation";
import { navMeta } from "@/lib/nav";
import { Brand } from "@/components/brand";

/**
 * Kepala halaman seragam: penanda bagian ("Memori / 03") dari nav.ts,
 * judul serif, keterangan, dan slot aksi di kanan. Garis bawahnya yang
 * memisahkan kepala dari isi — bukan kartu.
 */
export function PageHeader({
  title,
  children,
  actions,
}: {
  title: React.ReactNode;
  children?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  const meta = navMeta(usePathname());
  return (
    <header className="mb-7 border-b border-line pb-6">
      {/* Di HP tidak ada sidebar, jadi merek numpang di sini. */}
      <div className="mb-6 lg:hidden">
        <Brand compact />
      </div>
      {meta && (
        <div className="kicker flex items-center gap-2">
          <span className="text-tx-2">{meta.group}</span>
          <span className="text-line">/</span>
          <span className="num">{meta.index}</span>
        </div>
      )}
      <div className="mt-2.5 flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
        <div className="min-w-0">
          <h1 className="display text-[38px] text-tx-1 sm:text-[46px]">{title}</h1>
          {children ? (
            <div className="mt-2.5 max-w-2xl text-[13.5px] leading-relaxed text-tx-3">{children}</div>
          ) : null}
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
    </header>
  );
}

/** Penanda "diperbarui HH:MM:SS" yang dipakai halaman-halaman live. */
export function LiveStamp({
  at,
  err,
  children,
}: {
  at?: Date | null;
  err?: string | null;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-2 rounded-md border border-line bg-surf-1 px-3 py-1.5 text-xs">
      {children}
      <span className="num text-tx-2">
        {err ? `gagal — ${err}` : at ? at.toLocaleTimeString("id-ID") : "menghubungkan…"}
      </span>
    </div>
  );
}
