import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireAuth } from "@/lib/api-guard";

export const dynamic = "force-dynamic";

/**
 * GET /api/ltm
 * Query params: page, per_page, kind, q (ILIKE search), scope
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
  const offset = (page - 1) * perPage;

  let where = "1=1";
  const params: any[] = [];
  let idx = 1;

  if (kind) {
    where += ` AND kind = $${idx++}`;
    params.push(kind);
  }
  if (scope) {
    where += ` AND scope = $${idx++}`;
    params.push(scope);
  }
  if (search) {
    where += ` AND content ILIKE $${idx}`;
    params.push(`%${search}%`);
    idx++;
  }

  const countRes = await query(`SELECT count(*) as total FROM vania_ltm WHERE ${where}`, params);
  const total = Number(countRes.rows[0].total);

  const data = await query(
    `SELECT id, content, content_hash, scope, store, kind, provenance,
            session_id, write_origin, created_at, updated_at,
            embedding IS NOT NULL as has_embedding
     FROM vania_ltm
     WHERE ${where}
     ORDER BY created_at DESC
     LIMIT $${idx++} OFFSET $${idx++}`,
    [...params, perPage, offset]
  );

  return NextResponse.json({
    items: data.rows,
    pagination: { page, perPage, total, totalPages: Math.ceil(total / perPage) },
  });
}
