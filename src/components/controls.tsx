"use client";

import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";

/**
 * Kontrol bersama halaman-halaman tabel. Sebelumnya tiap halaman menata
 * tombol filter & paginasinya sendiri, dan bentuknya melenceng pelan-pelan
 * (rounded-xl di satu tempat, rounded-full di tempat lain).
 */

export function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: { value: T; label: React.ReactNode }[];
  onChange: (v: T) => void;
  label?: string;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {label ? <span className="kicker">{label}</span> : null}
      <div className="inline-flex flex-wrap rounded-md border border-line bg-surf-1 p-0.5" role="group" aria-label={label}>
        {options.map((o) => (
          <button
            key={o.value || "__all"}
            onClick={() => onChange(o.value)}
            aria-pressed={value === o.value}
            className={cn(
              "rounded-[4px] px-2.5 py-1 text-[12px] transition-colors",
              value === o.value ? "bg-tx-1 font-medium text-bg" : "text-tx-2 hover:bg-sunken hover:text-tx-1"
            )}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function SearchField({
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className={cn("relative flex min-w-[14rem] flex-1 items-center", className)}>
      <Search className="pointer-events-none absolute left-3 size-4 text-tx-3" strokeWidth={1.75} />
      <input
        {...props}
        className="w-full rounded-md border border-line bg-surf-1 py-2 pl-9 pr-3 text-[13.5px] text-tx-1 outline-none transition-colors placeholder:text-tx-3 focus:border-tx-2"
      />
    </label>
  );
}

export function Pager({
  page,
  pages,
  onPage,
  total,
}: {
  page: number;
  pages: number;
  onPage: (p: number) => void;
  total?: number;
}) {
  if (pages <= 1) return null;
  const btn =
    "flex size-8 items-center justify-center rounded-md border border-line bg-surf-1 text-tx-1 transition-colors hover:border-tx-3 disabled:opacity-35 disabled:hover:border-line";
  return (
    <div className="mt-5 flex items-center justify-between gap-3">
      <span className="kicker">
        {total != null ? `${total.toLocaleString("id-ID")} baris` : ""}
      </span>
      <div className="flex items-center gap-3">
        <button aria-label="Halaman sebelumnya" onClick={() => onPage(Math.max(1, page - 1))} disabled={page === 1} className={btn}>
          <ChevronLeft className="size-4" />
        </button>
        <span className="num text-[13px] text-tx-2">
          <span className="text-tx-1">{page}</span> / {pages}
        </span>
        <button aria-label="Halaman berikutnya" onClick={() => onPage(Math.min(pages, page + 1))} disabled={page === pages} className={btn}>
          <ChevronRight className="size-4" />
        </button>
      </div>
    </div>
  );
}
