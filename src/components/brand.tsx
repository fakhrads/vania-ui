import { cn } from "@/lib/utils";

/**
 * Tongkat Hermes: satu batang, dua sayap, dua ular yang saling membelit.
 * Dua ular itu bukan hiasan saja — di dasbor ini selalu ada dua sisi yang
 * harus bertemu (sisi A state.db vs sisi B ltm_ops), dan tanda ini yang
 * mengingatkannya.
 */
export function CaduceusMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.35}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={cn("size-5", className)}
    >
      <circle cx="12" cy="3.1" r="1.25" />
      <path d="M12 4.4v17.1" />
      <path d="M11.2 6.1C9 4.4 6 4.2 2.8 5.4c2.2.3 3.4 1 4.5 1.9 1.3 1 2.6 1.1 3.9.6" />
      <path d="M12.8 6.1c2.2-1.7 5.2-1.9 8.4-.7-2.2.3-3.4 1-4.5 1.9-1.3 1-2.6 1.1-3.9.6" />
      <path d="M14.4 8.6c1.9 1.4 1.4 3.2-2.4 4.4s-4.3 3-2.4 4.4 1.9 2.8-.1 3.6" />
      <path d="M9.6 8.6c-1.9 1.4-1.4 3.2 2.4 4.4s4.3 3 2.4 4.4-1.9 2.8.1 3.6" />
    </svg>
  );
}

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <div
        className={cn(
          "flex shrink-0 items-center justify-center rounded-lg border border-line bg-surf-1 text-brass",
          compact ? "size-8" : "size-10"
        )}
      >
        <CaduceusMark className={compact ? "size-[18px]" : "size-[22px]"} />
      </div>
      <div className="min-w-0 leading-none">
        <p className={cn("display text-tx-1", compact ? "text-[21px]" : "text-[25px]")}>Caduceus</p>
        {!compact && <p className="kicker mt-1.5 whitespace-nowrap !text-[9.5px] !tracking-[0.1em]">Hermes · kendali misi</p>}
      </div>
    </div>
  );
}
