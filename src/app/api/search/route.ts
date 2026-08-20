import { NextRequest, NextResponse } from "next/server";
import { query } from "@/lib/db";
import { requireAuth } from "@/lib/api-guard";

export const dynamic = "force-dynamic";

/**
 * POST /api/search
 * Body: { query: string, limit?: number }
 *
 * Returns results dari DUA pencarian berdampingan:
 * 1. pgvector cosine similarity (embedding)
 * 2. ILIKE text search
 */
export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if (auth.error) return auth.error;

  const { query: q, limit: rawLimit } = await req.json();
  if (!q?.trim()) {
    return NextResponse.json({ error: "query required" }, { status: 400 });
  }

  const limit = Math.min(20, Math.max(1, rawLimit || 10));

  // 1. ILIKE search — cepat, selalu jalan
  const ilikeRes = await query(
    `SELECT id, left(content, 200) as preview, kind, provenance, scope, created_at
     FROM vania_ltm
     WHERE content ILIKE $1
     ORDER BY created_at DESC
     LIMIT $2`,
    [`%${q}%`, limit]
  );

  // 2. pgvector search — butuh embedding query
  let vectorResults: any[] = [];
  let vectorError: string | null = null;

  try {
    const embedRes = await fetch("http://localhost:11434/api/embeddings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: "nomic-embed-text", prompt: q }),
      signal: AbortSignal.timeout(10000),
    });

    if (embedRes.ok) {
      const { embedding } = await embedRes.json();
      const vec = `[${embedding.join(",")}]`;

      const vecRes = await query(
        `SELECT id, left(content, 200) as preview, kind, provenance, scope, created_at,
                1 - (embedding <=> $1::vector) as similarity
         FROM vania_ltm
         WHERE embedding IS NOT NULL
         ORDER BY embedding <=> $1::vector
         LIMIT $2`,
        [vec, limit]
      );
      vectorResults = vecRes.rows;
    } else {
      vectorError = `Embedding service returned ${embedRes.status}`;
    }
  } catch (err: any) {
    vectorError = err.message || "Embedding service unavailable";
  }

  return NextResponse.json({
    query: q,
    ilike: ilikeRes.rows,
    vector: vectorResults,
    vectorError,
  });
}
