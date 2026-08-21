"use client";

import dynamic from "next/dynamic";
import { useMemo, useRef, useState, useCallback, useEffect } from "react";
import { Sidebar } from "@/components/sidebar";
import { Guard } from "@/components/guard";
import { Glass, Pill, StatusDot, useLive, type Tone } from "@/components/monitor";
import { Lock, Globe, RefreshCw, Search, Flame, X } from "lucide-react";

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
  createdAt?: string;
  updatedAt?: string;
  entries?: { id: string; label: string }[];
  x?: number; y?: number;
};
type Link = { source: string; target: string };
type Graph = { nodes: Node[]; links: Link[]; stats: { entries: number; entities: number; edges: number } };

const KIND_COLOR: Record<string, string> = {
  seed: "#38bdf8", active: "#34d399", evicted: "#fbbf24", archive: "#71717a",
};
const KIND_LABEL: Record<string, string> = {
  seed: "fakta inti", active: "aktif", evicted: "pernah aktif", archive: "arsip",
};
const ENTITY_COLOR = "#a78bfa";

function fmtDate(iso?: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
}

/** Jari-jari node: entitas membesar mengikuti derajat (hub); entri
 * membesar mengikuti PANJANG isinya (konteks lebih tebal → bulatan lebih
 * besar) plus sedikit dari derajat, supaya dua sinyal itu kelihatan sama-
 * sama tanpa satu menenggelamkan yang lain. Dipakai sama persis di render
 * dan di area klik (nodePointerAreaPaint) — kalau beda, klik meleset. */
function nodeRadius(node: any, deg: number) {
  if (node.type === "entity") {
    return 4.5 + Math.min(9, Math.sqrt(deg) * 1.9);
  }
  const len = node.content?.length ?? 0;
  return 2 + Math.min(3.4, Math.sqrt(len) * 0.2) + Math.min(1.4, Math.sqrt(deg) * 0.45);
}

