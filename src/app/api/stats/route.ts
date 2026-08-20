import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireAuth } from "@/lib/api-guard";

export const dynamic = "force-dynamic";

/**
 * GET /api/stats
 * Dashboard stats dari vania_ltm
 */
export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (auth.error) return auth.error;

  try {
    const [total, byKind, byProvenance, recentOps] = await Promise.all([
      query("SELECT count(*) as total FROM vania_ltm"),
      query(`
        SELECT kind, count(*) as count,
               count(*) FILTER (WHERE embedding IS NOT NULL) as has_emb
        FROM vania_ltm GROUP BY kind ORDER BY count DESC
      `),
      query(`
        SELECT provenance, count(*) as count
        FROM vania_ltm GROUP BY provenance ORDER BY count DESC
      `),
      query(`
        SELECT action, status, count(*) as count
        FROM vania_ltm_ops
        WHERE ts > now() - interval '7 days'
        GROUP BY action, status
        ORDER BY count DESC
      `),
    ]);

    const kindMap: Record<string, number> = {};
    const embMap: Record<string, number> = {};
    for (const r of byKind.rows) {
      kindMap[r.kind] = Number(r.count);
      embMap[r.kind] = Number(r.has_emb);
    }

    return NextResponse.json({
      total: Number(total.rows[0].total),
      byKind: kindMap,
      embeddingByKind: embMap,
      byProvenance: byProvenance.rows.map((r: any) => ({
        provenance: r.provenance,
        count: Number(r.count),
      })),
      recentOps: recentOps.rows.map((r: any) => ({
        action: r.action,
        status: r.status,
        count: Number(r.count),
      })),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
