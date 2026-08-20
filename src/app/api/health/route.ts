import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireAuth } from "@/lib/api-guard";

export const dynamic = "force-dynamic";

/**
 * GET /api/health — sinyal kesehatan memori Vania, satu panggilan.
 *
 * Sisi A rekonsiliasi (operasi memory di state.db) TIDAK bisa dihitung di
 * sini: state.db hanya ada di mesin Hermes, sedangkan app ini jalan di
 * container. Watchdog `reconcile.py` yang menghitungnya lalu menuliskan
 * verdict ke `vania_health`; endpoint ini membacanya.
 */
export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (auth.error) return auth.error;

  const [verdict, corpus, opsToday, timeline, recent, lag, coverage] =
    await Promise.all([
      query(
        `SELECT ok, a_count, b_count, writes_7d, reads_7d, alarms, rooms,
                ts, window_start
           FROM vania_health ORDER BY ts DESC LIMIT 1`
      ),
      query(
        `SELECT scope, kind, audience, count(*)::int AS n
           FROM vania_ltm GROUP BY 1,2,3 ORDER BY 1,2,3`
      ),
      query(
        `SELECT status, count(*)::int AS n
           FROM vania_ltm_ops
          WHERE ts >= now() - interval '24 hours'
          GROUP BY 1`
      ),
      // Aktivitas per jam, 24 jam terakhir — dipisah tulis vs baca.
      query(
        `SELECT date_trunc('hour', ts) AS bucket,
                count(*) FILTER (WHERE action = 'recall')::int  AS reads,
                count(*) FILTER (WHERE action <> 'recall')::int AS writes
           FROM vania_ltm_ops
          WHERE ts >= now() - interval '24 hours'
          GROUP BY 1 ORDER BY 1`
      ),
      query(
        `SELECT id, ts, action, target, status, error_msg, source, scope,
                rows_added, rows_evicted
           FROM vania_ltm_ops ORDER BY id DESC LIMIT 12`
      ),
      query(
        `SELECT
           (SELECT extract(epoch FROM (now() - max(ts)))::int
              FROM vania_ltm_ops)  AS since_last_op,
           (SELECT extract(epoch FROM (now() - max(ts)))::int
              FROM vania_health)   AS since_last_check`
      ),
      // Baris tanpa embedding tidak bisa dicari sama sekali.
      query(
        `SELECT count(*)::int AS total,
                count(embedding)::int AS embedded,
                count(*) FILTER (WHERE length(trim(content)) = 0)::int AS empty
           FROM vania_ltm`
      ),
    ]);

  const v = verdict.rows[0] ?? null;
  const errors24 =
    opsToday.rows.find((r) => r.status === "error")?.n ?? 0;
  const skips24 = opsToday.rows.find((r) => r.status === "skip")?.n ?? 0;

  return NextResponse.json({
    checkedAt: new Date().toISOString(),
    verdict: v
      ? {
          ok: v.ok,
          a: v.a_count,
          b: v.b_count,
          writes7d: v.writes_7d,
          reads7d: v.reads_7d,
          alarms: v.alarms ?? [],
          rooms: v.rooms ?? [],
          at: v.ts,
          windowStart: v.window_start,
        }
      : null,
    corpus: corpus.rows,
    ops24: { errors: errors24, skips: skips24 },
    timeline: timeline.rows,
    recent: recent.rows,
    lag: {
      sinceLastOp: lag.rows[0]?.since_last_op ?? null,
      sinceLastCheck: lag.rows[0]?.since_last_check ?? null,
    },
    coverage: coverage.rows[0],
  });
}
