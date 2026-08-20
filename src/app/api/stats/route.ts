import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireAuth } from "@/lib/api-guard";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (auth.error) return auth.error;

  try {
    const [ltmTotal, ltmByKind, inboxTotal, obsTotal] = await Promise.all([
      query("SELECT count(*) as total FROM vania_ltm"),
      query(`
        SELECT kind, count(*) as count,
               count(*) FILTER (WHERE embedding IS NOT NULL) as has_emb
        FROM vania_ltm GROUP BY kind ORDER BY count DESC
      `),
      query("SELECT count(*) as total FROM vania_inbox_legacy"),
      query("SELECT count(*) as total FROM vania_obs_active"),
    ]);

    const kindMap: Record<string, number> = {};
    const embMap: Record<string, number> = {};
    for (const r of ltmByKind.rows) {
      kindMap[r.kind] = Number(r.count);
      embMap[r.kind] = Number(r.has_emb);
    }

    return NextResponse.json({
      ltm: {
        total: Number(ltmTotal.rows[0].total),
        byKind: kindMap,
        embeddingByKind: embMap,
      },
      inbox: { total: Number(inboxTotal.rows[0].total) },
      observations: { total: Number(obsTotal.rows[0].total) },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
