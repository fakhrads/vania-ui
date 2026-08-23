import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-guard";
import { getStateDb } from "@/lib/sqlite";
import fs from "fs";
import path from "path";
import os from "os";

export const dynamic = "force-dynamic";

const HERMES_ROOT = process.env.HERMES_HOME || path.join(os.homedir(), ".hermes");
const TRANSCRIPTS_DIR = path.join(HERMES_ROOT, "logs", "transcripts");

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (auth.error) return auth.error;

  const { searchParams } = new URL(req.url);
  const delegationId = searchParams.get("id");

  try {
    const db = getStateDb();

    // Jika ada request detail log transcript satu subagent
    if (delegationId) {
      const delegation: any = db
        .prepare(`SELECT * FROM async_delegations WHERE delegation_id = ?`)
        .get(delegationId);

      if (!delegation) {
        return NextResponse.json({ ok: false, error: "Subagent not found" }, { status: 404 });
      }

      // Cek apakah ada file transcript jsonl
      let transcriptLogs: any[] = [];
      const transcriptFile = path.join(TRANSCRIPTS_DIR, `${delegationId}.jsonl`);
      if (fs.existsSync(transcriptFile)) {
        const content = fs.readFileSync(transcriptFile, "utf-8");
        transcriptLogs = content
          .split("\n")
          .filter((line) => line.trim().length > 0)
          .map((line) => {
            try {
              return JSON.parse(line);
            } catch {
              return { raw: line };
            }
          });
      }

      return NextResponse.json({
        ok: true,
        delegation,
        logs: transcriptLogs,
      });
    }

    // Ambil semua daftar async delegations (subagents)
    const delegations = db
      .prepare(
        `SELECT delegation_id, origin_session, parent_session_id, state,
                dispatched_at, completed_at, updated_at, delivery_state,
                owner_pid, task_json, result_json
         FROM async_delegations
         ORDER BY dispatched_at DESC
         LIMIT 100`
      )
      .all();

    // Summary per state
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
