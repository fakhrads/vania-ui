import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireAuth } from "@/lib/api-guard";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(req);
  if (auth.error) return auth.error;

  const { id } = await params;

  try {
    const sessionRes = await query(
      `SELECT * FROM hermes_state_sessions WHERE id = $1`,
      [id]
    );

    if (sessionRes.rows.length === 0) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    const session = sessionRes.rows[0];

    const messagesRes = await query(
      `SELECT id, role, content, tool_call_id, tool_calls, tool_name,
              effect_disposition, timestamp, token_count, finish_reason,
              reasoning, api_content, display_kind, display_metadata
       FROM hermes_state_messages
       WHERE session_id = $1
       ORDER BY timestamp ASC, id ASC`,
      [id]
    );

    const modelUsageRes = await query(
      `SELECT model, billing_provider, billing_base_url, task,
              api_call_count, input_tokens, output_tokens,
              estimated_cost_usd, actual_cost_usd
       FROM hermes_state_session_model_usage
       WHERE session_id = $1`,
      [id]
    );

    return NextResponse.json({
      session,
      messages: messagesRes.rows,
      model_usage: modelUsageRes.rows,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
