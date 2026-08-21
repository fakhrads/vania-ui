"use client";

import dynamic from "next/dynamic";
import { useMemo, useRef, useState } from "react";
import { Sidebar } from "@/components/sidebar";
import { Guard } from "@/components/guard";
import { Glass, Pill, StatusDot, useLive, type Tone } from "@/components/monitor";
import { Lock, Globe, RefreshCw } from "lucide-react";

// Canvas butuh `window` — matikan SSR, kalau tidak build gagal di server.
const ForceGraph2D = dynamic(() => import("react-force-graph-2d"), { ssr: false });

type Node = {
  id: string;
  type: "entry" | "entity";
  label: string;
  content?: string;
  kind?: string;
  scope?: string;
  audience?: string;
  x?: number; y?: number;
};
type Link = { source: string; target: string };
type Graph = { nodes: Node[]; links: Link[]; stats: { entries: number; entities: number; edges: number } };

const KIND_COLOR: Record<string, string> = {
  seed: "#38bdf8", active: "#34d399", evicted: "#fbbf24", archive: "#71717a",
};
const ENTITY_COLOR = "#a78bfa";

export default function GraphPage() {
  const [showArchive, setShowArchive] = useState(false);
  const { data, err, refresh } = useLive<Graph>(
    `/api/graph${showArchive ? "?all=1" : ""}`, 60000
  );
  const [selected, setSelected] = useState<Node | null>(null);
  const fgRef = useRef<any>(null);

  const graphData = useMemo(
    () => ({
      nodes: data?.nodes ?? [],
      links: (data?.links ?? []).map((l) => ({ ...l })), // force-graph mutates in place
    }),
    [data]
  );

  const tone: Tone = !data ? "idle" : err ? "bad" : "ok";

  return (
    <Guard>
      <div className="flex min-h-screen">
        <div className="mesh-bg" />
        <Sidebar />

        <main className="flex-1 overflow-hidden px-6 py-8 lg:px-10">
          <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-zinc-100">
                Graph Memori
              </h1>
              <p className="mt-1 text-sm text-zinc-500">
                Entri &amp; entitas — sama persis dengan vault Obsidian, langsung dari{" "}
                <span className="font-mono text-zinc-400">vania_ltm</span>
              </p>
            </div>
            <div className="flex items-center gap-3">
              {data && (
                <Pill tone={tone}>
                  <StatusDot tone={tone} live />
                  {data.stats.entries} entri · {data.stats.entities} entitas · {data.stats.edges} tautan
                </Pill>
              )}
              <button
                onClick={() => setShowArchive((s) => !s)}
                className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] font-medium text-zinc-400 transition-colors hover:text-zinc-200"
              >
                {showArchive ? "sembunyikan arsip" : "tampilkan arsip"}
              </button>
              <button
                onClick={() => refresh()}
                className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[11px] font-medium text-zinc-400 transition-colors hover:text-zinc-200"
              >
                <RefreshCw className="size-3" /> muat ulang
              </button>
            </div>
          </header>

          <div className="grid h-[calc(100vh-11rem)] gap-4 lg:grid-cols-[1fr_320px]">
            <Glass className="relative overflow-hidden p-0">
              {err && (
                <div className="absolute inset-0 z-10 flex items-center justify-center text-sm text-rose-300">
                  gagal memuat — {err}
                </div>
              )}
              {!data && !err && (
                <div className="absolute inset-0 z-10 flex items-center justify-center text-sm text-zinc-500">
                  memuat graph…
                </div>
              )}
              {data && (
                <ForceGraph2D
                  ref={fgRef}
                  graphData={graphData}
                  nodeId="id"
                  backgroundColor="rgba(0,0,0,0)"
                  nodeLabel={(n: any) => (n.type === "entity" ? n.label : n.content ?? n.label)}
                  nodeColor={(n: any) =>
                    n.type === "entity" ? ENTITY_COLOR : KIND_COLOR[n.kind] ?? "#71717a"
                  }
                  nodeRelSize={4}
                  nodeVal={(n: any) => (n.type === "entity" ? 3 : 1.4)}
                  linkColor={() => "rgba(255,255,255,0.12)"}
                  linkWidth={1}
                  onNodeClick={(n: any) => setSelected(n)}
                  cooldownTicks={80}
                  width={typeof window !== "undefined" ? undefined : 800}
                />
              )}
            </Glass>

            <div className="space-y-4 overflow-y-auto">
              <Glass className="p-5">
                <h2 className="mb-3 text-sm font-medium text-zinc-300">Legenda</h2>
                <div className="space-y-2 text-xs">
                  {Object.entries(KIND_COLOR).map(([k, c]) => (
                    <div key={k} className="flex items-center gap-2 text-zinc-400">
                      <span className="size-2.5 rounded-full" style={{ background: c }} />
                      {k}
                    </div>
                  ))}
                  <div className="flex items-center gap-2 text-zinc-400">
                    <span className="size-2.5 rounded-full" style={{ background: ENTITY_COLOR }} />
                    entitas
                  </div>
                </div>
              </Glass>

              <Glass className="p-5">
                <h2 className="mb-3 text-sm font-medium text-zinc-300">
                  {selected ? (selected.type === "entity" ? "Entitas" : "Entri") : "Klik sebuah node"}
                </h2>
                {selected ? (
                  <div className="space-y-2 text-sm">
                    {selected.type === "entity" ? (
                      <p className="text-zinc-200">{selected.label}</p>
                    ) : (
                      <>
                        <p className="leading-relaxed text-zinc-300">{selected.content}</p>
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          <Pill tone={selected.kind === "active" ? "ok" : "idle"}>{selected.kind}</Pill>
                          <Pill tone="idle">{selected.scope}</Pill>
                          {selected.audience && (
                            <Pill tone={selected.audience === "private" ? "idle" : "ok"}>
                              {selected.audience === "private" ? (
                                <Lock className="size-3" />
                              ) : (
                                <Globe className="size-3" />
                              )}
                              {selected.audience}
                            </Pill>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-zinc-600">
                    Detail entri atau entitas muncul di sini.
                  </p>
                )}
              </Glass>

              <p className="px-1 text-[11px] leading-relaxed text-zinc-600">
                Tarik untuk geser node, scroll untuk zoom. Warna node entri
                mengikuti tier (seed/active/evicted/archive); ungu = entitas
                tetap (orang, tempat, proyek).
              </p>
            </div>
          </div>
        </main>
      </div>
    </Guard>
  );
}
