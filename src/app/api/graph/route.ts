import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireAuth } from "@/lib/api-guard";

export const dynamic = "force-dynamic";

/**
 * Entitas TIDAK lagi dicocokkan di sini. Dulu route ini memegang kamus
 * sendiri (kembaran ENTITIES di vania-obsidian-export.py) dan mencocokkan
 * potongan kata tanpa batas kata — 'bun' ikut cocok di 'bundle', 'base' di
 * 'database': 67 tautan palsu terukur 23 Sep 2026.
 *
 * Sekarang plugin vania-memory yang memegang kamus (entities.json, satu
 * sumber) dan mengisi tabel `vania_ltm_entities` per kata utuh — saat memori
 * ditulis dan tiap sweep curator malam. Route ini cuma membaca tabelnya.
 */

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
  // Satu query untuk semua pasangan entri–entitas yang terlihat di graph.
  const ents = await query(
    `SELECT e.ltm_id, e.entitas FROM vania_ltm_entities e
      WHERE e.ltm_id = ANY($1::bigint[]) ORDER BY e.ltm_id, e.entitas`,
    [data.rows.map((r: Row) => r.id)]
  );
  const entByRow = new Map<number, string[]>();
  for (const r of ents.rows as { ltm_id: string | number; entitas: string }[]) {
    const id = Number(r.ltm_id);
    if (!entByRow.has(id)) entByRow.set(id, []);
    entByRow.get(id)!.push(r.entitas);
  }
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

    for (const canon of entByRow.get(Number(row.id)) ?? []) {
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

  // Tautan antar-entri dari plugin (tahap 02 recall berantai): `mirip`
  // (disimpan dua arah → digambar sekali per pasangan) dan `menggantikan`
  // (fakta baru → fakta lama). `satu_sesi` sengaja tidak digambar: sesi
  // berisi belasan memori jadi klik-rapat yang menutupi struktur lain.
  const visible = new Set(rows.map((r) => Number(r.id)));
  const antar = await query(
    `SELECT src_id, dst_id, jenis, bobot FROM vania_ltm_links
      WHERE jenis IN ('mirip', 'menggantikan')
        AND src_id = ANY($1::bigint[]) AND dst_id = ANY($1::bigint[])`,
    [[...visible]]
  );
  for (const k of antar.rows as { src_id: string; dst_id: string; jenis: string; bobot: number }[]) {
    const a = Number(k.src_id), b = Number(k.dst_id);
    if (k.jenis === "mirip" && a > b) continue;
    links.push({ source: `entry-${a}`, target: `entry-${b}`, kind: k.jenis, weight: k.bobot });
  }

  for (const n of nodes) {
    if (n.type === "entity") n.entries = entryLinksByEntity.get(n.id) ?? [];
  }

  return NextResponse.json({
    nodes, links,
    stats: { entries: rows.length, entities: entityIds.size, edges: links.length },
  });
}
