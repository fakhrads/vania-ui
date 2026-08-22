"use client";

import { useState } from "react";
import { authFetch } from "@/lib/auth-fetch";
import { Sidebar } from "@/components/sidebar";
import { Guard } from "@/components/guard";
import { Panel, KIND_CLASS } from "@/components/monitor";
import { cn } from "@/lib/utils";
import { Search, Loader2, Inbox, Eye, Brain } from "lucide-react";

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
    <Panel className="p-5">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <Icon className="size-4 text-tx-3" />
          <h2 className="text-[13px] font-semibold text-tx-1">{title}</h2>
        </div>
        <span className="well num rounded-full px-2.5 py-0.5 text-[10.5px] text-tx-2">
          {hits.length}
        </span>
      </div>
      <div className="space-y-2">
        {hits.length ? (
          hits.map((h, i) => (
            <div key={i} className="well rounded-xl p-3.5">
              <div className="mb-1.5 flex flex-wrap items-center gap-2">
                {render?.(h)}
                <span className="num ml-auto text-[10px] text-tx-3">
                  {new Date(h.created_at).toLocaleDateString("id-ID")}
                </span>
              </div>
              <p className="whitespace-pre-wrap text-[12.5px] leading-relaxed text-tx-2">
                {h.preview}
              </p>
            </div>
          ))
        ) : (
          <p className="py-4 text-center text-xs text-tx-3">Tidak ada hasil.</p>
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
      <main className="flex-1 overflow-y-auto px-6 py-8 lg:px-10">
        <header className="mb-6">
          <h1 className="text-[25px] font-semibold tracking-[-0.025em] text-tx-1">Cari</h1>
          <p className="mt-1 text-sm text-tx-3">
            Pencarian teks lintas korpus, inbox, dan observasi
          </p>
        </header>

        <div className="mb-7 flex gap-3">
          <div className="well flex flex-1 items-center gap-3 rounded-2xl px-5 py-3.5">
            <Search className="size-[18px] shrink-0 text-tx-3" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              placeholder="Tulis kata kunci lalu tekan Enter…"
              className="w-full bg-transparent text-[15px] text-tx-1 outline-none placeholder:text-tx-3"
              autoFocus
            />
          </div>
          <button
            onClick={handleSearch}
            disabled={loading}
            className="raised-2 rounded-2xl px-7 text-sm font-medium text-tx-1 disabled:opacity-50"
          >
            {loading ? <Loader2 className="size-4 animate-spin" /> : "Cari"}
          </button>
        </div>

        {results ? (
          <>
            <p className="mb-4 text-[12.5px] text-tx-3">
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
                      <span className={cn("num rounded-full px-2 py-0.5 text-[10px]", KIND_CLASS[h.kind])}>
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
                      <span className="num rounded-full bg-idle-tint px-2 py-0.5 text-[10px] text-tx-2">
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
          <Panel className="flex flex-col items-center gap-3 p-14 text-center">
            <Search className="size-9 text-tx-3 opacity-40" />
            <p className="text-sm text-tx-3">Ketik kata kunci lalu tekan Enter.</p>
          </Panel>
        )}
      </main>
    </div>
    </Guard>
  );
}
