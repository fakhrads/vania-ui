"use client";

import dynamic from "next/dynamic";
import { useMemo, useRef, useState, useCallback, useEffect } from "react";
import { Sidebar } from "@/components/sidebar";
import { Guard } from "@/components/guard";
import { Panel, Pill, StatusDot, useLive, type Tone } from "@/components/monitor";
import { useTheme } from "@/lib/theme";
import {
  Lock, Globe, RefreshCw, Search, Flame, X, Focus, Link2, Check, Crosshair, Shuffle,
  Box, Sparkles, Orbit, Compass, Radio
} from "lucide-react";
import * as THREE from "three";
import { cn } from "@/lib/utils";
import { JarvisHandController, type HandGestureState } from "@/components/jarvis-hand-controller";

// Dynamic import with SSR false
const ForceGraph3D = dynamic(() => import("react-force-graph-3d"), { ssr: false });

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
  x?: number; y?: number; z?: number;
  vx?: number; vy?: number; vz?: number;
};
type Link = { source: string | any; target: string | any };
type Graph = { nodes: Node[]; links: Link[]; stats: { entries: number; entities: number; edges: number } };

const KIND_LABEL: Record<string, string> = {
  seed: "fakta inti", active: "aktif", evicted: "pernah aktif", archive: "arsip",
};

const LEGEND_ROWS = [
  { key: "entity", label: "entitas galaxy (core)", note: "bintang pulsar besar" },
  { key: "seed", label: KIND_LABEL.seed, note: "nebula biru terang" },
  { key: "active", label: KIND_LABEL.active, note: "bintang hijau zamrud" },
  { key: "evicted", label: KIND_LABEL.evicted, note: "bintang kuning emas" },
  { key: "archive", label: KIND_LABEL.archive, note: "debu bintang perak" },
] as const;

const GALAXY_COLORS: Record<string, string> = {
  entity: "#c084fc", // Radiant Purple Pulsar
  seed: "#38bdf8",   // Bright Cyan Nebula
  active: "#34d399", // Emerald Star
  evicted: "#fbbf24",// Golden Giant
  archive: "#94a3b8",// Cosmic Dust
  fallback: "#64748b",
};

function fmtDate(iso?: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
}

