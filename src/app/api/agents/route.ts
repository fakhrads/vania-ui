import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-guard";
import { query, queryOne } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (auth.error) return auth.error;

  const { searchParams } = new URL(req.url);
  const delegationId = searchParams.get("id");

  try {
    if (delegationId) {
      const delegation: any = await queryOne(
        `SELECT * FROM vania_subagents WHERE delegation_id = $1`,
        [delegationId]
      );

      if (!delegation) {
        return NextResponse.json({ ok: false, error: "Subagent not found" }, { status: 404 });
      }

      let logs: any[] = [];
      if (delegation.transcript_json) {
        try {
          logs = JSON.parse(delegation.transcript_json);
        } catch {
          logs = [{ raw: delegation.transcript_json }];
        }
      }

      return NextResponse.json({
        ok: true,
        delegation,
        logs,
      });
    }

    const res = await query(
      `SELECT delegation_id, origin_session, state, dispatched_at, completed_at,
              delivery_state, owner_pid, task_json, result_json
       FROM vania_subagents
       ORDER BY dispatched_at DESC
       LIMIT 100`
    );

    const delegations = res.rows;

    const summary = {
      total: delegations.length,
      running: delegations.filter((d: any) => d.state === "running" || d.state === "in_progress").length,
      completed: delegations.filter((d: any) => d.state === "completed" || d.state === "done").length,
      failed: delegations.filter((d: any) => d.state === "failed" || d.state === "error").length,
    };

    return NextResponse.json({
      ok: true,
      summary,
      delegations,
    });
  } catch (err: any) {
    console.error("Error fetching subagents:", err);
    return NextResponse.json(
      { ok: false, error: err.message || "Failed to fetch subagents data" },
      { status: 500 }
    );
  }
}
