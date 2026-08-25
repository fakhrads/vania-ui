import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireAuth } from "@/lib/api-guard";

export const dynamic = "force-dynamic";

/**
 * GET /api/ltm
 * Query params: page, per_page, kind, q (ILIKE search), scope, sort (created_at | fitness)
 */
export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (auth.error) return auth.error;

  const sp = req.nextUrl.searchParams;
  const page = Math.max(1, parseInt(sp.get("page") || "1"));
  const perPage = Math.min(100, Math.max(1, parseInt(sp.get("per_page") || "25")));
  const kind = sp.get("kind") || null;
  const scope = sp.get("scope") || null;
  const search = sp.get("q") || null;
  const sortBy = sp.get("sort") === "fitness" ? "fitness" : "created_at";
  const offset = (page - 1) * perPage;

  let where = "1=1";
  const params: any[] = [];
  let idx = 1;

  if (kind) {
    where += ` AND l.kind = $${idx++}`;
    params.push(kind);
  }
  if (scope) {
    where += ` AND l.scope = $${idx++}`;
    params.push(scope);
  }
  if (search) {
    where += ` AND l.content ILIKE $${idx}`;
    params.push(`%${search}%`);
    idx++;
  }

  const countRes = await query(`SELECT count(*) as total FROM vania_ltm l WHERE ${where}`, params);
  const total = Number(countRes.rows[0].total);

  const orderBy = sortBy === "fitness" 
    ? "COALESCE(f.fitness, 0) DESC, l.created_at DESC" 
    : "l.created_at DESC";

  const data = await query(
    `SELECT l.id, l.content, l.content_hash, l.scope, l.store, l.kind, l.provenance,
            l.audience, l.session_id, l.write_origin, l.created_at, l.updated_at,
            l.embedding IS NOT NULL as has_embedding,
            COALESCE(f.fitness, 0) as fitness,
            COALESCE(f.retrieval_count, 0) as retrieval_count,
            COALESCE(f.success_count, 0) as success_count,
            COALESCE(f.contradiction_count, 0) as contradiction_count,
            COALESCE(f.human_reward, 0) as human_reward,
            f.last_used_at,
            f.resampled_at
     FROM vania_ltm l
     LEFT JOIN vania_ltm_fitness f ON l.id = f.ltm_id
     WHERE ${where}
     ORDER BY ${orderBy}
     LIMIT $${idx++} OFFSET $${idx++}`,
    [...params, perPage, offset]
  );

  return NextResponse.json({
    items: data.rows,
    pagination: { page, perPage, total, totalPages: Math.ceil(total / perPage) },
  });
}
