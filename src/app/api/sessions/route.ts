import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireAuth } from "@/lib/api-guard";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (auth.error) return auth.error;

  const sp = req.nextUrl.searchParams;
  const q = sp.get("q") || "";
  const source = sp.get("source") || "";
  const page = Math.max(1, parseInt(sp.get("page") || "1", 10));
  const limit = Math.min(100, Math.max(1, parseInt(sp.get("per_page") || "25", 10)));
  const offset = (page - 1) * limit;

  try {
    let where = "1=1";
    const params: any[] = [];
    let idx = 1;

    if (q) {
      where += ` AND (title ILIKE $${idx} OR id ILIKE $${idx} OR model ILIKE $${idx} OR display_name ILIKE $${idx})`;
      params.push(`%${q}%`);
      idx++;
    }

    if (source) {
      where += ` AND source = $${idx}`;
      params.push(source);
      idx++;
    }

    const countRes = await query(`SELECT count(*) as total FROM hermes_state_sessions WHERE ${where}`, params);
    const total = Number(countRes.rows[0].total);

    const dataRes = await query(
      `SELECT 
        id, source, user_id, display_name, model, 
        message_count, tool_call_count, 
        input_tokens, output_tokens, estimated_cost_usd,
        title, started_at, ended_at, last_activity_at,
        archived, pinned, synced_at
       FROM hermes_state_sessions
       WHERE ${where}
       ORDER BY started_at DESC
       LIMIT $${idx} OFFSET $${idx + 1}`,
      [...params, limit, offset]
    );

    const sourcesRes = await query(
      `SELECT source, count(*)::text as count FROM hermes_state_sessions GROUP BY source ORDER BY count DESC`
    );

    return NextResponse.json({
      total,
      page,
      per_page: limit,
      sessions: dataRes.rows,
      sources: sourcesRes.rows,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
