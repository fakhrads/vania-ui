"use client";

import dynamic from "next/dynamic";
import { useMemo, useRef, useState, useCallback, useEffect } from "react";
import { Sidebar } from "@/components/sidebar";
import { Guard } from "@/components/guard";
import { Panel, Pill, StatusDot, useLive, type Tone } from "@/components/monitor";
import { useTheme } from "@/lib/theme";
import { Lock, Globe, RefreshCw, Search, Flame, X, Focus, Link2 } from "lucide-react";
import { cn } from "@/lib/utils";

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

const KIND_LABEL: Record<string, string> = {
  seed: "fakta inti", active: "aktif", evicted: "pernah aktif", archive: "arsip",
};

/**
 * Palet canvas — dua set nilai harfiah, bukan CSS variable.
 *
 * Graph digambar ke <canvas> lewat ctx.fillStyle/strokeStyle, dan canvas
 * tidak bisa membaca custom property. Jadi setiap warna di sini harus
 * ditulis dua kali dan dipilih di runtime lewat tema aktif; kalau tidak,
 * graph jadi tak terbaca begitu pengguna pindah ke tema terang.
 */
type CanvasPalette = {
  kind: Record<string, string>;
  entity: string;
  fallback: string;
  linkIdle: string;
  linkOn: string;
  linkOff: string;
  label: string;
  labelEntity: string;
  labelBg: string;
  focusRing: string;
};

