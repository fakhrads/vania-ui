import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireAuth } from "@/lib/api-guard";

export const dynamic = "force-dynamic";

/**
 * Daftar entitas tetap — kembaran persis dari ENTITIES di
 * ~/.hermes/scripts/vania-obsidian-export.py. Ditambah manual di kedua
 * tempat kalau ada konsep baru, biar linking-nya deterministik & konsisten
 * antara graph view di sini dan vault Obsidian.
 */
const ENTITIES = [
  "Abiane", "Fakhri", "Embermourn", "Zerodays", "FitHub Kota Wisata",
  "Dokploy", "Cloudflare", "FakhriPOS", "Astra Honda Motor", "Istidata",
  "Joss Way-ar", "Gawin", "Vania UI", "WhatsApp", "Helix", "NixOS",
  "Debian", "IHSG", "Vania", "ABIANE.md", "MEMORY.md",
];
const ENTITY_RE = new RegExp(
  ENTITIES.slice()
    .sort((a, b) => b.length - a.length)
    .map((e) => e.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join("|"),
  "gi"
);

type Row = {
  id: number; content: string; kind: string; scope: string; audience: string;
  created_at: string; updated_at: string;
};

/**
 * GET /api/graph
 * Query params: all=1 (ikutkan tier archive — berat, default off)
 */
export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (auth.error) return auth.error;

  const includeArchive = req.nextUrl.searchParams.get("all") === "1";

  const kindsFakhri = includeArchive
    ? "('seed','active','evicted','archive')"
    : "('seed','active','evicted')";

  const data = await query(
    `SELECT id, content, kind, scope, audience, created_at, updated_at FROM vania_ltm
     WHERE (scope='fakhri' AND kind IN ${kindsFakhri})
        OR (scope='abiane' AND kind IN ('seed','active'))
     ORDER BY scope, kind, id`
  );
  const rows: Row[] = data.rows;

  const entityIds = new Set<string>();
  const nodes: any[] = [];
  const links: any[] = [];
  const entryLinksByEntity = new Map<string, { id: string; label: string }[]>();

  for (const row of rows) {
    const nodeId = `entry-${row.id}`;
    nodes.push({
      id: nodeId,
      type: "entry",
      label: row.content.slice(0, 70),
      content: row.content,
      kind: row.kind,
      scope: row.scope,
      audience: row.audience,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    });

    const seen = new Set<string>();
    let m: RegExpExecArray | null;
    ENTITY_RE.lastIndex = 0;
    while ((m = ENTITY_RE.exec(row.content))) {
      const canon = ENTITIES.find((e) => e.toLowerCase() === m![0].toLowerCase())!;
      if (seen.has(canon)) continue;
      seen.add(canon);

      const entId = `ent-${canon}`;
      if (!entityIds.has(entId)) {
        entityIds.add(entId);
        nodes.push({ id: entId, type: "entity", label: canon });
        entryLinksByEntity.set(entId, []);
      }
      links.push({ source: nodeId, target: entId });
      entryLinksByEntity.get(entId)!.push({ id: nodeId, label: row.content.slice(0, 60) });
    }
  }

  // Entri-per-entitas dilampirkan langsung ke node entitas — panel detail di
  // klien tidak perlu menghitung ulang dari daftar links tiap klik.
  for (const n of nodes) {
    if (n.type === "entity") n.entries = entryLinksByEntity.get(n.id) ?? [];
  }

  return NextResponse.json({
    nodes, links,
    stats: { entries: rows.length, entities: entityIds.size, edges: links.length },
  });
}
