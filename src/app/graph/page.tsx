"use client";

import dynamic from "next/dynamic";
import { useMemo, useRef, useState, useCallback, useEffect, useSyncExternalStore } from "react";
import { Sidebar } from "@/components/sidebar";
import { Guard } from "@/components/guard";
import { PageHeader } from "@/components/page-header";
import { Panel, Pill, StatusDot, useLive, type Tone } from "@/components/monitor";
import { useTheme } from "@/lib/theme";
import {
  Lock, Globe, RefreshCw, Search, Flame, X, Focus, Link2, Check, Crosshair, Shuffle,
  Box, Layers, Compass, Orbit, Sparkles
} from "lucide-react";
import * as THREE from "three";
import { forceCollide } from "d3-force-3d";
import { cn } from "@/lib/utils";
import { JarvisHandController, type HandGestureState } from "@/components/jarvis-hand-controller";

// Dynamic import with SSR false
const ForceGraph2D = dynamic(() => import("react-force-graph-2d"), { ssr: false });
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
  fx?: number; fy?: number; fz?: number;
};
type Link = { source: string | any; target: string | any };
type Graph = { nodes: Node[]; links: Link[]; stats: { entries: number; entities: number; edges: number } };

const KIND_LABEL: Record<string, string> = {
  seed: "fakta inti",
  active: "aktif",
  resampled: "resampled",
  reasoning: "pelajaran / strategi",
  quarantine: "karantina (unverified)",
  evicted: "pernah aktif",
  archive: "arsip",
};

const LEGEND_ROWS = [
  { key: "entity", label: "entitas (inti)", note: "center cluster" },
  { key: "seed", label: KIND_LABEL.seed, note: "biru langit" },
  { key: "active", label: KIND_LABEL.active, note: "emerald" },
  { key: "resampled", label: KIND_LABEL.resampled, note: "sky" },
  { key: "reasoning", label: KIND_LABEL.reasoning, note: "purple" },
  { key: "quarantine", label: KIND_LABEL.quarantine, note: "rose" },
  { key: "evicted", label: KIND_LABEL.evicted, note: "kuning" },
  { key: "archive", label: KIND_LABEL.archive, note: "abu-abu" },
] as const;

const PHYSICS_KEYS = ["x", "y", "z", "vx", "vy", "vz", "fx", "fy", "fz", "index"];

const LABEL_KEY = "vania-graph-labels-v1";
const LABEL_DEFAULT: Record<string, boolean> = {
  entity: true, seed: false, active: false, resampled: false, reasoning: false, quarantine: false, evicted: false, archive: false,
};

let labelSnapshot: Record<string, boolean> = LABEL_DEFAULT;
const labelListeners = new Set<() => void>();

function readLabels(): Record<string, boolean> {
  try {
    const raw = localStorage.getItem(LABEL_KEY);
    if (raw) {
      const next = { ...LABEL_DEFAULT, ...JSON.parse(raw) };
      if (JSON.stringify(next) !== JSON.stringify(labelSnapshot)) labelSnapshot = next;
    }
  } catch {}
  return labelSnapshot;
}

function subscribeLabels(cb: () => void) {
  labelListeners.add(cb);
  window.addEventListener("storage", cb);
  return () => {
    labelListeners.delete(cb);
    window.removeEventListener("storage", cb);
  };
}

function writeLabels(next: Record<string, boolean>) {
  labelSnapshot = next;
  try {
    localStorage.setItem(LABEL_KEY, JSON.stringify(next));
  } catch {}
  for (const l of labelListeners) l();
}

function shortLabel(text: string, max = 30) {
  return text.length > max ? text.slice(0, max - 1).trimEnd() + "…" : text;
}

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
  // Nilai hex kembaran token oklch di globals.css (tema Ledger) — canvas
  // tidak bisa membaca CSS variable, jadi kalau token berubah, ubah di sini juga.
  dark: {
    kind: {
      seed: "#6cb4f0",
      active: "#5fd39a",
      resampled: "#6cb4f0",
      reasoning: "#c29af0",
      quarantine: "#f07a78",
      evicted: "#f0b25a",
      archive: "#8d93a3",
    },
    entity: "#c29af0",
    fallback: "#8d93a3",
    linkIdle: "rgba(240,233,220,0.10)",
    linkOn: "rgba(240,233,220,0.85)",
    linkOff: "rgba(240,233,220,0.03)",
    label: "#efe9dd",
    labelEntity: "#e3d2fb",
    labelBg: "rgba(19,22,29,0.82)",
    focusRing: "#f3efe6",
  },
  light: {
    kind: {
      seed: "#2a6fc0",
      active: "#1f7f53",
      resampled: "#2a6fc0",
      reasoning: "#7a45c2",
      quarantine: "#c4302f",
      evicted: "#b8641a",
      archive: "#6c7180",
    },
    entity: "#7a45c2",
    fallback: "#6c7180",
    linkIdle: "rgba(40,34,20,0.14)",
    linkOn: "rgba(29,33,43,0.75)",
    linkOff: "rgba(40,34,20,0.04)",
    label: "#232733",
    labelEntity: "#4b2385",
    labelBg: "rgba(251,249,244,0.9)",
    focusRing: "#1d212b",
  },
};

