import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireAuth } from "@/lib/api-guard";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (auth.error) return auth.error;

  const sp = req.nextUrl.searchParams;
  const page = Math.max(1, parseInt(sp.get("page") || "1"));
  const perPage = Math.min(100, Math.max(1, parseInt(sp.get("per_page") || "25")));
  const status = sp.get("status") || null;
  const search = sp.get("q") || null;
  const offset = (page - 1) * perPage;

  try {
    let where = "1=1";
    const params: any[] = [];
    let idx = 1;

    if (status === "confirmed") {
      where += ` AND confirmed_at IS NOT NULL`;
    } else if (status === "contradicted") {
      where += ` AND contradicted_count > 0`;
    } else if (status === "pending") {
      where += ` AND confirmed_at IS NULL AND contradicted_count = 0`;
    }

    if (search) {
      where += ` AND claim ILIKE $${idx}`;
      params.push(`%${search}%`);
      idx++;
    }

    const countRes = await query(`SELECT count(*) as total FROM vania_obs_active WHERE ${where}`, params);
    const total = Number(countRes.rows[0].total);

    const data = await query(
      `SELECT id, claim, evidence, source, confidence,
              confirmed_at, contradicted_count, created_at
       FROM vania_obs_active
       WHERE ${where}
       ORDER BY created_at DESC
       LIMIT $${idx++} OFFSET $${idx++}`,
      [...params, perPage, offset]
    );

    return NextResponse.json({
      items: data.rows,
      pagination: { page, perPage, total, totalPages: Math.ceil(total / perPage) },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