const CANVAS: Record<"dark" | "light", CanvasPalette> = {
  dark: {
    kind: { seed: "#5aa9f8", active: "#3ad39b", evicted: "#f0b74a", archive: "#8b8f9c" },
    entity: "#b98cf5",
    fallback: "#8b8f9c",
    linkIdle: "rgba(255,255,255,0.10)",
    linkOn: "rgba(255,255,255,0.85)",
    linkOff: "rgba(255,255,255,0.03)",
    label: "#dfe2ea",
    labelEntity: "#e9d5ff",
    labelBg: "rgba(18,20,26,0.78)",
    focusRing: "#ffffff",
  },
  light: {
    kind: { seed: "#1f6fd0", active: "#16855c", evicted: "#a86a06", archive: "#6b7080" },
    entity: "#7b3fd4",
    fallback: "#6b7080",
    linkIdle: "rgba(20,24,40,0.14)",
    linkOn: "rgba(20,24,40,0.75)",
    linkOff: "rgba(20,24,40,0.04)",
    label: "#2a2f3d",
    labelEntity: "#4a1f8f",
    labelBg: "rgba(255,255,255,0.86)",
    focusRing: "#14182a",
  },
};

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
  const { isDark } = useTheme();
  const C = isDark ? CANVAS.dark : CANVAS.light;
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
  // Posisi node dipersist ke localStorage, per browser — jadi begitu
  // halaman dibuka ulang (bukan cuma poll di sesi yang sama), node yang
  // udah pernah keliatan sebelumnya langsung nongol di posisi lamanya,
  // dibekukan dari frame pertama. Cuma node yang BENERAN belum pernah
  // keliatan sama sekali di browser ini yang lepas dan animasi ketarik.
  // v2: jarak antar-node dilonggarin — cache v1 nyimpen posisi lama yang
  // masih dempet, bump versi biar dibuang dan semua re-layout pake force
  // yang baru sekali ini aja (abis itu ke-cache lagi dan gak akan reset).
  const POSITION_CACHE_KEY = "vania-graph-positions-v2";
  const positionCacheRef = useRef<Record<string, { x: number; y: number }> | null>(null);
  const getPositionCache = () => {
    if (positionCacheRef.current) return positionCacheRef.current;
    let cache: Record<string, { x: number; y: number }> = {};
    try {
      const raw = localStorage.getItem(POSITION_CACHE_KEY);
      if (raw) cache = JSON.parse(raw);
    } catch {
      // private mode / storage disabled -> mulai kosong, gak fatal
    }
    positionCacheRef.current = cache;
    return cache;
  };
  const persistNodePosition = (id: string, x: number, y: number) => {
    const cache = getPositionCache();
    cache[id] = { x, y };
    try {
      localStorage.setItem(POSITION_CACHE_KEY, JSON.stringify(cache));
    } catch {
      // storage penuh/disabled -> gapapa, posisi tetep kepakai di sesi ini
    }
  };

  const [graphData, setGraphData] = useState<{ nodes: any[]; links: any[] }>({ nodes: [], links: [] });
  useEffect(() => {
    if (!data) return;
    setGraphData((prev) => {
      const prevById = new Map(prev.nodes.map((n) => [n.id, n]));
      const cache = getPositionCache();
      for (const n of prev.nodes) {
        if (typeof n.x === "number" && typeof n.fx !== "number") {
          n.fx = n.x;
          n.fy = n.y;
        }
      }
      const nextNodes = data.nodes.map((incoming) => {
        const existing = prevById.get(incoming.id);
        if (existing) {
          Object.assign(existing, incoming); // refresh metadata, x/y/fx/fy untouched (absent dari incoming)
          return existing;
        }
        const remembered = cache[incoming.id];
        if (remembered) {
          // Udah pernah keliatan di browser ini sebelumnya (sesi lama/reload)
          // -> langsung taruh di posisi lama, dibekukan, TANPA animasi.
          return { ...incoming, x: remembered.x, y: remembered.y, fx: remembered.x, fy: remembered.y };
        }
        return incoming; // beneran baru pertama kali -> lepas, ketarik fisika
      });

      const nextCache: Record<string, { x: number; y: number }> = { ...cache };
      for (const n of nextNodes) {
        if (typeof n.fx === "number") nextCache[n.id] = { x: n.fx, y: n.fy };
      }
      positionCacheRef.current = nextCache;
      try {
        localStorage.setItem(POSITION_CACHE_KEY, JSON.stringify(nextCache));
      } catch {
        // storage penuh/disabled -> posisi tetap kepakai di sesi ini, cuma gak persist
      }

      const nextLinks = data.links.map((l) => ({ ...l })); // link gak punya posisi sendiri, aman dibuat ulang
      return { nodes: nextNodes, links: nextLinks };
    });
  }, [data]);

  // Jarak antar-node — default d3-force nge-dempetin banget buat ~300 node.
  // Set sekali aja begitu simulasi pertama kali ada datanya; ubah param
  // gaya TIDAK memicu re-layout paksa (node yang udah beku tetep beku).
  const forcesConfigured = useRef(false);
  useEffect(() => {
    if (!data || !fgRef.current || forcesConfigured.current) return;
    const charge = fgRef.current.d3Force("charge");
    if (charge?.strength) {
      charge.strength(-320);
      charge.distanceMax?.(800);
    }
    const link = fgRef.current.d3Force("link");
    if (link?.distance) link.distance(140);
    forcesConfigured.current = true;
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

  // Tetangga langsung dari node terpilih — dasar buat mode "graf lokal"
  // (ala local graph Obsidian). Beda dari `highlight`: itu ngikutin hover
  // (buat sorot cepat), ini murni ngikutin selection (buat mode isolate
  // yang gak boleh kedip-kedip ikut mouse lewat).
  const neighborhood = useMemo(() => {
    if (!selected) return null;
    const nodeIds = new Set<string>([selected.id]);
    const links: any[] = [];
    for (const l of graphData.links) {
      const s = typeof l.source === "object" ? (l.source as any).id : l.source;
      const t = typeof l.target === "object" ? (l.target as any).id : l.target;
      if (s === selected.id || t === selected.id) {
        nodeIds.add(s); nodeIds.add(t);
        links.push(l);
      }
    }
    return { nodes: graphData.nodes.filter((n) => nodeIds.has(n.id)), links };
  }, [selected, graphData]);

  const [isolate, setIsolate] = useState(false);
  const visibleGraph = isolate && neighborhood ? neighborhood : graphData;
  useEffect(() => {
    if (isolate && neighborhood) {
      const t = setTimeout(() => fgRef.current?.zoomToFit(400, 90), 60);
      return () => clearTimeout(t);
    }
  }, [isolate, selected]);

  // "Terkait" ala backlinks Obsidian — entri LAIN yang nyebut entitas yang
  // sama dengan entri terpilih (2-hop lewat entitas bareng), diranking dari
  // berapa banyak entitas yang mereka bagi.
  const relatedEntries = useMemo(() => {
    if (!selected || selected.type !== "entry") return [];
    const counts = new Map<string, number>();
    for (const ent of selectedEntities) {
      for (const e of (ent as any).entries ?? []) {
        if (e.id === selected.id) continue;
        counts.set(e.id, (counts.get(e.id) ?? 0) + 1);
      }
    }
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([id, n]) => ({ node: graphData.nodes.find((x) => x.id === id), n }))
      .filter((x): x is { node: Node; n: number } => !!x.node);
  }, [selected, selectedEntities, graphData]);

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

  // Simulasi berhenti setelah cooldown, jadi canvas tidak menggambar ulang
  // dengan sendirinya. Tanpa ini pindah tema tidak mengubah apa pun di
  // canvas sampai ada interaksi berikutnya.
  useEffect(() => {
    fgRef.current?.refresh?.();
  }, [isDark]);

  const tone: Tone = !data ? "idle" : err ? "bad" : "ok";

  return (
    <Guard>
      <div className="flex min-h-screen flex-col lg:flex-row">
        <Sidebar />

        <main className="flex-1 overflow-hidden px-6 py-8 lg:px-10">
          <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h1 className="text-[25px] font-semibold tracking-[-0.025em] text-tx-1">
                Graph Memori
              </h1>
              <p className="mt-1 text-sm text-tx-3">
                Entri &amp; entitas — sama persis dengan vault Obsidian, langsung dari{" "}
                <span className="num text-tx-2">vania_ltm</span>
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
                className="raised rounded-full px-3 py-1 text-[11px] font-medium text-tx-2 transition-colors hover:text-tx-1"
              >
                {showArchive ? "sembunyikan arsip" : "tampilkan arsip"}
              </button>
              <button
                onClick={() => refresh()}
                className="raised flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-medium text-tx-2 transition-colors hover:text-tx-1"
              >
                <RefreshCw className="size-3" /> muat ulang
              </button>
            </div>
          </header>

          <div className="grid h-[calc(100vh-11rem)] gap-4 lg:grid-cols-[1fr_340px]">
            <Panel className="well relative overflow-hidden border border-line p-0">

              {/* Kotak cari — lompat ke node tertentu tanpa scroll manual */}
              <div className="absolute left-4 top-4 z-20 w-64">
                <div className="panel flex items-center gap-2 rounded-xl px-3 py-2">
                  <Search className="size-3.5 shrink-0 text-tx-3" />
                  <input
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="cari entri atau entitas…"
                    className="w-full bg-transparent text-xs text-tx-1 placeholder:text-tx-3 focus:outline-none"
                  />
                </div>
                {suggestions.length > 0 && (
                  <div className="overlay mt-1.5 max-h-72 overflow-y-auto rounded-xl p-1.5">
                    {suggestions.map((n) => (
                      <button
                        key={n.id}
                        onClick={() => focusNode(n)}
                        className="flex w-full items-start gap-2 rounded-xl px-2.5 py-2 text-left text-xs text-tx-2 hover:bg-sunken"
                      >
                        <span
                          className="mt-1 size-1.5 shrink-0 rounded-full"
                          style={{ background: n.type === "entity" ? C.entity : (C.kind[n.kind ?? ""] ?? C.fallback) }}
                        />
                        <span className="line-clamp-2">{n.content ?? n.label}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {err && (
                <div className="absolute inset-0 z-10 flex items-center justify-center text-sm text-bad">
                  gagal memuat — {err}
                </div>
              )}
              {!data && !err && (
                <div className="absolute inset-0 z-10 flex items-center justify-center text-sm text-tx-3">
                  memuat graph…
                </div>
              )}
              {data && (
                <ForceGraph2D
                  ref={fgRef}
                  graphData={visibleGraph}
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
                  onNodeDrag={() => {
                    // Simulasi bisa udah "tidur" abis settle awal (cooldownTicks
                    // kepake abis) -- tanpa reheat, node yang ditarik gak
                    // kegambar ikut gerak sama sekali. Aman dipanggil berkali-
                    // kali selama drag, cuma nyalain ulang alpha.
                    fgRef.current?.d3ReheatSimulation();
                  }}
                  onNodeDragEnd={(n: any) => {
                    // Dikunci persis di titik taruh -- gak lompat balik ke
                    // posisi lama, dan langsung ke-persist biar reload
                    // berikutnya inget posisi manual ini juga.
                    n.fx = n.x;
                    n.fy = n.y;
                    persistNodePosition(n.id, n.x, n.y);
                  }}
                  linkDirectionalParticles={2}
                  linkDirectionalParticleWidth={(l: any) => (highlight.links.has(l) ? 2.6 : 1)}
                  linkDirectionalParticleSpeed={0.004}
                  linkDirectionalParticleColor={(l: any) => {
                    const t = typeof l.target === "object" ? l.target : null;
                    return t?.type === "entity" ? C.entity : C.fallback;
                  }}
                  linkColor={(l: any) =>
                    highlight.links.size
                      ? highlight.links.has(l) ? C.linkOn : C.linkOff
                      : C.linkIdle
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
                    const color = isEntity ? C.entity : (C.kind[node.kind] ?? C.fallback);

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
                      ctx.strokeStyle = C.focusRing;
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
                      ctx.fillStyle = C.labelBg;
                      ctx.fillRect(node.x - tw / 2 - pad, ty - fontSize * 0.8, tw + pad * 2, fontSize * 1.3);
                      ctx.fillStyle = isEntity ? C.labelEntity : C.label;
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
                  className="overlay pointer-events-auto absolute left-0 top-0 z-30 w-72 rounded-2xl p-4"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span
                        className="size-2.5 shrink-0 rounded-full"
                        style={{ background: popupNode.type === "entity" ? C.entity : (C.kind[popupNode.kind ?? ""] ?? C.fallback) }}
                      />
                      <span className="text-xs font-medium text-tx-1">
                        {popupNode.type === "entity" ? "Entitas" : KIND_LABEL[popupNode.kind ?? ""] ?? "Entri"}
                      </span>
                    </div>
                    <button
                      onClick={() => setPopupNode(null)}
                      className="text-tx-3 hover:text-tx-1"
                    >
                      <X className="size-3.5" />
                    </button>
                  </div>
                  <p className="mt-2 line-clamp-5 text-xs leading-relaxed text-tx-2">
                    {popupNode.type === "entity"
                      ? `${popupNode.label} — disebut di ${degree.get(popupNode.id) ?? 0} entri`
                      : popupNode.content}
                  </p>
                  <p className="mt-2 text-[10px] text-tx-3">
                    {highlight.links.size} garis tersorot ke node terhubung — detail lengkap di panel kanan
                  </p>
                </div>
              )}
            </Panel>

            <div className="space-y-4 overflow-y-auto">
              <Panel className="p-5">
                <h2 className="mb-3 text-sm font-medium text-tx-2">Legenda</h2>
                <div className="space-y-2 text-xs">
                  {Object.entries(C.kind).map(([k, c]) => (
                    <div key={k} className="flex items-center gap-2 text-tx-2">
                      <span className="size-2.5 rounded-full" style={{ background: c }} />
                      {KIND_LABEL[k]}
                    </div>
                  ))}
                  <div className="flex items-center gap-2 text-tx-2">
                    <span className="size-2.5 rounded-full" style={{ background: C.entity }} />
                    entitas (ukuran = jumlah tautan)
                  </div>
                </div>
                <p className="mt-3 border-t border-line-soft pt-2 text-[10px] leading-relaxed text-tx-3">
                  Bulatan entri membesar mengikuti panjang isinya — konteks
                  lebih tebal, bulatan lebih besar.
                </p>
              </Panel>

              <Panel className="p-5">
                <h2 className="mb-3 flex items-center gap-1.5 text-sm font-medium text-tx-2">
                  <Flame className="size-3.5 text-warn" /> Entitas tersibuk
                </h2>
                <div className="space-y-1.5">
                  {topEntities.map(({ node, n }) => (
                    <button
                      key={node.id}
                      onClick={() => focusNode(node)}
                      className="flex w-full items-center justify-between rounded-xl px-2.5 py-1.5 text-left text-xs text-tx-2 transition-colors hover:bg-sunken"
                    >
                      <span className="truncate">{node.label}</span>
                      <span className="num shrink-0 text-tx-3">{n}</span>
                    </button>
                  ))}
                </div>
              </Panel>

              <Panel className="p-5">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <h2 className="text-sm font-medium text-tx-2">
                    {selected ? (selected.type === "entity" ? "Entitas" : "Entri") : "Klik sebuah node"}
                  </h2>
                  {selected && (
                    <button
                      onClick={() => setIsolate((v) => !v)}
                      className={cn(
                        "flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors",
                        isolate
                          ? "bg-accent-tint text-accent-solid"
                          : "raised text-tx-2 hover:text-tx-1"
                      )}
                    >
                      <Focus className="size-3" />
                      {isolate ? "Graf penuh" : "Graf lokal"}
                    </button>
                  )}
                </div>
                {selected ? (
                  <div className="space-y-3 text-sm">
                    {selected.type === "entity" ? (
                      <>
                        <div className="flex items-center gap-2">
                          <span className="size-2.5 rounded-full" style={{ background: C.entity }} />
                          <p className="font-medium text-tx-1">{selected.label}</p>
                        </div>
                        <p className="text-xs text-tx-3">
                          disebut di {degree.get(selected.id) ?? 0} entri
                        </p>
                        <div className="max-h-64 space-y-1 overflow-y-auto border-t border-line-soft pt-2">
                          {(selected.entries ?? []).map((e) => (
                            <button
                              key={e.id}
                              onClick={() => {
                                const n = graphData.nodes.find((x) => x.id === e.id);
                                if (n) focusNode(n);
                              }}
                              className="block w-full rounded-xl px-2 py-1.5 text-left text-xs text-tx-2 transition-colors hover:bg-sunken hover:text-tx-1"
                            >
                              {e.label}
                            </button>
                          ))}
                        </div>
                      </>
                    ) : (
                      <>
                        <p className="leading-relaxed text-tx-2">{selected.content}</p>
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
                        <div className="grid grid-cols-2 gap-2 border-t border-line-soft pt-2 text-[11px] text-tx-3">
                          <div>dibuat<div className="text-tx-2">{fmtDate(selected.createdAt)}</div></div>
                          <div>diperbarui<div className="text-tx-2">{fmtDate(selected.updatedAt)}</div></div>
                        </div>
                        {selectedEntities.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 border-t border-line-soft pt-2">
                            {selectedEntities.map((n) => (
                              <button
                                key={n.id}
                                onClick={() => focusNode(n)}
                                className="rounded-full bg-accent-tint px-2 py-0.5 text-[11px] text-entity transition-opacity hover:opacity-80"
                              >
                                {n.label}
                              </button>
                            ))}
                          </div>
                        )}
                        {relatedEntries.length > 0 && (
                          <div className="border-t border-line-soft pt-2">
                            <h3 className="mb-1.5 flex items-center gap-1.5 text-[11px] uppercase tracking-widest text-tx-3">
                              <Link2 className="size-3" /> Terkait
                            </h3>
                            <div className="space-y-1">
                              {relatedEntries.map(({ node, n }) => (
                                <button
                                  key={node.id}
                                  onClick={() => focusNode(node)}
                                  className="flex w-full items-start gap-2 rounded-xl px-2 py-1.5 text-left text-xs text-tx-2 transition-colors hover:bg-sunken hover:text-tx-1"
                                >
                                  <span className="line-clamp-2 flex-1">{node.label}</span>
                                  <span className="num shrink-0 text-tx-3">{n} bareng</span>
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-tx-3">
                    Detail entri atau entitas muncul di sini.
                  </p>
                )}
              </Panel>

              <p className="px-1 text-[11px] leading-relaxed text-tx-3">
                Tarik untuk geser node, scroll untuk zoom. Klik sebuah node
                buat buka popup ringkas &amp; menyalakan semua garis yang
                terhubung ke dia — klik area kosong buat matiin.
                &quot;Graf lokal&quot; mengisolasi cuma node terpilih +
                tetangga langsungnya, ala local graph Obsidian. Warna node
                entri mengikuti tier; ungu = entitas tetap.
              </p>
            </div>
          </div>
        </main>
      </div>
    </Guard>
  );
}
