import { NextRequest, NextResponse } from "next/server";
import { verifyToken, extractToken, type TokenPayload } from "@/lib/auth";

/**
 * Wrap API handler dengan JWT auth check.
 * Return: { user, error? }
 * Kalau error, langsung return NextResponse 401.
 */
export async function requireAuth(
  req: NextRequest
): Promise<{ user: TokenPayload; error?: never } | { user?: never; error: NextResponse }> {
  const token = extractToken(req);
  if (!token) {
    return { error: NextResponse.json({ error: "Missing token" }, { status: 401 }) };
  }

  const user = await verifyToken(token);
  if (!user) {
    return { error: NextResponse.json({ error: "Invalid token" }, { status: 401 }) };
  }

  return { user };
}
