import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-guard";
import { query } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if (auth.error) return auth.error;

  const { query: q, limit: rawLimit } = await req.json();
  const limit = Math.min(Math.max(Number(rawLimit) || 20, 1), 100);

  if (!q || typeof q !== "string" || q.trim().length === 0) {
    return NextResponse.json({ ok: false, error: "Query cannot be empty" }, { status: 400 });
  }

  const pattern = `%${q.trim()}%`;

  try {
    const [inboxRes, obsRes, ltmRes, kanbanRes] = await Promise.all([
      query(
        `SELECT id, sender, turn_text as content, created_at, 'inbox' as source
         FROM vania_inbox_legacy
         WHERE turn_text ILIKE $1
         ORDER BY created_at DESC
         LIMIT $2`,
        [pattern, limit]
      ),
      query(
        `SELECT id, claim as content, scope, status, created_at, 'observation' as source
         FROM vania_obs_active
         WHERE claim ILIKE $1
         ORDER BY created_at DESC
         LIMIT $2`,
        [pattern, limit]
      ),
      query(
        `SELECT id, content, kind, scope, audience, created_at, 'ltm' as source
         FROM vania_ltm
         WHERE content ILIKE $1
         ORDER BY created_at DESC
         LIMIT $2`,
        [pattern, limit]
      ),
      query(
        `SELECT id, title as content, board_slug, status, created_at, 'kanban' as source
         FROM vania_kanban_tasks
         WHERE title ILIKE $1 OR body ILIKE $1
         ORDER BY created_at DESC
         LIMIT $2`,
        [pattern, limit]
      ),
    ]);

    const results = [
      ...ltmRes.rows,
      ...kanbanRes.rows,
      ...obsRes.rows,
      ...inboxRes.rows,
    ];

    return NextResponse.json({
      ok: true,
      query: q,
      total: results.length,
      results,
    });
  } catch (err: any) {
    console.error("Search error:", err);
    return NextResponse.json(
      { ok: false, error: err.message || "Search failed" },
      { status: 500 }
    );
  }
}
