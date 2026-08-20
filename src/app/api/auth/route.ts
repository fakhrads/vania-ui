import { NextRequest, NextResponse } from "next/server";
import { signToken, verifyToken, extractToken } from "@/lib/auth";

/**
 * POST /api/auth/login
 * Body: { username, password }
 * Returns: { token }
 *
 * Credential: fakhri / vn-memory-2026
 * (single user, ganti sesuai env kalau mau)
 */
export async function POST(req: NextRequest) {
  const { username, password } = await req.json();

  const validUser = process.env.AUTH_USERNAME || "fakhri";
  const validPass = process.env.AUTH_PASSWORD || "vn-memory-2026";

  if (username !== validUser || password !== validPass) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  const token = await signToken({ sub: username, role: "admin" });
  return NextResponse.json({ token });
}
