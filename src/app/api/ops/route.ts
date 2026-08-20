import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireAuth } from "@/lib/api-guard";

export const dynamic = "force-dynamic";

/**
 * GET /api/ops
 * Audit log — semua operasi yang tercatat di vania_ltm_ops.
 */
export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (auth.error) return auth.error;

  const sp = req.nextUrl.searchParams;
  const page = Math.max(1, parseInt(sp.get("page") || "1"));
  const perPage = Math.min(100, Math.max(1, parseInt(sp.get("per_page") || "30")));
  const offset = (page - 1) * perPage;

  const countRes = await query("SELECT count(*) as total FROM vania_ltm_ops");
  const total = Number(countRes.rows[0].total);

  const data = await query(
    `SELECT id, ts, action, target, status, error_msg, content_hash,
            matched_row_id, rows_added, rows_evicted, scope, session_id
     FROM vania_ltm_ops
     ORDER BY ts DESC
     LIMIT $1 OFFSET $2`,
    [perPage, offset]
  );

  return NextResponse.json({
    items: data.rows,
    pagination: { page, perPage, total, totalPages: Math.ceil(total / perPage) },
  });
}