export default function GraphPage() {
  const [showArchive, setShowArchive] = useState(false);
  const { data, err, refresh } = useLive<Graph>(
    `/api/graph${showArchive ? "?all=1" : ""}`, 60000
  );
  const [selected, setSelected] = useState<Node | null>(null);
  const [hoverNode, setHoverNode] = useState<Node | null>(null);
  const [q, setQ] = useState("");
  const fgRef = useRef<any>(null);
  const didInitialFit = useRef(false);

  // Graph incremental, bukan rebuild total tiap poll. Node yang udah ada
  // di-BEKUKAN (fx/fy = posisi sekarang) begitu data baru datang, jadi dia
  // gak akan pernah kegeser lagi walau simulasi fisika jalan lagi buat
  // node baru. Node yang genuinely baru dibiarin lepas (gak di-fx/fy) —
  // itu yang bikin dia keliatan "ketarik" ke node yang dia sambungin,
  // karena link-force fisika narik dia ke posisi seharusnya relatif ke
  // tetangga yang udah beku. Identitas objek node LAMA dipertahankan
  // (bukan literal baru) karena force-graph nyimpen x/y/vx/vy langsung di
  // objek itu — ganti objek = fisika mulai dari nol lagi buat node itu.
  const [graphData, setGraphData] = useState<{ nodes: any[]; links: any[] }>({ nodes: [], links: [] });
  useEffect(() => {
    if (!data) return;
    setGraphData((prev) => {
      const prevById = new Map(prev.nodes.map((n) => [n.id, n]));
      for (const n of prev.nodes) {
        if (typeof n.x === "number" && typeof n.fx !== "number") {
          n.fx = n.x;
          n.fy = n.y;
        }
      }
      const nextNodes = data.nodes.map((incoming) => {
        const existing = prevById.get(incoming.id);
        if (existing) {
          Object.assign(existing, incoming); // refresh metadata, x/y/fx/fy untouched (absent from incoming)
          return existing;
        }
        return incoming; // beneran baru -> lepas, biar ketarik fisika ke tetangganya
      });
      const nextLinks = data.links.map((l) => ({ ...l })); // link gak punya posisi sendiri, aman dibuat ulang
      return { nodes: nextNodes, links: nextLinks };
    });
  }, [data]);

  const degree = useMemo(() => {
    const m = new Map<string, number>();
    for (const l of graphData.links) {
      const s = typeof l.source === "object" ? (l.source as any).id : l.source;
      const t = typeof l.target === "object" ? (l.target as any).id : l.target;
      m.set(s, (m.get(s) ?? 0) + 1);
      m.set(t, (m.get(t) ?? 0) + 1);
    }
    return m;
  }, [graphData]);

  const topEntities = useMemo(() => {
    return graphData.nodes
      .filter((n) => n.type === "entity")
      .map((n) => ({ node: n, n: degree.get(n.id) ?? 0 }))
      .sort((a, b) => b.n - a.n)
      .slice(0, 8);
  }, [graphData, degree]);

  const anchor = hoverNode ?? selected;
  const highlight = useMemo(() => {
    const nodes = new Set<string>();
    const links = new Set<any>();
    if (anchor) {
      nodes.add(anchor.id);
      for (const l of graphData.links) {
        const s = typeof l.source === "object" ? (l.source as any).id : l.source;
        const t = typeof l.target === "object" ? (l.target as any).id : l.target;
        if (s === anchor.id || t === anchor.id) {
          nodes.add(s); nodes.add(t); links.add(l);
        }
      }
    }
    return { nodes, links };
  }, [anchor, graphData]);

  const selectedEntities = useMemo(() => {
    if (!selected || selected.type !== "entry") return [];
    const ids = new Set<string>();
    for (const l of graphData.links) {
      const s = typeof l.source === "object" ? (l.source as any).id : l.source;
      const t = typeof l.target === "object" ? (l.target as any).id : l.target;
      if (s === selected.id) ids.add(t);
    }
    return graphData.nodes.filter((n) => ids.has(n.id));
  }, [selected, graphData]);

  const suggestions = useMemo(() => {
    if (q.trim().length < 2) return [];
    const needle = q.toLowerCase();
    return graphData.nodes
      .filter((n) => (n.content ?? n.label).toLowerCase().includes(needle))
      .slice(0, 8);
  }, [q, graphData]);

  const focusNode = useCallback((n: Node) => {
    setSelected(n);
    setPopupNode(n);
    setQ("");
    const live = graphData.nodes.find((x) => x.id === n.id) as any;
    if (live && Number.isFinite(live.x) && fgRef.current) {
      fgRef.current.centerAt(live.x, live.y, 700);
      fgRef.current.zoom(5, 700);
    }
  }, [graphData]);

  // Popup ngambang di posisi node di layar — dilacak tiap frame karena
  // node tetap bisa bergerak (fisika/pan/zoom) selagi popup terbuka.
  const [popupNode, setPopupNode] = useState<Node | null>(null);
  const popupRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!popupNode) return;
    let raf: number;
    const tick = () => {
      const live = graphData.nodes.find((n) => n.id === popupNode.id) as any;
      if (live && fgRef.current && popupRef.current && Number.isFinite(live.x)) {
        const { x, y } = fgRef.current.graph2ScreenCoords(live.x, live.y);
        // translate ke titik node dulu, baru geser -50% lebar sendiri buat
        // center horizontal + turun 18px biar gak nutupin bulatannya.
        popupRef.current.style.transform = `translate(${x}px, ${y}px) translate(-50%, 18px)`;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [popupNode, graphData]);

  const tone: Tone = !data ? "idle" : err ? "bad" : "ok";

  return (
    <Guard>
      <div className="flex flex-col min-h-screen lg:flex-row">
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

          <div className="grid h-[calc(100vh-11rem)] gap-4 lg:grid-cols-[1fr_340px]">
            <Glass className="relative overflow-hidden p-0">
              <div className="graph-dots" />

              {/* Kotak cari — lompat ke node tertentu tanpa scroll manual */}
              <div className="absolute left-4 top-4 z-20 w-64">
                <div className="glass flex items-center gap-2 rounded-2xl px-3 py-2">
                  <Search className="size-3.5 shrink-0 text-zinc-500" />
                  <input
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="cari entri atau entitas…"
                    className="w-full bg-transparent text-xs text-zinc-200 placeholder:text-zinc-600 focus:outline-none"
                  />
                </div>
                {suggestions.length > 0 && (
                  <div className="glass mt-1.5 max-h-72 overflow-y-auto rounded-2xl p-1.5">
                    {suggestions.map((n) => (
                      <button
                        key={n.id}
                        onClick={() => focusNode(n)}
                        className="flex w-full items-start gap-2 rounded-xl px-2.5 py-2 text-left text-xs text-zinc-300 hover:bg-white/[0.06]"
                      >
                        <span
                          className="mt-1 size-1.5 shrink-0 rounded-full"
                          style={{ background: n.type === "entity" ? ENTITY_COLOR : (KIND_COLOR[n.kind ?? ""] ?? "#71717a") }}
                        />
                        <span className="line-clamp-2">{n.content ?? n.label}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

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
                  cooldownTicks={80}
                  onEngineStop={() => {
                    if (!didInitialFit.current) {
                      didInitialFit.current = true;
                      fgRef.current?.zoomToFit(600, 60);
                    }
                  }}
                  onNodeHover={(n: any) => setHoverNode(n)}
                  onNodeClick={(n: any) => focusNode(n)}
                  onBackgroundClick={() => { setSelected(null); setPopupNode(null); }}
                  linkDirectionalParticles={2}
                  linkDirectionalParticleWidth={(l: any) => (highlight.links.has(l) ? 2.6 : 1)}
                  linkDirectionalParticleSpeed={0.004}
                  linkDirectionalParticleColor={(l: any) => {
                    const t = typeof l.target === "object" ? l.target : null;
                    return t?.type === "entity" ? ENTITY_COLOR : "#71717a";
                  }}
                  linkColor={(l: any) =>
                    highlight.links.size
                      ? highlight.links.has(l) ? "rgba(255,255,255,0.9)" : "rgba(255,255,255,0.03)"
                      : "rgba(255,255,255,0.12)"
                  }
                  linkWidth={(l: any) => (highlight.links.has(l) ? 2.4 : 1)}
                  nodeCanvasObject={(node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
                    // Frame pertama sebelum simulasi jalan, x/y masih
                    // undefined/NaN — createRadialGradient/arc lempar
                    // TypeError kalau dikasih itu. Lewati saja, muncul di
                    // frame berikutnya begitu posisinya kebentuk.
                    if (!Number.isFinite(node.x) || !Number.isFinite(node.y)) return;
                    const isEntity = node.type === "entity";
                    const deg = degree.get(node.id) ?? 0;
                    const r = nodeRadius(node, deg);
                    const dimmed = highlight.nodes.size > 0 && !highlight.nodes.has(node.id);
                    const isFocus = anchor?.id === node.id;
                    const color = isEntity ? ENTITY_COLOR : (KIND_COLOR[node.kind] ?? "#71717a");

                    ctx.save();
                    ctx.globalAlpha = dimmed ? 0.12 : 1;

                    if (isEntity) {
                      const grad = ctx.createRadialGradient(node.x, node.y, 0, node.x, node.y, r * 2.4);
                      grad.addColorStop(0, color + "40");
                      grad.addColorStop(1, "transparent");
                      ctx.fillStyle = grad;
                      ctx.beginPath();
                      ctx.arc(node.x, node.y, r * 2.4, 0, 2 * Math.PI);
                      ctx.fill();
                    }

                    ctx.beginPath();
                    ctx.arc(node.x, node.y, r, 0, 2 * Math.PI);
                    ctx.fillStyle = color;
                    ctx.fill();
                    if (isFocus) {
                      ctx.lineWidth = 1.8;
                      ctx.strokeStyle = "#fff";
                      ctx.stroke();
                    }

                    const showLabel = isEntity || isFocus;
                    if (showLabel && !dimmed) {
                      const fontSize = Math.max(3, (isEntity ? 12 : 11) / globalScale);
                      ctx.font = `${isEntity ? "600" : "500"} ${fontSize}px ui-sans-serif, system-ui`;
                      const text = isEntity ? node.label : node.label;
                      const tw = ctx.measureText(text).width;
                      const pad = fontSize * 0.35;
                      const ty = node.y + r + fontSize * 0.9;
                      ctx.fillStyle = "rgba(8,8,11,0.72)";
                      ctx.fillRect(node.x - tw / 2 - pad, ty - fontSize * 0.8, tw + pad * 2, fontSize * 1.3);
                      ctx.fillStyle = isEntity ? "#e9d5ff" : "#e4e4e7";
                      ctx.textAlign = "center";
                      ctx.fillText(text, node.x, ty - fontSize * 0.15);
                    }
                    ctx.restore();
                  }}
                  nodePointerAreaPaint={(node: any, color: string, ctx: CanvasRenderingContext2D) => {
                    if (!Number.isFinite(node.x) || !Number.isFinite(node.y)) return;
                    const deg = degree.get(node.id) ?? 0;
                    const r = nodeRadius(node, deg) + 3;
                    ctx.fillStyle = color;
                    ctx.beginPath();
                    ctx.arc(node.x, node.y, r, 0, 2 * Math.PI);
                    ctx.fill();
                  }}
                />
              )}

              {/* Popup ngambang di posisi node — muncul begitu diklik, ikut
                  gerak node saat fisika/pan/zoom jalan (lihat efek di atas). */}
              {popupNode && (
                <div
                  ref={popupRef}
                  className="glass pointer-events-auto absolute left-0 top-0 z-30 w-72 rounded-2xl p-4"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span
                        className="size-2.5 shrink-0 rounded-full"
                        style={{ background: popupNode.type === "entity" ? ENTITY_COLOR : (KIND_COLOR[popupNode.kind ?? ""] ?? "#71717a") }}
                      />
                      <span className="text-xs font-medium text-zinc-200">
                        {popupNode.type === "entity" ? "Entitas" : KIND_LABEL[popupNode.kind ?? ""] ?? "Entri"}
                      </span>
                    </div>
                    <button
                      onClick={() => setPopupNode(null)}
                      className="text-zinc-500 hover:text-zinc-200"
                    >
                      <X className="size-3.5" />
                    </button>
                  </div>
                  <p className="mt-2 line-clamp-5 text-xs leading-relaxed text-zinc-300">
                    {popupNode.type === "entity"
                      ? `${popupNode.label} — disebut di ${degree.get(popupNode.id) ?? 0} entri`
                      : popupNode.content}
                  </p>
                  <p className="mt-2 text-[10px] text-zinc-600">
                    {highlight.links.size} garis tersorot ke node terhubung — detail lengkap di panel kanan
                  </p>
                </div>
              )}
            </Glass>

            <div className="space-y-4 overflow-y-auto">
              <Glass className="p-5">
                <h2 className="mb-3 text-sm font-medium text-zinc-300">Legenda</h2>
                <div className="space-y-2 text-xs">
                  {Object.entries(KIND_COLOR).map(([k, c]) => (
                    <div key={k} className="flex items-center gap-2 text-zinc-400">
                      <span className="size-2.5 rounded-full" style={{ background: c }} />
                      {KIND_LABEL[k]}
                    </div>
                  ))}
                  <div className="flex items-center gap-2 text-zinc-400">
                    <span className="size-2.5 rounded-full" style={{ background: ENTITY_COLOR }} />
                    entitas (ukuran = jumlah tautan)
                  </div>
                </div>
                <p className="mt-3 border-t border-white/[0.07] pt-2 text-[10px] leading-relaxed text-zinc-600">
                  Bulatan entri membesar mengikuti panjang isinya — konteks
                  lebih tebal, bulatan lebih besar.
                </p>
              </Glass>

              <Glass className="p-5">
                <h2 className="mb-3 flex items-center gap-1.5 text-sm font-medium text-zinc-300">
                  <Flame className="size-3.5 text-amber-400" /> Entitas tersibuk
                </h2>
                <div className="space-y-1.5">
                  {topEntities.map(({ node, n }) => (
                    <button
                      key={node.id}
                      onClick={() => focusNode(node)}
                      className="flex w-full items-center justify-between rounded-xl px-2.5 py-1.5 text-left text-xs text-zinc-300 transition-colors hover:bg-white/[0.06]"
                    >
                      <span className="truncate">{node.label}</span>
                      <span className="num shrink-0 text-zinc-500">{n}</span>
                    </button>
                  ))}
                </div>
              </Glass>

              <Glass className="p-5">
                <h2 className="mb-3 text-sm font-medium text-zinc-300">
                  {selected ? (selected.type === "entity" ? "Entitas" : "Entri") : "Klik sebuah node"}
                </h2>
                {selected ? (
                  <div className="space-y-3 text-sm">
                    {selected.type === "entity" ? (
                      <>
                        <div className="flex items-center gap-2">
                          <span className="size-2.5 rounded-full" style={{ background: ENTITY_COLOR }} />
                          <p className="font-medium text-zinc-100">{selected.label}</p>
                        </div>
                        <p className="text-xs text-zinc-500">
                          disebut di {degree.get(selected.id) ?? 0} entri
                        </p>
                        <div className="max-h-64 space-y-1 overflow-y-auto border-t border-white/[0.07] pt-2">
                          {(selected.entries ?? []).map((e) => (
                            <button
                              key={e.id}
                              onClick={() => {
                                const n = graphData.nodes.find((x) => x.id === e.id);
                                if (n) focusNode(n);
                              }}
                              className="block w-full rounded-xl px-2 py-1.5 text-left text-xs text-zinc-400 transition-colors hover:bg-white/[0.06] hover:text-zinc-200"
                            >
                              {e.label}
                            </button>
                          ))}
                        </div>
                      </>
                    ) : (
                      <>
                        <p className="leading-relaxed text-zinc-300">{selected.content}</p>
                        <div className="flex flex-wrap gap-1.5">
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
                        <div className="grid grid-cols-2 gap-2 border-t border-white/[0.07] pt-2 text-[11px] text-zinc-500">
                          <div>dibuat<div className="text-zinc-300">{fmtDate(selected.createdAt)}</div></div>
                          <div>diperbarui<div className="text-zinc-300">{fmtDate(selected.updatedAt)}</div></div>
                        </div>
                        {selectedEntities.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 border-t border-white/[0.07] pt-2">
                            {selectedEntities.map((n) => (
                              <button
                                key={n.id}
                                onClick={() => focusNode(n)}
                                className="rounded-full border border-violet-400/25 bg-violet-400/10 px-2 py-0.5 text-[11px] text-violet-300 hover:bg-violet-400/20"
                              >
                                {n.label}
                              </button>
                            ))}
                          </div>
                        )}
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
                Tarik untuk geser node, scroll untuk zoom. Klik sebuah node
                buat buka popup ringkas &amp; menyalakan semua garis yang
                terhubung ke dia — klik area kosong buat matiin. Warna node
                entri mengikuti tier; ungu = entitas tetap.
              </p>
            </div>
          </div>
        </main>
      </div>
    </Guard>
  );
}
