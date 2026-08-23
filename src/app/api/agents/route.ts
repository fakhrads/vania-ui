import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-guard";
import { query, queryOne } from "@/lib/db";

export const dynamic = "force-dynamic";

// Simple regex redactor to avoid leaking raw secret keys / credentials in transcripts
function redactSecrets(text: string): string {
  if (!text) return text;
  return text
    .replace(/(sk-[a-zA-Z0-9_-]{20,})/g, "[REDACTED_API_KEY]")
    .replace(/(Bearer\s+[a-zA-Z0-9_\-\.]{20,})/gi, "Bearer [REDACTED_TOKEN]")
    .replace(/(password|passwd|secret)\s*[:=]\s*["']?([^"'\s]+)["']?/gi, '$1: "[REDACTED]"');
}

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
          const rawLogs = JSON.parse(delegation.transcript_json);
          logs = rawLogs.map((log: any) => {
            if (typeof log === "string") return { raw: redactSecrets(log) };
            if (log.raw) return { ...log, raw: redactSecrets(log.raw) };
            if (log.content) return { ...log, content: redactSecrets(log.content) };
            return log;
          });
        } catch {
          logs = [{ raw: redactSecrets(delegation.transcript_json) }];
        }
      }

      return NextResponse.json({
        ok: true,
        delegation: {
          ...delegation,
          task_json: delegation.task_json ? redactSecrets(delegation.task_json) : null,
          result_json: delegation.result_json ? redactSecrets(delegation.result_json) : null,
        },
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

    const delegations = res.rows.map((d: any) => ({
      ...d,
      task_json: d.task_json ? redactSecrets(d.task_json) : null,
      result_json: d.result_json ? redactSecrets(d.result_json) : null,
    }));

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
