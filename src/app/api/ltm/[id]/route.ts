import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireAuth } from "@/lib/api-guard";

export const dynamic = "force-dynamic";

/**
 * PATCH /api/ltm/[id]
 * Edit content. HANYA untuk kind IN (seed, archive, evicted).
 * kind=active = READ-ONLY, akan ditolak.
 *
 * CATATAN: Edit di sini TIDAK mengubah MEMORY.md. Plugin sync
 * akan nandain baris ini "evicted" lalu masukin lagi versi aslinya.
 * Jadi edit lewat web ini hanya sementara sampai sync berikutnya.
 * Gunakan "promote" untuk benar-benar mengubah MEMORY.md.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(req);
  if (auth.error) return auth.error;

  const { id } = await params;
  const body = await req.json();
  const { content: newContent } = body;

  if (!newContent || typeof newContent !== "string" || !newContent.trim()) {
    return NextResponse.json({ error: "content required" }, { status: 400 });
  }

  // Cek kind
  const row = await query(
    "SELECT id, kind, content FROM vania_ltm WHERE id = $1",
    [id]
  );
  if (row.rows.length === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const existing = row.rows[0];
  if (existing.kind === "active") {
    return NextResponse.json(
      { error: "Baris active adalah READ-ONLY. Edit lewat MEMORY.md, bukan web." },
      { status: 403 }
    );
  }

  if (!["seed", "archive", "evicted"].includes(existing.kind)) {
    return NextResponse.json(
      { error: `kind '${existing.kind}' tidak bisa diedit` },
      { status: 403 }
    );
  }

  // Generate content_hash baru
  const { createHash } = await import("crypto");
  const newHash = createHash("sha256").update(newContent.trim()).digest("hex");

  // Update
  await query(
    `UPDATE vania_ltm SET content = $1, content_hash = $2, updated_at = now() WHERE id = $3`,
    [newContent.trim(), newHash, id]
  );

  // Log ke vania_ltm_ops
  await query(
    `INSERT INTO vania_ltm_ops (action, target, status, content_hash, matched_row_id, scope, rows_added, rows_evicted)
     VALUES ('edit', 'web', 'ok', $1, $2, 'fakhri', 0, 0)`,
    [newHash, id]
  );

  return NextResponse.json({ ok: true, id: Number(id) });
}

/**
 * DELETE /api/ltm/[id]
 * Hanya untuk kind IN (seed, archive, evicted).
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAuth(req);
  if (auth.error) return auth.error;

  const { id } = await params;

  const row = await query(
    "SELECT id, kind FROM vania_ltm WHERE id = $1",
    [id]
  );
  if (row.rows.length === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const existing = row.rows[0];
  if (existing.kind === "active") {
    return NextResponse.json(
      { error: "Baris active adalah READ-ONLY." },
      { status: 403 }
    );
  }

  await query("DELETE FROM vania_ltm WHERE id = $1", [id]);

  // Log
  await query(
    `INSERT INTO vania_ltm_ops (action, target, status, matched_row_id, scope, rows_added, rows_evicted)
     VALUES ('delete', 'web', 'ok', $1, 'fakhri', 0, 1)`,
    [id]
  );

  return NextResponse.json({ ok: true, deleted: 1 });
}
