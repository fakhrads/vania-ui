import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireAuth } from "@/lib/api-guard";
import { readFile, appendFile } from "fs/promises";
import { join } from "path";

export const dynamic = "force-dynamic";

/**
 * POST /api/ltm/promote
 * Body: { id: number }
 *
 * Ambil baris dari vania_ltm (kind=seed/archive/evicted),
 * append content-nya ke ~/.hermes/MEMORY.md,
 * log operasi ke vania_ltm_ops.
 *
 * CATATAN: Ini append ke file MEMORY.md, bukan edit DB.
 * Plugin sync akan pick up perubahan di next hook cycle.
 * Baris asli di vania_ltm TIDAK dihapus — tetap ada.
 */
export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if (auth.error) return auth.error;

  const { id } = await req.json();
  if (!id) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }

  // Fetch row
  const row = await query(
    "SELECT id, kind, content, content_hash FROM vania_ltm WHERE id = $1",
    [id]
  );
  if (row.rows.length === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const existing = row.rows[0];

  if (existing.kind === "active") {
    return NextResponse.json(
      { error: "Baris active sudah di MEMORY.md" },
      { status: 400 }
    );
  }

  if (!["seed", "archive", "evicted"].includes(existing.kind)) {
    return NextResponse.json(
      { error: `kind '${existing.kind}' tidak bisa di-promote` },
      { status: 400 }
    );
  }

  const content = existing.content.trim();
  if (!content) {
    return NextResponse.json({ error: "Content kosong" }, { status: 400 });
  }

  // Append ke MEMORY.md
  const memoryPath = join(
    process.env.HOME || "/home/fakhrads",
    ".hermes",
    "MEMORY.md"
  );

  try {
    // Cek apakah content sudah ada di MEMORY.md
    const existingMemory = await readFile(memoryPath, "utf-8");
    if (existingMemory.includes(content)) {
      return NextResponse.json(
        { error: "Content sudah ada di MEMORY.md" },
        { status: 409 }
      );
    }

    // Append dengan separator
    const entry = `\n\n<!-- promoted from vania_ltm#${existing.id} (kind=${existing.kind}) -->\n${content}\n`;
    await appendFile(memoryPath, entry, "utf-8");

    // Log ke vania_ltm_ops
    await query(
      `INSERT INTO vania_ltm_ops (action, target, status, content_hash, matched_row_id, scope, rows_added, rows_evicted)
       VALUES ('promote', 'web', 'ok', $1, $2, 'fakhri', 1, 0)`,
      [existing.content_hash, existing.id]
    );

    return NextResponse.json({
      ok: true,
      message: `Content dipromosikan ke MEMORY.md`,
      rowId: existing.id,
    });
  } catch (err: any) {
    // Log error
    await query(
      `INSERT INTO vania_ltm_ops (action, target, status, error_msg, content_hash, matched_row_id, scope, rows_added, rows_evicted)
       VALUES ('promote', 'web', 'error', $1, $2, $3, 'fakhri', 0, 0)`,
      [err.message, existing.content_hash, existing.id]
    );

    return NextResponse.json(
      { error: `Gagal promosikan: ${err.message}` },
      { status: 500 }
    );
  }
}
