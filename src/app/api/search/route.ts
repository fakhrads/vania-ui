import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireAuth } from "@/lib/api-guard";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if (auth.error) return auth.error;

  const { query: q, limit: rawLimit } = await req.json();
  if (!q?.trim()) {
    return NextResponse.json({ error: "query required" }, { status: 400 });
  }

  const limit = Math.min(20, Math.max(1, rawLimit || 10));

  try {
    const [inboxRes, obsRes, ltmRes] = await Promise.all([
      query(
        `SELECT id, left(turn_text, 200) as preview, turn_at as created_at
         FROM vania_inbox_legacy
         WHERE turn_text ILIKE $1
         ORDER BY created_at DESC LIMIT $2`,
        [`%${q}%`, limit]
      ),
      query(
        `SELECT id, left(claim, 200) as preview, kind, confidence, created_at
         FROM vania_obs_active
         WHERE claim ILIKE $1
         ORDER BY created_at DESC LIMIT $2`,
        [`%${q}%`, limit]
      ),
      query(
        `SELECT id, left(content, 200) as preview, provenance, kind, created_at
         FROM vania_ltm
         WHERE content ILIKE $1
         ORDER BY created_at DESC LIMIT $2`,
        [`%${q}%`, limit]
      ),
    ]);

    return NextResponse.json({
      query: q,
      results: {
        inbox: inboxRes.rows,
        observations: obsRes.rows,
        ltm: ltmRes.rows,
        total: inboxRes.rows.length + obsRes.rows.length + ltmRes.rows.length,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
