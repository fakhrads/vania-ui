import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireAuth } from "@/lib/api-guard";

export const dynamic = "force-dynamic";

/**
 * Daftar entitas relasional untuk knowledge graph Caduceus.
 * Mencakup semua stack, homelab, domain, tools, dan proyek inti Fakhri & Vania.
 */
const ENTITIES = [
  "Abiane", "Fakhri", "Embermourn", "Zerodays", "FitHub Kota Wisata",
  "Dokploy", "Cloudflare", "FakhriPOS", "0xPOS", "TechPulse", "Caduceus",
  "Astra Honda Motor", "Istidata", "Joss Way-ar", "Gawin", "Vania UI",
  "WhatsApp", "Helix", "NixOS", "Debian", "IHSG", "Vania", "ABIANE.md",
  "MEMORY.md", "USER.md", "agentic-core", "0xNode", "9router", "Qorvum",
  "Kontribo", "pgvector", "Spring Boot", "Next.js", "Bun", "Ollama", "Base"
];

// Alias mapping agar term variasi (pos-app, 9router, dll) langsung nge-link ke entitas kanonikal
const ALIASES: Record<string, string> = {
  "pos-app": "0xPOS",
  "fakhripos": "0xPOS",
  "kasira": "0xPOS",
  "news.fakhrads.dev": "TechPulse",
  "deploy.fakhrads.dev": "Dokploy",
  "9router.fakhrads.dev": "9router",
  "memory.fakhrads.dev": "Vania UI",
  "caduceus.fakhrads.dev": "Caduceus",
  "0x-alpha": "9router",
  "my_ai": "9router",
  "db_vania": "pgvector",
  "vania_ltm": "pgvector",
};

const ALL_PATTERNS = [
  ...ENTITIES,
  ...Object.keys(ALIASES)
].sort((a, b) => b.length - a.length);

const ENTITY_RE = new RegExp(
  ALL_PATTERNS.map((e) => e.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|"),
  "gi"
);

type Row = {
  id: number; content: string; kind: string; scope: string; audience: string;
  created_at: string; updated_at: string; fitness?: number;
};

/**
 * GET /api/graph
 * Query params: all=1 (ikutkan tier archive — default off)
 */
export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (auth.error) return auth.error;

  const includeArchive = req.nextUrl.searchParams.get("all") === "1";

  const kindsFakhri = includeArchive
    ? "('seed','active','evicted','archive','resampled','reasoning','quarantine')"
    : "('seed','active','evicted','resampled','reasoning','quarantine')";

  const data = await query(
    `SELECT l.id, l.content, l.kind, l.scope, l.audience, l.created_at, l.updated_at,
            COALESCE(f.fitness, 0) as fitness
     FROM vania_ltm l
     LEFT JOIN vania_ltm_fitness f ON l.id = f.ltm_id
     WHERE (l.scope='fakhri' AND l.kind IN ${kindsFakhri})
        OR (l.scope='abiane' AND l.kind IN ('seed','active','resampled'))
     ORDER BY l.scope, l.kind, l.id`
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
      fitness: row.fitness,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    });

    const seen = new Set<string>();
    let m: RegExpExecArray | null;
    ENTITY_RE.lastIndex = 0;
    while ((m = ENTITY_RE.exec(row.content))) {
      const matchText = m[0].toLowerCase();
      let canon = ENTITIES.find((e) => e.toLowerCase() === matchText);
      if (!canon) {
        // Cek via alias
        const aliasKey = Object.keys(ALIASES).find((k) => k.toLowerCase() === matchText);
        if (aliasKey) canon = ALIASES[aliasKey];
      }
      if (!canon || seen.has(canon)) continue;
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

  for (const n of nodes) {
    if (n.type === "entity") n.entries = entryLinksByEntity.get(n.id) ?? [];
  }

  return NextResponse.json({
    nodes, links,
    stats: { entries: rows.length, entities: entityIds.size, edges: links.length },
  });
}
