"use client";

import { useState } from "react";
import { authFetch } from "@/lib/auth-fetch";
import { Sidebar } from "@/components/sidebar";
import { Guard } from "@/components/guard";
import { Panel, KIND_CLASS } from "@/components/monitor";
import { cn } from "@/lib/utils";
import { Search, Loader2, Inbox, Eye, Brain, ArrowRight } from "lucide-react";
import { PageHeader } from "@/components/page-header";

type Hit = {
  id: number;
  preview: string;
  created_at: string;
  kind?: string;
  provenance?: string;
  confidence?: number;
};

interface SearchResults {
  inbox: Hit[];
  observations: Hit[];
  ltm: Hit[];
  total: number;
}

/** Satu kolom hasil. Tiga sumber dirender identik supaya bisa dibandingkan. */
function Column({
  title,
  icon: Icon,
  hits,
  render,
}: {
  title: string;
  icon: typeof Inbox;
  hits: Hit[];
  render?: (h: Hit) => React.ReactNode;
}) {
  return (
    <Panel className="overflow-hidden">
      <div className="flex items-center justify-between border-b border-line px-5 py-3">
        <div className="flex items-center gap-2.5">
          <Icon className="size-4 text-tx-3" strokeWidth={1.75} />
          <h2 className="text-[13.5px] font-semibold text-tx-1">{title}</h2>
        </div>
        <span className="num text-[12px] text-tx-2">{hits.length}</span>
      </div>
      <div className="divide-y divide-line-soft">
        {hits.length ? (
          hits.map((h, i) => (
            <div key={i} className="px-5 py-3.5">
              <div className="mb-1.5 flex flex-wrap items-center gap-2">
                {render?.(h)}
                <span className="num ml-auto text-[10.5px] text-tx-3">
                  {new Date(h.created_at).toLocaleDateString("id-ID")}
                </span>
              </div>
              <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-tx-1">
                {h.preview}
              </p>
            </div>
          ))
        ) : (
          <p className="px-5 py-6 text-center text-xs text-tx-3">Tidak ada hasil.</p>
        )}
      </div>
    </Panel>
  );
}

export default function SearchPage() {
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
    <div className="flex min-h-screen flex-col lg:flex-row">
      <Sidebar />
      <main className="min-w-0 flex-1 px-5 pb-28 pt-7 sm:px-8 lg:px-12 lg:pb-12 lg:pt-10">
        <PageHeader title="Cari">Pencarian teks lintas korpus, inbox, dan observasi.</PageHeader>

        {/* Kotak cari besar bergaya baris tulis — halaman ini isinya memang
            cuma satu pertanyaan. */}
        <div className="mb-8 flex items-center gap-3 border-b-2 border-tx-1 pb-2">
          <Search className="size-6 shrink-0 text-tx-3" strokeWidth={1.5} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            placeholder="Tulis kata kunci…"
            className="display w-full min-w-0 bg-transparent text-[30px] text-tx-1 outline-none placeholder:text-tx-3/60 sm:text-[38px]"
            autoFocus
          />
          <button
            onClick={handleSearch}
            disabled={loading}
            aria-label="Cari"
            className="flex size-10 shrink-0 items-center justify-center rounded-md bg-tx-1 text-bg transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {loading ? <Loader2 className="size-4 animate-spin" /> : <ArrowRight className="size-4" />}
          </button>
        </div>

        {results ? (
          <>
            <p className="kicker mb-4">
              <span className="num text-tx-1">{results.total}</span> hasil untuk{" "}
              <span className="num text-tx-1">{query}</span>
            </p>
            <div className="grid gap-4 lg:grid-cols-3">
              <Column
                title="Korpus"
                icon={Brain}
                hits={results.ltm}
                render={(h) => (
                  <>
                    {h.kind && (
                      <span className={cn("num rounded-[4px] px-1.5 py-px text-[10.5px]", KIND_CLASS[h.kind])}>
                        {h.kind}
                      </span>
                    )}
                    {h.provenance && (
                      <span className="num text-[10px] text-tx-3">{h.provenance}</span>
                    )}
                  </>
                )}
              />
              <Column title="Inbox" icon={Inbox} hits={results.inbox} />
              <Column
                title="Observasi"
                icon={Eye}
                hits={results.observations}
                render={(h) => (
                  <>
                    {h.kind && (
                      <span className="num rounded-[4px] border border-line px-1.5 py-px text-[10.5px] text-tx-2">
                        {h.kind}
                      </span>
                    )}
                    {h.confidence != null && (
                      <span className="num text-[10px] text-tx-3">conf {h.confidence.toFixed(2)}</span>
                    )}
                  </>
                )}
              />
            </div>
          </>
        ) : (
          <p className="kicker">Tekan Enter untuk mencari · korpus · inbox · observasi</p>
        )}
      </main>
    </div>
    </Guard>
  );
}
