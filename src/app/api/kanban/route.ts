import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-guard";
import { getKanbanDb } from "@/lib/sqlite";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (auth.error) return auth.error;

  try {
    const db = getKanbanDb();

    // Ambil list tasks beserta metrics
    const tasks = db
      .prepare(
        `SELECT id, title, body, assignee, status, priority, created_by,
                created_at, started_at, completed_at, workspace_kind, branch_name,
                consecutive_failures, last_failure_error, worker_pid,
                workflow_template_id, current_step_key, model_override,
                last_heartbeat_at
         FROM tasks
         ORDER BY priority DESC, created_at DESC`
      )
      .all();

    // Summary per status
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
