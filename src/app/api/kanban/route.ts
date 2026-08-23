import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-guard";
import { query } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (auth.error) return auth.error;

  const { searchParams } = new URL(req.url);
  const selectedBoard = searchParams.get("board");

  try {
    // Ambil list semua board yang tersedia
    const boardsRes = await query(
      `SELECT DISTINCT board_slug FROM vania_kanban_tasks ORDER BY board_slug ASC`
    );
    const boards = boardsRes.rows.map((r: any) => r.board_slug);

    let sql = `SELECT id, board_slug, title, body, assignee, status, priority, created_by,
                      created_at, started_at, completed_at, workspace_kind, branch_name,
                      consecutive_failures, last_failure_error, worker_pid, model_override
               FROM vania_kanban_tasks`;
    const params: any[] = [];

    if (selectedBoard && selectedBoard !== "all") {
      sql += ` WHERE board_slug = $1`;
      params.push(selectedBoard);
    }

    sql += ` ORDER BY priority DESC, created_at DESC`;

    const res = await query(sql, params);

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
      boards,
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