export default function Graph3DGalaxyPage() {
  const { isDark } = useTheme();
  const [showArchive, setShowArchive] = useState(false);
  const [jarvisActive, setJarvisActive] = useState(false);
  const [autoRotate, setAutoRotate] = useState(true);

  const { data, err, refresh } = useLive<Graph>(
    `/api/graph${showArchive ? "?all=1" : ""}`, 60000
  );
  const [selected, setSelected] = useState<Node | null>(null);
  const [hoverNode, setHoverNode] = useState<Node | null>(null);
  const [q, setQ] = useState("");
  const fg3dRef = useRef<any>(null);

  const wrapRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => {
      const w = Math.round(entry.contentRect.width);
      const h = Math.round(entry.contentRect.height);
      setSize((prev) => (prev.w === w && prev.h === h ? prev : { w, h }));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const [graphData, setGraphData] = useState<{ nodes: Node[]; links: Link[] }>({ nodes: [], links: [] });

  // Galaxy 3D Layout seeding: spiral arms + spherical core distribution
  useEffect(() => {
    if (!data) return;

    const nodes = data.nodes.map((node, i) => {
      const isEntity = node.type === "entity";
      
      // Hitung posisi spiral galaxy 3D awal jika belum ada
      if (typeof node.x !== "number" || (node.x === 0 && node.y === 0 && (node.z ?? 0) === 0)) {
        if (isEntity) {
          // Entitas di core galaxy (bulatan tengah)
          const phi = Math.acos(-1 + (2 * i) / Math.max(1, data.nodes.length));
          const theta = Math.sqrt(data.nodes.length * Math.PI) * phi;
          const radius = 30 + Math.random() * 80;
          return {
            ...node,
            x: radius * Math.cos(theta) * Math.sin(phi),
            y: (radius * Math.sin(theta) * Math.sin(phi)) * 0.35, // Flattened disk
            z: radius * Math.cos(phi),
          };
        } else {
          // Entri berputar di lengan spiral galaksi (Logarithmic spiral)
          const arms = 3;
          const armIndex = i % arms;
          const armAngle = (armIndex * 2 * Math.PI) / arms;
          const dist = 60 + Math.pow(Math.random(), 0.7) * 320;
          const spiralAngle = armAngle + dist * 0.025 + (Math.random() - 0.5) * 0.4;
          const heightOffset = (Math.random() - 0.5) * (70 * (1 - dist / 400)); // Thicker at center

          return {
            ...node,
            x: Math.cos(spiralAngle) * dist,
            y: heightOffset,
            z: Math.sin(spiralAngle) * dist,
          };
        }
      }
      return node;
    });

    const links = data.links.map((l) => ({ ...l }));
    setGraphData({ nodes, links });
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

  const nodeById = useMemo(
    () => new Map(graphData.nodes.map((n) => [n.id, n])),
    [graphData.nodes]
  );

  // Setup 3D Three.js scene: ambient glow, starfield background, auto rotation
  useEffect(() => {
    if (!fg3dRef.current) return;
    const fg = fg3dRef.current;
    const scene = fg.scene?.();
    if (!scene) return;

    // Tambah Starfield Background Partikel
    const existingStarfield = scene.getObjectByName("galaxy_starfield");
    if (!existingStarfield) {
      const starGeometry = new THREE.BufferGeometry();
      const starCount = 1800;
      const starPositions = new Float32Array(starCount * 3);
      const starColors = new Float32Array(starCount * 3);

      for (let i = 0; i < starCount * 3; i += 3) {
        // Sphere distribution
        const r = 800 + Math.random() * 1200;
        const theta = Math.random() * 2 * Math.PI;
        const phi = Math.acos(2 * Math.random() - 1);
        starPositions[i] = r * Math.sin(phi) * Math.cos(theta);
        starPositions[i + 1] = r * Math.sin(phi) * Math.sin(theta);
        starPositions[i + 2] = r * Math.cos(phi);

        // Subtle cosmic blue/purple tint
        starColors[i] = 0.6 + Math.random() * 0.4;
        starColors[i + 1] = 0.7 + Math.random() * 0.3;
        starColors[i + 2] = 0.9 + Math.random() * 0.1;
      }

      starGeometry.setAttribute("position", new THREE.BufferAttribute(starPositions, 3));
      starGeometry.setAttribute("color", new THREE.BufferAttribute(starColors, 3));

      const starMaterial = new THREE.PointsMaterial({
        size: 2.2,
        vertexColors: true,
        transparent: true,
        opacity: 0.75,
      });

      const starField = new THREE.Points(starGeometry, starMaterial);
      starField.name = "galaxy_starfield";
      scene.add(starField);
    }

    // Dynamic camera auto-orbit
    let animationFrameId: number;
    let angle = 0;
    const rotateSpeed = 0.0015;

    const animate = () => {
      if (autoRotate && !jarvisActive && fg.camera) {
        const camera = fg.camera();
        if (camera) {
          angle += rotateSpeed;
          const r = Math.hypot(camera.position.x, camera.position.z) || 450;
          camera.position.x = r * Math.cos(angle);
          camera.position.z = r * Math.sin(angle);
          camera.lookAt(0, 0, 0);
        }
      }
      animationFrameId = requestAnimationFrame(animate);
    };
    animate();

    return () => cancelAnimationFrame(animationFrameId);
  }, [autoRotate, jarvisActive]);

  // Node 3D Object Renderer: Glowing Celestial Spheres (Pulsar / Star with Halo Shader)
  const nodeThreeObject = useCallback((node: any) => {
    const isEntity = node.type === "entity";
    const deg = degree.get(node.id) ?? 0;
    const baseColorHex = isEntity ? GALAXY_COLORS.entity : (GALAXY_COLORS[node.kind] ?? GALAXY_COLORS.fallback);
    const color = new THREE.Color(baseColorHex);

    const group = new THREE.Group();

    // 1. Core Sphere (Bintang / Planet)
    const radius = isEntity
      ? 5 + Math.min(8, Math.sqrt(deg) * 1.8)
      : 2.2 + Math.min(3.5, (node.content?.length || 0) * 0.008);

    const sphereGeom = new THREE.SphereGeometry(radius, 24, 24);
    const sphereMat = new THREE.MeshStandardMaterial({
      color: color,
      emissive: color,
      emissiveIntensity: isEntity ? 0.9 : 0.6,
      roughness: 0.2,
      metalness: 0.8,
    });
    const coreMesh = new THREE.Mesh(sphereGeom, sphereMat);
    group.add(coreMesh);

    // 2. Glowing Halo (Atmosphere Mesh dengan Blending Additive)
    const glowRadius = radius * (isEntity ? 2.4 : 1.7);
    const glowGeom = new THREE.SphereGeometry(glowRadius, 16, 16);
    const glowMat = new THREE.MeshBasicMaterial({
      color: color,
      transparent: true,
      opacity: isEntity ? 0.45 : 0.25,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide,
    });
    const glowMesh = new THREE.Mesh(glowGeom, glowMat);
    group.add(glowMesh);

    // 3. Entity Orbit Ring jika ini Entitas Utama
    if (isEntity && deg > 3) {
      const ringGeom = new THREE.RingGeometry(radius * 1.8, radius * 2.1, 32);
      const ringMat = new THREE.MeshBasicMaterial({
        color: color,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.35,
        blending: THREE.AdditiveBlending,
      });
      const ringMesh = new THREE.Mesh(ringGeom, ringMat);
      ringMesh.rotation.x = Math.PI / 2 + (Math.random() - 0.5) * 0.5;
      group.add(ringMesh);
    }

    return group;
  }, [degree]);

  const focusNode = useCallback((node: any) => {
    setSelected(node);
    if (fg3dRef.current && Number.isFinite(node.x)) {
      const distance = 140;
      const distRatio = 1 + distance / Math.hypot(node.x, node.y || 0, node.z || 0);
      fg3dRef.current.cameraPosition(
        { x: node.x * distRatio, y: (node.y || 0) * distRatio, z: (node.z || 0) * distRatio },
        node,
        1500
      );
    }
  }, []);

  const centerOnGalaxyCore = useCallback((duration = 800) => {
    if (fg3dRef.current) {
      fg3dRef.current.cameraPosition(
        { x: 0, y: 180, z: 480 },
        { x: 0, y: 0, z: 0 },
        duration
      );
    }
  }, []);

  // Jarvis Hand Gesture handler
  const handleJarvisGesture = useCallback((st: HandGestureState) => {
    if (!fg3dRef.current || !st.handPresent) return;

    const fg = fg3dRef.current;
    const camera = fg.camera?.();
    if (!camera) return;

    // 1. OPEN PALM -> Orbit / Rotate galaxy space
    if (st.gesture === "open_palm") {
      const rotSpeed = 3.8;
      const currentPos = camera.position;
      const radius = Math.hypot(currentPos.x, currentPos.z);
      let angle = Math.atan2(currentPos.z, currentPos.x);

      angle -= st.deltaX * rotSpeed;
      const newY = currentPos.y + st.deltaY * 350;

      camera.position.x = radius * Math.cos(angle);
      camera.position.z = radius * Math.sin(angle);
      camera.position.y = Math.max(-400, Math.min(400, newY));
      camera.lookAt(0, 0, 0);
    }

    // 2. PINCH -> Zoom warp speed
    else if (st.gesture === "pinch") {
      const zoomFactor = 1 + st.deltaY * 2.5;
      camera.position.x = Math.max(50, Math.min(1000, camera.position.x * zoomFactor));
      camera.position.y = Math.max(-500, Math.min(500, camera.position.y * zoomFactor));
      camera.position.z = Math.max(50, Math.min(1000, camera.position.z * zoomFactor));
    }

    // 3. FIST -> Pan kamera
    else if (st.gesture === "fist") {
      const panSpeed = 300;
      camera.position.x -= st.deltaX * panSpeed;
      camera.position.y += st.deltaY * panSpeed;
    }
  }, []);

  const tone: Tone = !data ? "idle" : err ? "bad" : "ok";

  const suggestions = useMemo(() => {
    if (!q.trim()) return [];
    const lower = q.toLowerCase();
    return graphData.nodes
      .filter((n) => (n.label || "").toLowerCase().includes(lower))
      .slice(0, 8);
  }, [q, graphData.nodes]);

  return (
    <Guard>
      <div className="flex min-h-screen flex-col lg:flex-row bg-[#05070e] text-zinc-100">
        <Sidebar />

        <main className="flex-1 overflow-y-auto px-6 pb-28 pt-8 lg:overflow-hidden lg:px-10 lg:pb-8">
          <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-[25px] font-bold tracking-[-0.025em] bg-gradient-to-r from-sky-400 via-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
                  3D Galaxy Memory Graph
                </h1>
                <span className="inline-flex items-center gap-1 rounded-full bg-violet-500/10 border border-violet-500/30 px-2.5 py-0.5 text-[10px] font-semibold text-violet-300">
                  <Orbit className="size-3 animate-spin" style={{ animationDuration: "12s" }} />
                  GALAXY VIEW
                </span>
              </div>
              <p className="mt-1 text-sm text-zinc-400">
                Peta kosmik 3D memori Vania: Bintang bercahaya &amp; relasi semantik ala Jarvis HUD.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              {data && (
                <Pill tone={tone}>
                  <StatusDot tone={tone} live />
                  {data.stats.entries} bintang · {data.stats.entities} pulsar core · {data.stats.edges} orbit
                </Pill>
              )}

              {/* Jarvis Mode Gesture Controller */}
              <JarvisHandController
                active={jarvisActive}
                onToggle={() => setJarvisActive((v) => !v)}
                onGesture={handleJarvisGesture}
              />

              {/* Auto Orbit Toggle */}
              <button
                onClick={() => setAutoRotate((v) => !v)}
                className={cn(
                  "raised flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-medium transition-all",
                  autoRotate ? "text-sky-400 border-sky-500/30 bg-sky-500/10" : "text-zinc-400 hover:text-zinc-200"
                )}
                title="Putar galaxy secara otomatis"
              >
                <Compass className={cn("size-3", autoRotate && "animate-spin")} style={{ animationDuration: "8s" }} />
                <span>{autoRotate ? "Orbit Aktif" : "Orbit Diam"}</span>
              </button>

              <button
                onClick={() => centerOnGalaxyCore()}
                title="Pusatkan kamera ke inti galaksi"
                className="raised flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-medium text-zinc-300 hover:text-white"
              >
                <Crosshair className="size-3" /> Inti Galaksi
              </button>
              <button
                onClick={() => setShowArchive((s) => !s)}
                className="raised rounded-full px-3 py-1 text-[11px] font-medium text-zinc-300 hover:text-white"
              >
                {showArchive ? "sembunyikan arsip" : "tampilkan arsip"}
              </button>
              <button
                onClick={() => refresh()}
                className="raised flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-medium text-zinc-300 hover:text-white"
              >
                <RefreshCw className="size-3" /> muat ulang
              </button>
            </div>
          </header>

          <div className="grid gap-4 lg:h-[calc(100vh-11rem)] lg:grid-cols-[1fr_340px]">
            <Panel className="relative h-[62vh] min-h-[340px] overflow-hidden border border-zinc-800 bg-[#070913] p-0 shadow-2xl rounded-2xl lg:h-auto lg:min-h-0">
              <div ref={wrapRef} aria-hidden className="pointer-events-none absolute inset-0" />

              {/* Search Overlay */}
              <div className="absolute left-3 right-3 top-3 z-20 sm:left-4 sm:top-4 sm:right-auto sm:w-64">
                <div className="flex items-center gap-2 rounded-xl px-3 py-2 bg-zinc-950/80 border border-zinc-800 backdrop-blur-md">
                  <Search className="size-3.5 shrink-0 text-zinc-400" />
                  <input
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="cari bintang atau entitas…"
                    className="w-full bg-transparent text-xs text-zinc-100 placeholder:text-zinc-500 focus:outline-none"
                  />
                </div>
                {suggestions.length > 0 && (
                  <div className="mt-1.5 divide-y divide-zinc-800 overflow-hidden rounded-xl bg-zinc-950/95 border border-zinc-800 backdrop-blur-md">
                    {suggestions.map((s) => (
                      <button
                        key={s.id}
                        onClick={() => {
                          focusNode(s);
                          setQ("");
                        }}
                        className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-xs transition-colors hover:bg-zinc-800/60"
                      >
                        <span className="truncate text-zinc-200">{s.label}</span>
                        <span className="shrink-0 text-[10px] text-zinc-400">{s.type === "entity" ? "pulsar" : s.kind}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* 3D Force Graph Galaxy Render */}
              <ForceGraph3D
                ref={fg3dRef}
                width={size.w || undefined}
                height={size.h || undefined}
                graphData={graphData}
                nodeThreeObject={nodeThreeObject}
                nodeLabel={(node: any) => `
                  <div style="background: rgba(10,12,24,0.85); border: 1px solid rgba(147,197,253,0.3); padding: 6px 10px; border-radius: 8px; font-family: monospace; font-size: 11px; color: #f1f5f9; backdrop-filter: blur(4px); box-shadow: 0 4px 12px rgba(0,0,0,0.5);">
                    <div style="font-weight: bold; color: ${node.type === 'entity' ? '#c084fc' : '#38bdf8'};">${node.label}</div>
                    <div style="font-size: 9px; color: #94a3b8; text-transform: uppercase;">${node.type === 'entity' ? 'PULSAR CORE' : (node.kind || 'STAR')}</div>
                  </div>
                `}
                linkColor={() => "rgba(147, 197, 253, 0.18)"}
                linkWidth={1.2}
                linkDirectionalParticles={2}
                linkDirectionalParticleWidth={2.4}
                linkDirectionalParticleSpeed={0.006}
                linkDirectionalParticleColor={() => "#a78bfa"}
                onNodeClick={(node: any) => focusNode(node)}
                onNodeHover={(node: any) => setHoverNode(node)}
                backgroundColor="#05070e"
                showNavInfo={false}
              />
            </Panel>

            {/* Sidebar Detail Node Galaxy */}
            <div className="flex flex-col gap-4">
              <Panel className="flex-1 overflow-y-auto bg-zinc-950/80 border-zinc-800">
                <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                  <h2 className="text-sm font-semibold text-zinc-100 flex items-center gap-1.5">
                    <Sparkles className="size-4 text-violet-400" />
                    <span>{selected ? (selected.type === "entity" ? "Pulsar Core" : "Bintang Memori") : "Pilih Objek"}</span>
                  </h2>
                  {selected && (
                    <button
                      onClick={() => setSelected(null)}
                      className="text-zinc-400 hover:text-zinc-100"
                    >
                      <X className="size-4" />
                    </button>
                  )}
                </div>

                {selected ? (
                  <div className="mt-4 space-y-4">
                    <div>
                      <span className="text-[10px] uppercase tracking-wider text-zinc-400">Identitas</span>
                      <p className="mt-0.5 text-sm font-bold text-sky-400">{selected.label}</p>
                    </div>

                    {selected.content && (
                      <div>
                        <span className="text-[10px] uppercase tracking-wider text-zinc-400">Transkrip Memori</span>
                        <p className="mt-1 whitespace-pre-wrap rounded-xl bg-zinc-900/80 p-3 text-xs text-zinc-300 border border-zinc-800/80 font-mono">
                          {selected.content}
                        </p>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-[10px] text-zinc-400">Klasifikasi</span>
                        <p className="font-medium text-zinc-200">{selected.type === "entity" ? "Entitas Relasional" : selected.kind}</p>
                      </div>
                      {selected.scope && (
                        <div>
                          <span className="text-[10px] text-zinc-400">Scope</span>
                          <p className="font-medium text-zinc-200">{selected.scope}</p>
                        </div>
                      )}
                    </div>

                    {selected.entries && selected.entries.length > 0 && (
                      <div>
                        <span className="text-[10px] uppercase tracking-wider text-zinc-400">
                          Satelit Orbit ({selected.entries.length})
                        </span>
                        <div className="mt-2 space-y-1.5 max-h-48 overflow-y-auto pr-1">
                          {selected.entries.map((e) => (
                            <button
                              key={e.id}
                              onClick={() => {
                                const targetNode = nodeById.get(e.id);
                                if (targetNode) focusNode(targetNode);
                              }}
                              className="w-full rounded-lg bg-zinc-900/60 p-2 text-left text-xs transition-colors hover:bg-zinc-800 border border-zinc-800/60 text-zinc-300 hover:text-white truncate block"
                            >
                              {e.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="mt-8 flex flex-col items-center justify-center text-center text-zinc-400">
                    <Focus className="size-8 stroke-[1.5] text-zinc-600" />
                    <p className="mt-2 text-xs">Klik bintang atau pulsar di galaxy untuk melihat detail memori &amp; orbit tautannya.</p>
                  </div>
                )}
              </Panel>

              {/* Legenda Galaxy */}
              <Panel className="text-xs bg-zinc-950/80 border-zinc-800">
                <span className="font-semibold text-zinc-200 block mb-2">Spektrum Cahaya Kosmik</span>
                <div className="space-y-2">
                  {LEGEND_ROWS.map((row) => (
                    <div
                      key={row.key}
                      className="flex items-center justify-between rounded-lg p-1.5 bg-zinc-900/40 border border-zinc-800/40"
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className="size-2.5 rounded-full shadow-sm"
                          style={{
                            backgroundColor: GALAXY_COLORS[row.key] ?? GALAXY_COLORS.fallback,
                            boxShadow: `0 0 8px ${GALAXY_COLORS[row.key] ?? GALAXY_COLORS.fallback}`,
                          }}
                        />
                        <span className="text-zinc-300 font-medium capitalize">{row.label}</span>
                      </div>
                      <span className="text-[10px] text-zinc-400">{row.note}</span>
                    </div>
                  ))}
                </div>
              </Panel>
            </div>
          </div>
        </main>
      </div>
    </Guard>
  );
}