function fmtDate(iso?: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
}

// ── Constellation glow: satu texture radial dipakai ulang semua node ──────────
// (jauh lebih ringan dari 2 SphereGeometry + MeshStandardMaterial per node)
let GLOW_TEX: THREE.Texture | null = null;
function glowTexture() {
  if (GLOW_TEX) return GLOW_TEX;
  const S = 128;
  const cv = document.createElement("canvas");
  cv.width = cv.height = S;
  const ctx = cv.getContext("2d")!;
  const g = ctx.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
  g.addColorStop(0.00, "rgba(255,255,255,1)");
  g.addColorStop(0.10, "rgba(255,255,255,0.92)");
  g.addColorStop(0.22, "rgba(255,255,255,0.45)");
  g.addColorStop(0.42, "rgba(255,255,255,0.14)");
  g.addColorStop(0.70, "rgba(255,255,255,0.035)");
  g.addColorStop(1.00, "rgba(255,255,255,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, S, S);
  GLOW_TEX = new THREE.CanvasTexture(cv);
  GLOW_TEX.colorSpace = THREE.SRGBColorSpace;
  return GLOW_TEX;
}

const STAR_MATS = new Map<string, THREE.SpriteMaterial>();
function starMaterial(colorHex: string, opacity: number) {
  const key = `${colorHex}|${opacity}`;
  let m = STAR_MATS.get(key);
  if (!m) {
    m = new THREE.SpriteMaterial({
      map: glowTexture(),
      color: new THREE.Color(colorHex),
      transparent: true,
      opacity,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    });
    STAR_MATS.set(key, m);
  }
  return m;
}

// hash stabil -> hemisfer kiri/kanan & ketebalan korteks tetap sama tiap render
function hashId(id: string) {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 4294967295;
}

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
  const [is3D, setIs3D] = useState(false);
  const [jarvisActive, setJarvisActive] = useState(false);
  const [autoRotate, setAutoRotate] = useState(true);

  const { data, err, refresh } = useLive<Graph>(
    `/api/graph${showArchive ? "?all=1" : ""}`, 60000
  );
  const [selected, setSelected] = useState<Node | null>(null);
  const [hoverNode, setHoverNode] = useState<Node | null>(null);
  const [q, setQ] = useState("");
  const fgRef = useRef<any>(null);
  const fg3dRef = useRef<any>(null);
  const didInitialFit = useRef(false);

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

  const showLabels = useSyncExternalStore(
    subscribeLabels, readLabels, () => LABEL_DEFAULT
  );
  const toggleLabel = useCallback((k: string) => {
    writeLabels({ ...labelSnapshot, [k]: !labelSnapshot[k] });
  }, []);

  const POSITION_CACHE_KEY = "vania-graph-positions-v2";
  const positionCacheRef = useRef<Record<string, { x: number; y: number }> | null>(null);
  const getPositionCache = () => {
    if (positionCacheRef.current) return positionCacheRef.current;
    let cache: Record<string, { x: number; y: number }> = {};
    try {
      const raw = localStorage.getItem(POSITION_CACHE_KEY);
      if (raw) cache = JSON.parse(raw);
    } catch {}
    positionCacheRef.current = cache;
    return cache;
  };
  const persistNodePosition = (id: string, x: number, y: number) => {
    const cache = getPositionCache();
    cache[id] = { x, y };
    try {
      localStorage.setItem(POSITION_CACHE_KEY, JSON.stringify(cache));
    } catch {}
  };

  const looseRef = useRef<Set<string>>(new Set());
  const draggingRef = useRef<string | null>(null);

  const [graphData, setGraphData] = useState<{ nodes: any[]; links: any[] }>({ nodes: [], links: [] });

  useEffect(() => {
    if (!data) return;
    setGraphData((prev) => {
      const prevById = new Map(prev.nodes.map((n) => [n.id, n]));
      const cache = getPositionCache();

      // 2D: bekukan node lama
      if (!is3D) {
        for (const n of prev.nodes) {
          if (looseRef.current.has(n.id)) continue;
          if (typeof n.x === "number" && typeof n.fx !== "number") {
            n.fx = n.x;
            n.fy = n.y;
          }
        }
      }

      const nextNodes = data.nodes.map((incoming) => {
        const existing = prevById.get(incoming.id);
        if (existing) {
          Object.assign(existing, incoming);
          if (is3D) {
            delete existing.fx;
            delete existing.fy;
            delete existing.fz;
          }
          return existing;
        }

        if (!is3D) {
          const remembered = cache[incoming.id];
          if (remembered) {
            return { ...incoming, x: remembered.x, y: remembered.y, fx: remembered.x, fy: remembered.y };
          }
        }
        return { ...incoming };
      });

      if (!is3D) {
        const nextCache: Record<string, { x: number; y: number }> = { ...cache };
        for (const n of nextNodes) {
          if (typeof n.fx === "number") nextCache[n.id] = { x: n.fx, y: n.fy };
        }
        positionCacheRef.current = nextCache;
        try {
          localStorage.setItem(POSITION_CACHE_KEY, JSON.stringify(nextCache));
        } catch {}
      }

      const nextLinks = data.links.map((l) => ({ ...l }));
      return { nodes: nextNodes, links: nextLinks };
    });
  }, [data, is3D]);

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

  const degreeRef = useRef<Map<string, number>>(new Map());
  useEffect(() => {
    degreeRef.current = degree;
  }, [degree]);

  const forcesConfigured = useRef(false);
  useEffect(() => {
    if (!data || !fgRef.current || forcesConfigured.current || is3D) return;
    const charge = fgRef.current.d3Force?.("charge");
    if (charge?.strength) {
      charge.strength(-320);
      charge.distanceMax?.(800);
    }
    const link = fgRef.current.d3Force?.("link");
    if (link?.distance) link.distance(140);
    fgRef.current.d3Force?.(
      "collide",
      forceCollide((n: any) => nodeRadius(n, degreeRef.current.get(n.id) ?? 0) + 7)
    );
    forcesConfigured.current = true;
  }, [data, is3D]);

  // Fisika 3D "Brain Constellation": dua hemisfer + korteks shell ellipsoid
  useEffect(() => {
    if (!is3D) return;
    let raf = 0;
    let stopped = false;
    let cleanupScene: (() => void) | null = null;

    const setup = () => {
      const fg = fg3dRef.current;
      if (stopped) return;
      if (!fg?.d3Force) {
        raf = requestAnimationFrame(setup);
        return;
      }

      // Tolakan antar node biar tidak tumpang tindih di dalam volume otak
      const charge = fg.d3Force("charge");
      if (charge?.strength) {
        charge.strength(-165);
        charge.distanceMax?.(420);
      }

      // Link spring pendek -> gugusan rapat seperti gyrus
      const link = fg.d3Force("link");
      if (link?.distance) link.distance(48);

      // Sumbu ellipsoid otak: panjang depan-belakang (z), lebar (x), tinggi (y)
      const AX = 178;  // lebar kiri-kanan
      const AY = 138;  // tinggi
      const AZ = 232;  // depan-belakang
      const FISSURE = 22; // celah longitudinal antar hemisfer

      const brainForce = (alpha: number) => {
        const nodes = fg.graphData?.()?.nodes;
        if (!nodes) return;
        const k = alpha * 0.22;

        for (const n of nodes) {
          if (!Number.isFinite(n.x) || !Number.isFinite(n.y) || !Number.isFinite(n.z)) continue;

          if (n.__shell === undefined) {
            const h = hashId(n.id);
            n.__hemi = h < 0.5 ? -1 : 1;
            // entitas inti duduk lebih dalam, memori menempel ke korteks luar
            n.__shell = (n.type === "entity" ? 0.42 : 0.74) + h * 0.3;
          }

          // arah dari pusat dalam ruang ellipsoid ternormalisasi
          const u = n.x / AX, v = n.y / AY, w = n.z / AZ;
          const d = Math.hypot(u, v, w) || 1e-6;
          const t = n.__shell / d;

          // titik target pada shell korteks, searah node saat ini
          const tx = n.x * t;
          const ty = n.y * t;
          const tz = n.z * t;

          n.vx = (n.vx || 0) + (tx - n.x) * k;
          n.vy = (n.vy || 0) + (ty - n.y) * k;
          n.vz = (n.vz || 0) + (tz - n.z) * k;

          // dorong keluar dari bidang tengah -> terbelah jadi dua hemisfer
          if (Math.abs(n.x) < FISSURE) {
            n.vx += n.__hemi * (FISSURE - Math.abs(n.x)) * k * 1.6;
          }
        }
      };

      fg.d3Force("sphereConstraint", null);
      fg.d3Force("brain", brainForce);
      fg.d3ReheatSimulation?.();

      // Starfield latar: satu THREE.Points = satu draw call, praktis gratis
      const scene = fg.scene?.();
      if (scene) {
        const COUNT = 700;
        const pos = new Float32Array(COUNT * 3);
        for (let i = 0; i < COUNT; i++) {
          const r = 900 + Math.random() * 1100;
          const th = Math.random() * Math.PI * 2;
          const ph = Math.acos(2 * Math.random() - 1);
          pos[i * 3] = r * Math.sin(ph) * Math.cos(th);
          pos[i * 3 + 1] = r * Math.sin(ph) * Math.sin(th);
          pos[i * 3 + 2] = r * Math.cos(ph);
        }
        const geo = new THREE.BufferGeometry();
        geo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
        const mat = new THREE.PointsMaterial({
          map: glowTexture(),
          size: 7,
          sizeAttenuation: true,
          color: new THREE.Color(isDark ? "#9fb4dd" : "#7b8598"),
          transparent: true,
          opacity: isDark ? 0.5 : 0.22,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
          toneMapped: false,
        });
        const stars = new THREE.Points(geo, mat);
        stars.renderOrder = -1;
        stars.frustumCulled = false;
        scene.add(stars);
        cleanupScene = () => {
          scene.remove(stars);
          geo.dispose();
          mat.dispose();
        };
      }
    };

    setup();

    return () => {
      stopped = true;
      cancelAnimationFrame(raf);
      cleanupScene?.();
    };
  }, [is3D, isDark]);

  // Auto-Orbit camera melingkari bola 3D
  useEffect(() => {
    if (!is3D || !fg3dRef.current) return;
    const fg = fg3dRef.current;

    let animationFrameId: number;
    let angle = 0;
    const rotateSpeed = 0.0016;

    const animate = () => {
      if (autoRotate && !jarvisActive && fg.camera) {
        const camera = fg.camera();
        if (camera) {
          angle += rotateSpeed;
          const r = Math.hypot(camera.position.x, camera.position.z) || 480;
          camera.position.x = r * Math.cos(angle);
          camera.position.z = r * Math.sin(angle);
          camera.lookAt(0, 0, 0);
        }
      }
      animationFrameId = requestAnimationFrame(animate);
    };
    animate();

    return () => cancelAnimationFrame(animationFrameId);
  }, [is3D, autoRotate, jarvisActive]);

  // Node 3D: titik bintang bersinar (1 Sprite/node, material di-cache per warna)
  const nodeThreeObject = useCallback((node: any) => {
    const isEntity = node.type === "entity";
    const deg = degree.get(node.id) ?? 0;
    const colorHex = isEntity ? C.entity : (C.kind[node.kind] ?? C.fallback);

    const r = isEntity
      ? 4.2 + Math.min(6, Math.sqrt(deg) * 1.5)
      : 2.0 + Math.min(2.6, Math.sqrt(deg) * 0.7) + Math.min(1.2, (node.content?.length || 0) * 0.004);

    const sprite = new THREE.Sprite(
      starMaterial(colorHex, isEntity ? (isDark ? 1 : 0.9) : (isDark ? 0.72 : 0.62))
    );
    // texture-nya jauh lebih besar dari inti terang -> halo lembut ikut kebawa
    const s = r * (isEntity ? 7.2 : 5.8);
    sprite.scale.set(s, s, 1);
    sprite.renderOrder = 2;
    return sprite;
  }, [degree, C, isDark]);

  const nodeById = useMemo(
    () => new Map(graphData.nodes.map((n) => [n.id, n])),
    [graphData.nodes]
  );

  const adjacency = useMemo(() => {
    const m = new Map<string, Set<string>>();
    for (const l of graphData.links) {
      const s = typeof l.source === "object" ? (l.source as any).id : l.source;
      const t = typeof l.target === "object" ? (l.target as any).id : l.target;
      if (!m.has(s)) m.set(s, new Set());
      if (!m.has(t)) m.set(t, new Set());
      m.get(s)!.add(t);
      m.get(t)!.add(s);
    }
    return m;
  }, [graphData.links]);

  const anchor = hoverNode || selected;
  const [isolate, setIsolate] = useState(false);

  const highlight = useMemo(() => {
    if (!anchor) return { nodes: new Set<string>(), links: new Set<any>() };
    const nodes = new Set<string>([anchor.id]);
    const links = new Set<any>();
    for (const l of graphData.links) {
      const s = typeof l.source === "object" ? (l.source as any).id : l.source;
      const t = typeof l.target === "object" ? (l.target as any).id : l.target;
      if (s === anchor.id || t === anchor.id) {
        nodes.add(s);
        nodes.add(t);
        links.add(l);
      }
    }
    return { nodes, links };
  }, [anchor, graphData.links]);

  const displayGraphData = useMemo(() => {
    if (!isolate || !anchor) return graphData;
    const allowed = highlight.nodes;
    return {
      nodes: graphData.nodes.filter((n) => allowed.has(n.id)),
      links: graphData.links.filter(
        (l) =>
          allowed.has(typeof l.source === "object" ? (l.source as any).id : l.source) &&
          allowed.has(typeof l.target === "object" ? (l.target as any).id : l.target)
      ),
    };
  }, [graphData, isolate, anchor, highlight.nodes]);

  const focusNode = useCallback((node: any) => {
    setSelected(node);
    if (!is3D && fgRef.current && Number.isFinite(node.x) && Number.isFinite(node.y)) {
      fgRef.current.centerAt(node.x, node.y, 600);
      fgRef.current.zoom(1.8, 600);
    } else if (is3D && fg3dRef.current && Number.isFinite(node.x)) {
      const distance = 120;
      const distRatio = 1 + distance / Math.hypot(node.x, node.y || 0, node.z || 0);
      fg3dRef.current.cameraPosition(
        { x: node.x * distRatio, y: (node.y || 0) * distRatio, z: (node.z || 0) * distRatio },
        node,
        1500
      );
    }
  }, [is3D]);

  const centerOnHub = useCallback((duration = 500) => {
    let best: any = null;
    let maxDeg = -1;
    for (const n of graphData.nodes) {
      const d = degree.get(n.id) ?? 0;
      if (d > maxDeg && Number.isFinite(n.x) && Number.isFinite(n.y)) {
        maxDeg = d;
        best = n;
      }
    }
    if (!best) return;
    if (!is3D && fgRef.current) {
      fgRef.current.centerAt(best.x, best.y, duration);
      fgRef.current.zoom(0.85, duration);
    } else if (is3D && fg3dRef.current) {
      fg3dRef.current.cameraPosition(
        { x: 0, y: 120, z: 460 },
        { x: 0, y: 0, z: 0 },
        duration
      );
    }
  }, [graphData.nodes, degree, is3D]);

  // Jarvis Hand Gesture handler
  const handleJarvisGesture = useCallback((st: HandGestureState) => {
    if (!is3D || !fg3dRef.current || !st.handPresent) return;

    const fg = fg3dRef.current;
    const camera = fg.camera?.();
    if (!camera) return;

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
    } else if (st.gesture === "pinch") {
      const zoomFactor = 1 + st.deltaY * 2.5;
      camera.position.x = Math.max(50, Math.min(1000, camera.position.x * zoomFactor));
      camera.position.y = Math.max(-500, Math.min(500, camera.position.y * zoomFactor));
      camera.position.z = Math.max(50, Math.min(1000, camera.position.z * zoomFactor));
    } else if (st.gesture === "fist") {
      const panSpeed = 300;
      camera.position.x -= st.deltaX * panSpeed;
      camera.position.y += st.deltaY * panSpeed;
    }
  }, [is3D]);

  const resetLayout = useCallback(() => {
    if (!data) return;
    positionCacheRef.current = {};
    try {
      localStorage.removeItem(POSITION_CACHE_KEY);
    } catch {}
    draggingRef.current = null;
    didInitialFit.current = false;
    looseRef.current = new Set(data.nodes.map((n) => n.id));
    setSelected(null);
    setIsolate(false);
    setGraphData({
      nodes: data.nodes.map((n) => {
        const clean: Record<string, unknown> = { ...n };
        for (const k of PHYSICS_KEYS) delete clean[k];
        return clean;
      }),
      links: data.links.map((l) => ({ ...l })),
    });
    fgRef.current?.d3ReheatSimulation?.();
    fg3dRef.current?.d3ReheatSimulation?.();
  }, [data]);

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
      <div className="flex min-h-screen flex-col lg:flex-row">
        <Sidebar />

        <main className="min-w-0 flex-1 px-5 pb-28 pt-7 sm:px-8 lg:flex lg:h-screen lg:flex-col lg:overflow-hidden lg:px-12 lg:pb-8 lg:pt-10">
          <PageHeader title={is3D ? "Graph memori · 3D" : "Graph memori"}>
            {is3D
              ? "Memori tersusun melingkar volumetrik di ruang 3D."
              : "Entri & entitas terhubung lewat tautan; entitas paling sibuk di tengah. Klik node untuk detail."}
          </PageHeader>

            <div className="mb-4 flex flex-wrap items-center gap-2">
              {data && (
                <span className="num mr-auto flex items-center gap-2 text-[12px] text-tx-2">
                  <StatusDot tone={tone} live />
                  {data.stats.entries} entri · {data.stats.entities} entitas · {data.stats.edges} tautan
                </span>
              )}

              {/* Toggle 2D / 3D */}
              <button
                onClick={() => setIs3D((v) => !v)}
                title="Ganti tampilan antara 2D Flat dan 3D Sphere Network"
                className={cn(
                  "flex items-center gap-1.5 rounded-md border border-line bg-surf-1 px-2.5 py-1.5 text-[12px] transition-all",
                  is3D
                    ? "!border-tx-1 font-medium text-tx-1"
                    : "text-tx-2 hover:text-tx-1"
                )}
              >
                {is3D ? <Box className="size-3" /> : <Layers className="size-3" />}
                <span>{is3D ? "Mode 3D Bola" : "Mode 2D Flat"}</span>
              </button>

              {/* Jarvis Mode Controller (Aktif di 3D) */}
              {is3D && (
                <>
                  <JarvisHandController
                    active={jarvisActive}
                    onToggle={() => setJarvisActive((v) => !v)}
                    onGesture={handleJarvisGesture}
                  />
                  <button
                    onClick={() => setAutoRotate((v) => !v)}
                    className={cn(
                      "flex items-center gap-1.5 rounded-md border border-line bg-surf-1 px-2.5 py-1.5 text-[12px] transition-all",
                      autoRotate ? "!border-tx-1 text-tx-1" : "text-tx-3 hover:text-tx-2"
                    )}
                    title="Putar graph 3D secara otomatis"
                  >
                    <Compass className={cn("size-3", autoRotate && "animate-spin")} style={{ animationDuration: "8s" }} />
                    <span>{autoRotate ? "Orbit Aktif" : "Orbit Diam"}</span>
                  </button>
                </>
              )}

              <button
                onClick={resetLayout}
                title="Buang semua posisi tersimpan dan susun ulang dari nol"
                className="flex items-center gap-1.5 rounded-md border border-line bg-surf-1 px-2.5 py-1.5 text-[12px] text-tx-2 transition-colors hover:text-tx-1"
              >
                <Shuffle className="size-3" /> tata ulang
              </button>
              <button
                onClick={() => centerOnHub()}
                title="Bawa kamera balik ke entitas paling sibuk"
                className="flex items-center gap-1.5 rounded-md border border-line bg-surf-1 px-2.5 py-1.5 text-[12px] text-tx-2 transition-colors hover:text-tx-1"
              >
                <Crosshair className="size-3" /> pusatkan
              </button>
              <button
                onClick={() => setShowArchive((s) => !s)}
                className="rounded-md border border-line bg-surf-1 px-2.5 py-1.5 text-[12px] text-tx-2 transition-colors hover:text-tx-1"
              >
                {showArchive ? "sembunyikan arsip" : "tampilkan arsip"}
              </button>
              <button
                onClick={() => refresh()}
                className="flex items-center gap-1.5 rounded-md border border-line bg-surf-1 px-2.5 py-1.5 text-[12px] text-tx-2 transition-colors hover:text-tx-1"
              >
                <RefreshCw className="size-3" /> muat ulang
              </button>
            </div>
          <div className="grid gap-4 lg:min-h-0 lg:flex-1 lg:grid-cols-[1fr_340px]">
            <Panel className="well relative h-[62vh] min-h-[340px] overflow-hidden border border-line p-0 lg:h-auto lg:min-h-0">
              <div ref={wrapRef} aria-hidden className="pointer-events-none absolute inset-0" />

              {/* Search Overlay */}
              <div className="absolute left-3 right-3 top-3 z-20 sm:left-4 sm:top-4 sm:right-auto sm:w-64">
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
                  <div className="panel mt-1.5 divide-y divide-line overflow-hidden rounded-xl">
                    {suggestions.map((s) => (
                      <button
                        key={s.id}
                        onClick={() => {
                          focusNode(s);
                          setQ("");
                        }}
                        className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-xs transition-colors hover:bg-surface-elevated"
                      >
                        <span className="truncate text-tx-1">{s.label}</span>
                        <span className="shrink-0 text-[10px] text-tx-3">{s.type === "entity" ? "entitas" : s.kind}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* 3D Force Graph Render */}
              {is3D ? (
                <ForceGraph3D
                  ref={fg3dRef}
                  width={size.w || undefined}
                  height={size.h || undefined}
                  graphData={displayGraphData}
                  nodeThreeObject={nodeThreeObject}
                  nodeLabel={(node: any) => `
                    <div style="background: ${isDark ? 'rgba(18,20,26,0.85)' : 'rgba(255,255,255,0.9)'}; border: 1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}; padding: 4px 8px; border-radius: 6px; font-family: system-ui; font-size: 11px; color: ${isDark ? '#f1f5f9' : '#0f172a'}; backdrop-filter: blur(4px);">
                      <div style="font-weight: 600; color: ${node.type === 'entity' ? C.entity : (C.kind[node.kind] ?? C.fallback)};">${node.label}</div>
                      <div style="font-size: 9px; color: #64748b; text-transform: uppercase;">${node.type === 'entity' ? 'ENTITAS' : (node.kind || 'MEMORI')}</div>
                    </div>
                  `}
                  linkColor={(l: any) =>
                    highlight.links.has(l)
                      ? (isDark ? "rgba(233,213,255,0.75)" : "rgba(80,40,150,0.6)")
                      : (isDark ? "rgba(150,175,225,0.09)" : "rgba(30,40,70,0.10)")
                  }
                  linkWidth={0}
                  linkOpacity={1}
                  onNodeClick={(node: any) => focusNode(node)}
                  onNodeHover={(node: any) => setHoverNode(node)}
                  backgroundColor={isDark ? "#05060b" : "#f4f5f8"}
                  warmupTicks={0}
                  cooldownTime={9000}
                  showNavInfo={false}
                />
              ) : (
                /* 2D Force Graph Render */
                <ForceGraph2D
                  ref={fgRef}
                  width={size.w || undefined}
                  height={size.h || undefined}
                  graphData={displayGraphData}
                  onEngineStop={() => {
                    if (looseRef.current.size) {
                      for (const id of looseRef.current) {
                        const n = nodeById.get(id);
                        if (!n || !Number.isFinite(n.x)) continue;
                        n.fx = n.x;
                        n.fy = n.y;
                        persistNodePosition(n.id, n.x, n.y!);
                      }
                      looseRef.current.clear();
                    }
                    if (!didInitialFit.current) {
                      didInitialFit.current = true;
                      centerOnHub(600);
                    }
                  }}
                  onNodeHover={(n: any) => setHoverNode(n)}
                  onNodeClick={(n: any) => focusNode(n)}
                  onBackgroundClick={() => setSelected(null)}
                  onNodeDrag={(n: any) => {
                    if (draggingRef.current !== n.id) {
                      draggingRef.current = n.id;
                      for (const id of adjacency.get(n.id) ?? []) {
                        const nb = nodeById.get(id);
                        if (!nb) continue;
                        delete nb.fx;
                        delete nb.fy;
                        looseRef.current.add(id);
                      }
                    }
                    fgRef.current?.d3ReheatSimulation();
                  }}
                  onNodeDragEnd={(n: any) => {
                    n.fx = n.x;
                    n.fy = n.y;
                    persistNodePosition(n.id, n.x, n.y);
                    draggingRef.current = null;
                    fgRef.current?.d3ReheatSimulation();
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

                    const showLabel =
                      isFocus || showLabels[isEntity ? "entity" : node.kind ?? ""];
                    if (showLabel && !dimmed) {
                      const fontSize = Math.max(3, (isEntity ? 12 : 11) / globalScale);
                      ctx.font = `${isEntity ? "600" : "500"} ${fontSize}px ui-sans-serif, system-ui`;
                      const text = isEntity || isFocus ? node.label : shortLabel(node.label);
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
                  cooldownTicks={80}
                />
              )}
            </Panel>

            {/* Sidebar Detail Node */}
            <div className="flex flex-col gap-4">
              <Panel className="flex-1 overflow-y-auto p-5">
                <div className="flex items-center justify-between border-b border-line pb-3">
                  <h2 className="text-sm font-semibold text-tx-1">
                    {selected ? (selected.type === "entity" ? "Detail Entitas" : "Detail Memori") : "Pilih Node"}
                  </h2>
                  {selected && (
                    <button
                      onClick={() => setSelected(null)}
                      className="text-tx-3 hover:text-tx-1"
                    >
                      <X className="size-4" />
                    </button>
                  )}
                </div>

                {selected ? (
                  <div className="mt-4 space-y-4">
                    <div>
                      <span className="text-[10px] uppercase tracking-wider text-tx-3">Label</span>
                      <p className="mt-0.5 text-sm font-medium text-tx-1">{selected.label}</p>
                    </div>

                    {selected.content && (
                      <div>
                        <span className="text-[10px] uppercase tracking-wider text-tx-3">Isi Lengkap</span>
                        <p className="mt-1 whitespace-pre-wrap rounded-xl bg-surface-elevated p-3 text-xs text-tx-2 border border-line">
                          {selected.content}
                        </p>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-[10px] text-tx-3">Tipe</span>
                        <p className="font-medium text-tx-1">{selected.type === "entity" ? "Entitas Relasional" : selected.kind}</p>
                      </div>
                      {selected.scope && (
                        <div>
                          <span className="text-[10px] text-tx-3">Scope</span>
                          <p className="font-medium text-tx-1">{selected.scope}</p>
                        </div>
                      )}
                    </div>

                    {selected.entries && selected.entries.length > 0 && (
                      <div>
                        <span className="text-[10px] uppercase tracking-wider text-tx-3">
                          Entri Terhubung ({selected.entries.length})
                        </span>
                        <div className="mt-2 space-y-1.5 max-h-48 overflow-y-auto pr-1">
                          {selected.entries.map((e) => (
                            <button
                              key={e.id}
                              onClick={() => {
                                const targetNode = nodeById.get(e.id);
                                if (targetNode) focusNode(targetNode);
                              }}
                              className="w-full rounded-lg bg-surface-elevated p-2 text-left text-xs transition-colors hover:bg-surface border border-line text-tx-2 hover:text-tx-1 truncate block"
                            >
                              {e.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="mt-8 flex flex-col items-center justify-center text-center text-tx-3">
                    <Focus className="size-8 stroke-[1.5] text-tx-3/60" />
                    <p className="mt-2 text-xs">Klik salah satu node di graph untuk melihat metadata dan koneksinya.</p>
                  </div>
                )}
              </Panel>

              {/* Legenda */}
              <Panel className="p-5 text-xs">
                <span className="font-semibold text-tx-1 block mb-2">Filter Label Canvas</span>
                <div className="space-y-1.5">
                  {LEGEND_ROWS.map((row) => (
                    <label
                      key={row.key}
                      className="flex items-center justify-between cursor-pointer rounded-lg p-1.5 hover:bg-surface-elevated transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <span
                          className="size-2.5 rounded-full shadow-sm"
                          style={{
                            backgroundColor:
                              row.key === "entity"
                                ? C.entity
                                : C.kind[row.key] ?? C.fallback,
                            boxShadow: is3D ? `0 0 6px ${C.kind[row.key] ?? C.entity}` : undefined,
                          }}
                        />
                        <span className="text-tx-2 capitalize">{row.label}</span>
                      </div>
                      <input
                        type="checkbox"
                        checked={showLabels[row.key] ?? false}
                        onChange={() => toggleLabel(row.key)}
                        className="rounded border-line bg-surface accent-tx-1 focus:ring-0"
                      />
                    </label>
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
