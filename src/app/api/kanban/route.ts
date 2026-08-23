import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-guard";
import { query } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (auth.error) return auth.error;

  try {
    const res = await query(
      `SELECT id, board_slug, title, body, assignee, status, priority, created_by,
              created_at, started_at, completed_at, workspace_kind, branch_name,
              consecutive_failures, last_failure_error, worker_pid, model_override
       FROM vania_kanban_tasks
       ORDER BY priority DESC, created_at DESC`
    );

    const tasks = res.rows.map((t: any) => ({
      ...t,
      created_at: Number(t.created_at),
      started_at: t.started_at ? Number(t.started_at) : null,
      completed_at: t.completed_at ? Number(t.completed_at) : null,
    }));

    const summary = {
      total: tasks.length,
      backlog: tasks.filter((t: any) => t.status === "backlog" || t.status === "todo").length,
      in_progress: tasks.filter((t: any) => t.status === "in_progress" || t.status === "running").length,
      review: tasks.filter((t: any) => t.status === "review" || t.status === "blocked").length,
      done: tasks.filter((t: any) => t.status === "done" || t.status === "completed").length,
    };

    return NextResponse.json({
      ok: true,
      summary,
      tasks,
    });
  } catch (err: any) {
    console.error("Error fetching kanban:", err);
    return NextResponse.json(
      { ok: false, error: err.message || "Failed to fetch kanban data" },
      { status: 500 }
    );
  }
}
